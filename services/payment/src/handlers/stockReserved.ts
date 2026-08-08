import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

export interface StockReservedPayload {
  orderId: number;
  reservationId: number;
}

export type PublishFn = (routingKey: string, payload: unknown) => Promise<void>;

export type PaymentForceResult = 'success' | 'failure' | 'random';

export const PAYMENT_STATUS = {
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

const MOCK_FAILURE_REASON = 'Payment declined (mock)';

type PaymentDb = Pick<PrismaClient, 'payment'>;

export function isStockReservedPayload(payload: unknown): payload is StockReservedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reservationId } = payload as StockReservedPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    Number.isInteger(reservationId) &&
    reservationId > 0
  );
}

export function resolveMockOutcome(
  forceResult: PaymentForceResult = 'success',
  randomFn: () => number = Math.random,
): PaymentStatus {
  if (forceResult === 'success') {
    return PAYMENT_STATUS.SUCCEEDED;
  }

  if (forceResult === 'failure') {
    return PAYMENT_STATUS.FAILED;
  }

  return randomFn() < 0.5 ? PAYMENT_STATUS.SUCCEEDED : PAYMENT_STATUS.FAILED;
}

async function publishPaymentOutcome(
  payment: { id: number; orderId: number; status: string; reason: string | null },
  publish: PublishFn,
): Promise<void> {
  if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
    await publish('payment.succeeded', {
      orderId: payment.orderId,
      paymentId: payment.id,
    });
    return;
  }

  await publish('payment.failed', {
    orderId: payment.orderId,
    reason: payment.reason ?? MOCK_FAILURE_REASON,
  });
}

export async function handleStockReserved(
  payload: unknown,
  deps: {
    db?: PaymentDb;
    publish?: PublishFn;
    forceResult?: PaymentForceResult;
    randomFn?: () => number;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;
  const publish = deps.publish;

  if (!publish) {
    throw new Error('handleStockReserved requires a publish function');
  }

  if (!isStockReservedPayload(payload)) {
    throw new Error('Invalid stock.reserved payload');
  }

  const { orderId } = payload;

  const existing = await db.payment.findUnique({
    where: { orderId },
  });

  if (existing) {
    await publishPaymentOutcome(existing, publish);
    return;
  }

  const status = resolveMockOutcome(deps.forceResult, deps.randomFn);
  const reason = status === PAYMENT_STATUS.FAILED ? MOCK_FAILURE_REASON : null;

  try {
    const payment = await db.payment.create({
      data: {
        orderId,
        status,
        reason,
      },
    });

    await publishPaymentOutcome(payment, publish);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const payment = await db.payment.findUnique({
        where: { orderId },
      });

      if (payment) {
        await publishPaymentOutcome(payment, publish);
        return;
      }
    }

    throw error;
  }
}
