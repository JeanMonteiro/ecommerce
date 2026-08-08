import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

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
    db?: Pick<PrismaClient, 'cartItem'>;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;

  if (!isOrderConfirmedPayload(payload)) {
    throw new Error('Invalid order.confirmed payload');
  }

  await db.cartItem.deleteMany({
    where: { userId: payload.userId },
  });
}
