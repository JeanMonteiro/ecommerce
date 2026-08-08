import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

export interface PaymentSucceededPayload {
  orderId: number;
  paymentId: number;
}

export interface PaymentFailedPayload {
  orderId: number;
  reason: string;
}

export type PublishFn = (routingKey: string, payload: unknown) => Promise<void>;

function isPaymentSucceededPayload(payload: unknown): payload is PaymentSucceededPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, paymentId } = payload as PaymentSucceededPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    Number.isInteger(paymentId) &&
    paymentId > 0
  );
}

function isPaymentFailedPayload(payload: unknown): payload is PaymentFailedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reason } = payload as PaymentFailedPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    typeof reason === 'string' &&
    reason.length > 0
  );
}

export async function handlePaymentSucceeded(
  payload: unknown,
  deps: {
    db?: Pick<PrismaClient, 'order'>;
    publish?: PublishFn;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;
  const publish = deps.publish;

  if (!publish) {
    throw new Error('handlePaymentSucceeded requires a publish function');
  }

  if (!isPaymentSucceededPayload(payload)) {
    throw new Error('Invalid payment.succeeded payload');
  }

  const result = await db.order.updateMany({
    where: {
      id: payload.orderId,
      status: 'AWAITING_PAYMENT',
    },
    data: {
      status: 'CONFIRMED',
    },
  });

  if (result.count > 0) {
    const order = await db.order.findUnique({
      where: { id: payload.orderId },
    });

    if (order) {
      await publish('order.confirmed', {
        orderId: order.id,
        userId: order.userId,
      });
    }

    return;
  }

  const existing = await db.order.findUnique({
    where: { id: payload.orderId },
  });

  if (!existing) {
    console.warn(`payment.succeeded: unknown orderId ${payload.orderId}`);
    return;
  }

  if (existing.status === 'CONFIRMED') {
    await publish('order.confirmed', {
      orderId: existing.id,
      userId: existing.userId,
    });
  }
}

export async function handlePaymentFailed(
  payload: unknown,
  deps: {
    db?: Pick<PrismaClient, 'order'>;
    publish?: PublishFn;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;
  const publish = deps.publish;

  if (!publish) {
    throw new Error('handlePaymentFailed requires a publish function');
  }

  if (!isPaymentFailedPayload(payload)) {
    throw new Error('Invalid payment.failed payload');
  }

  const result = await db.order.updateMany({
    where: {
      id: payload.orderId,
      status: 'AWAITING_PAYMENT',
    },
    data: {
      status: 'CANCELLED',
    },
  });

  if (result.count > 0) {
    const order = await db.order.findUnique({
      where: { id: payload.orderId },
    });

    if (order) {
      await publish('order.cancelled', {
        orderId: order.id,
        userId: order.userId,
        reason: payload.reason,
      });
    }

    return;
  }

  const existing = await db.order.findUnique({
    where: { id: payload.orderId },
  });

  if (!existing) {
    console.warn(`payment.failed: unknown orderId ${payload.orderId}`);
    return;
  }

  if (existing.status === 'CANCELLED') {
    await publish('order.cancelled', {
      orderId: existing.id,
      userId: existing.userId,
      reason: payload.reason,
    });
  }
}

export async function handlePaymentEvent(
  payload: unknown,
  deps: {
    db?: Pick<PrismaClient, 'order'>;
    publish?: PublishFn;
  } = {},
): Promise<void> {
  if (isPaymentSucceededPayload(payload)) {
    await handlePaymentSucceeded(payload, deps);
    return;
  }

  if (isPaymentFailedPayload(payload)) {
    await handlePaymentFailed(payload, deps);
    return;
  }

  throw new Error('Unknown payment event payload');
}
