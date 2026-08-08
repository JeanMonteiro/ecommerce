import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';
import { RESERVATION_STATUS } from './orderCreated';

export interface OrderConfirmedPayload {
  orderId: number;
  userId: number;
}

export function isOrderConfirmedPayload(
  payload: unknown,
): payload is OrderConfirmedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId } = payload as OrderConfirmedPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    Number.isInteger(userId) &&
    userId > 0
  );
}

export async function handleOrderConfirmed(
  payload: unknown,
  deps: {
    db?: Pick<PrismaClient, 'reservation'>;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;

  if (!isOrderConfirmedPayload(payload)) {
    throw new Error('Invalid order.confirmed payload');
  }

  const reservation = await db.reservation.findUnique({
    where: { orderId: payload.orderId },
  });

  if (!reservation) {
    console.warn(
      `order.confirmed: no reservation for orderId ${payload.orderId}`,
    );
    return;
  }

  if (reservation.status === RESERVATION_STATUS.COMMITTED) {
    return;
  }

  if (reservation.status === RESERVATION_STATUS.RELEASED) {
    console.warn(
      `order.confirmed: reservation already RELEASED for orderId ${payload.orderId}`,
    );
    return;
  }

  if (reservation.status === RESERVATION_STATUS.RESERVED) {
    await db.reservation.update({
      where: { orderId: payload.orderId },
      data: { status: RESERVATION_STATUS.COMMITTED },
    });
  }
}
