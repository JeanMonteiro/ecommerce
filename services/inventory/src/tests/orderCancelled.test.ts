import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  handleOrderCancelled,
  type OrderCancelledPayload,
} from '../handlers/orderCancelled';
import { RESERVATION_STATUS } from '../handlers/orderCreated';

describe('handleOrderCancelled', () => {
  const db = mockDeep<
    Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>
  >();

  const payload: OrderCancelledPayload = {
    orderId: 42,
    userId: 7,
    reason: 'Payment failed',
  };

  const reservationItems = [
    { id: 1, reservationId: 99, productId: 1, quantity: 2 },
    { id: 2, reservationId: 99, productId: 2, quantity: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('releases a RESERVED reservation and restores stock', async () => {
    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.RESERVED,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: reservationItems,
    } as never);

    const stockUpdate = jest.fn().mockResolvedValue({});
    const reservationUpdate = jest.fn().mockResolvedValue({});

    db.$transaction.mockImplementation(async (callback) =>
      callback({
        stock: { update: stockUpdate },
        reservation: { update: reservationUpdate },
      } as never),
    );

    await handleOrderCancelled(payload, { db });

    expect(db.$transaction).toHaveBeenCalled();
    expect(stockUpdate).toHaveBeenCalledTimes(2);
    expect(stockUpdate).toHaveBeenCalledWith({
      where: { productId: 1 },
      data: { quantity: { increment: 2 } },
    });
    expect(stockUpdate).toHaveBeenCalledWith({
      where: { productId: 2 },
      data: { quantity: { increment: 1 } },
    });
    expect(reservationUpdate).toHaveBeenCalledWith({
      where: { orderId: 42 },
      data: { status: RESERVATION_STATUS.RELEASED },
    });
  });

  it('is idempotent when reservation is already RELEASED', async () => {
    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.RELEASED,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: reservationItems,
    } as never);

    await handleOrderCancelled(payload, { db });

    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('no-ops with a warning when reservation is already COMMITTED', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.COMMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: reservationItems,
    } as never);

    await handleOrderCancelled(payload, { db });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'order.cancelled: reservation already COMMITTED for orderId 42',
    );

    warnSpy.mockRestore();
  });

  it('warns and no-ops when no reservation exists', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    db.reservation.findUnique.mockResolvedValue(null);

    await handleOrderCancelled(payload, { db });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'order.cancelled: no reservation for orderId 42',
    );

    warnSpy.mockRestore();
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderCancelled({ orderId: 42, reason: '' }, { db }),
    ).rejects.toThrow('Invalid order.cancelled payload');
  });
});
