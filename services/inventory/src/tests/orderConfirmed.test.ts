import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  handleOrderConfirmed,
  type OrderConfirmedPayload,
} from '../handlers/orderConfirmed';
import { RESERVATION_STATUS } from '../handlers/orderCreated';

describe('handleOrderConfirmed', () => {
  const db = mockDeep<Pick<PrismaClient, 'reservation'>>();

  const payload: OrderConfirmedPayload = {
    orderId: 42,
    userId: 7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('commits a RESERVED reservation', async () => {
    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.RESERVED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    db.reservation.update.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.COMMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleOrderConfirmed(payload, { db });

    expect(db.reservation.update).toHaveBeenCalledWith({
      where: { orderId: 42 },
      data: { status: RESERVATION_STATUS.COMMITTED },
    });
  });

  it('is idempotent when reservation is already COMMITTED', async () => {
    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.COMMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleOrderConfirmed(payload, { db });

    expect(db.reservation.update).not.toHaveBeenCalled();
  });

  it('no-ops with a warning when reservation is already RELEASED', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    db.reservation.findUnique.mockResolvedValue({
      id: 99,
      orderId: 42,
      status: RESERVATION_STATUS.RELEASED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleOrderConfirmed(payload, { db });

    expect(db.reservation.update).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'order.confirmed: reservation already RELEASED for orderId 42',
    );

    warnSpy.mockRestore();
  });

  it('warns and no-ops when no reservation exists', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    db.reservation.findUnique.mockResolvedValue(null);

    await handleOrderConfirmed(payload, { db });

    expect(db.reservation.update).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'order.confirmed: no reservation for orderId 42',
    );

    warnSpy.mockRestore();
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderConfirmed({ orderId: 0, userId: 1 }, { db }),
    ).rejects.toThrow('Invalid order.confirmed payload');
  });
});
