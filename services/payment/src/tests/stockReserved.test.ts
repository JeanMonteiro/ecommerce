import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  handleStockReserved,
  PAYMENT_STATUS,
  resolveMockOutcome,
  type PublishFn,
} from '../handlers/stockReserved';

describe('resolveMockOutcome', () => {
  it('returns SUCCEEDED when forceResult is success', () => {
    expect(resolveMockOutcome('success')).toBe(PAYMENT_STATUS.SUCCEEDED);
  });

  it('returns FAILED when forceResult is failure', () => {
    expect(resolveMockOutcome('failure')).toBe(PAYMENT_STATUS.FAILED);
  });

  it('uses randomFn when forceResult is random', () => {
    expect(resolveMockOutcome('random', () => 0.1)).toBe(PAYMENT_STATUS.SUCCEEDED);
    expect(resolveMockOutcome('random', () => 0.9)).toBe(PAYMENT_STATUS.FAILED);
  });
});

describe('handleStockReserved', () => {
  const db = mockDeep<Pick<PrismaClient, 'payment'>>();
  const publish = jest.fn() as jest.MockedFunction<PublishFn>;

  const stockReservedPayload = {
    orderId: 42,
    reservationId: 99,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a payment and publishes payment.succeeded on success', async () => {
    db.payment.findUnique.mockResolvedValue(null);
    db.payment.create.mockResolvedValue({
      id: 7,
      orderId: 42,
      status: PAYMENT_STATUS.SUCCEEDED,
      reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleStockReserved(stockReservedPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'payment'>>,
      publish,
      forceResult: 'success',
    });

    expect(db.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 42,
        status: PAYMENT_STATUS.SUCCEEDED,
        reason: null,
      },
    });
    expect(publish).toHaveBeenCalledWith('payment.succeeded', {
      orderId: 42,
      paymentId: 7,
    });
    expect(publish).not.toHaveBeenCalledWith('payment.failed', expect.anything());
  });

  it('creates a payment and publishes payment.failed on failure', async () => {
    db.payment.findUnique.mockResolvedValue(null);
    db.payment.create.mockResolvedValue({
      id: 8,
      orderId: 42,
      status: PAYMENT_STATUS.FAILED,
      reason: 'Payment declined (mock)',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleStockReserved(stockReservedPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'payment'>>,
      publish,
      forceResult: 'failure',
    });

    expect(db.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 42,
        status: PAYMENT_STATUS.FAILED,
        reason: 'Payment declined (mock)',
      },
    });
    expect(publish).toHaveBeenCalledWith('payment.failed', {
      orderId: 42,
      reason: 'Payment declined (mock)',
    });
    expect(publish).not.toHaveBeenCalledWith('payment.succeeded', expect.anything());
  });

  it('is idempotent and re-publishes payment.succeeded for an existing payment', async () => {
    db.payment.findUnique.mockResolvedValue({
      id: 55,
      orderId: 42,
      status: PAYMENT_STATUS.SUCCEEDED,
      reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleStockReserved(stockReservedPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'payment'>>,
      publish,
      forceResult: 'failure',
    });

    expect(db.payment.create).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('payment.succeeded', {
      orderId: 42,
      paymentId: 55,
    });
  });

  it('is idempotent and re-publishes payment.failed for an existing failed payment', async () => {
    db.payment.findUnique.mockResolvedValue({
      id: 56,
      orderId: 42,
      status: PAYMENT_STATUS.FAILED,
      reason: 'Payment declined (mock)',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleStockReserved(stockReservedPayload, {
      db: db as DeepMockProxy<Pick<PrismaClient, 'payment'>>,
      publish,
      forceResult: 'success',
    });

    expect(db.payment.create).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith('payment.failed', {
      orderId: 42,
      reason: 'Payment declined (mock)',
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleStockReserved({ orderId: 0, reservationId: 1 }, { db, publish }),
    ).rejects.toThrow('Invalid stock.reserved payload');

    expect(publish).not.toHaveBeenCalled();
  });
});
