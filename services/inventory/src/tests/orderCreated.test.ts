import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  handleOrderCreated,
  RESERVATION_STATUS,
  type PublishFn,
} from '../handlers/orderCreated';

describe('handleOrderCreated', () => {
  const db = mockDeep<Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>>();
  const publish = jest.fn() as jest.MockedFunction<PublishFn>;

  const orderPayload = {
    orderId: 42,
    userId: 7,
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reserves stock and publishes stock.reserved on success', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    db.stock.findMany.mockResolvedValue([
      { id: 10, productId: 1, quantity: 5, createdAt: new Date(), updatedAt: new Date() },
      { id: 11, productId: 2, quantity: 3, createdAt: new Date(), updatedAt: new Date() },
    ]);
    db.$transaction.mockImplementation(async (callback) =>
      callback({
        stock: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        reservation: {
          create: jest.fn().mockResolvedValue({
            id: 99,
            orderId: 42,
            status: RESERVATION_STATUS.RESERVED,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      } as never),
    );

    await handleOrderCreated(orderPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>>,
      publish,
    });

    expect(db.$transaction).toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('stock.reserved', {
      orderId: 42,
      reservationId: 99,
    });
    expect(publish).not.toHaveBeenCalledWith('stock.rejected', expect.anything());
  });

  it('publishes stock.rejected when stock is insufficient', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    db.stock.findMany.mockResolvedValue([
      { id: 10, productId: 1, quantity: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 11, productId: 2, quantity: 3, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await handleOrderCreated(orderPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>>,
      publish,
    });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('stock.rejected', {
      orderId: 42,
      reason: 'Insufficient stock for product 1',
    });
    expect(publish).not.toHaveBeenCalledWith('stock.reserved', expect.anything());
  });

  it('publishes stock.rejected when a product has no stock record', async () => {
    db.reservation.findUnique.mockResolvedValue(null);
    db.stock.findMany.mockResolvedValue([
      { id: 10, productId: 1, quantity: 5, createdAt: new Date(), updatedAt: new Date() },
    ]);

    await handleOrderCreated(orderPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>>,
      publish,
    });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('stock.rejected', {
      orderId: 42,
      reason: 'No stock record for product 2',
    });
  });

  it('is idempotent and re-publishes stock.reserved for an existing reservation', async () => {
    db.reservation.findUnique.mockResolvedValue({
      id: 55,
      orderId: 42,
      status: RESERVATION_STATUS.RESERVED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleOrderCreated(orderPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>>,
      publish,
    });

    expect(db.stock.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('stock.reserved', {
      orderId: 42,
      reservationId: 55,
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderCreated({ orderId: 0, userId: 1, items: [] }, { db, publish }),
    ).rejects.toThrow('Invalid order.created payload');

    expect(publish).not.toHaveBeenCalled();
  });
});
