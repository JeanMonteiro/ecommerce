import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';
import { RESERVATION_STATUS } from './orderCreated';

export interface OrderCancelledPayload {
  orderId: number;
  userId?: number;
  reason: string;
}

export function isOrderCancelledPayload(
  payload: unknown,
): payload is OrderCancelledPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId, reason } = payload as OrderCancelledPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    (userId === undefined ||
      (Number.isInteger(userId) && userId > 0)) &&
    typeof reason === 'string' &&
    reason.length > 0
  );
}

type OrderCancelledDb = Pick<
  PrismaClient,
  'reservation' | 'stock' | '$transaction'
>;

export async function handleOrderCancelled(
  payload: unknown,
  deps: {
    db?: OrderCancelledDb;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;

  if (!isOrderCancelledPayload(payload)) {
    throw new Error('Invalid order.cancelled payload');
  }

  const reservation = await db.reservation.findUnique({
    where: { orderId: payload.orderId },
    include: { items: true },
  });

  if (!reservation) {
    console.warn(
      `order.cancelled: no reservation for orderId ${payload.orderId}`,
    );
    return;
  }

  if (reservation.status === RESERVATION_STATUS.RELEASED) {
    return;
  }

  if (reservation.status === RESERVATION_STATUS.COMMITTED) {
    console.warn(
      `order.cancelled: reservation already COMMITTED for orderId ${payload.orderId}`,
    );
    return;
  }

  if (reservation.status === RESERVATION_STATUS.RESERVED) {
    await db.$transaction(async (tx) => {
      for (const item of reservation.items) {
        await tx.stock.update({
          where: { productId: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.reservation.update({
        where: { orderId: payload.orderId },
        data: { status: RESERVATION_STATUS.RELEASED },
      });
    });
  }
}
