import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

export interface StockReservedPayload {
  orderId: number;
  reservationId: number;
}

export interface StockRejectedPayload {
  orderId: number;
  reason: string;
}

function isStockReservedPayload(payload: unknown): payload is StockReservedPayload {
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

function isStockRejectedPayload(payload: unknown): payload is StockRejectedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reason } = payload as StockRejectedPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    typeof reason === 'string' &&
    reason.length > 0
  );
}

export async function handleStockReserved(
  payload: unknown,
  db: Pick<PrismaClient, 'order'> = prisma,
): Promise<void> {
  if (!isStockReservedPayload(payload)) {
    throw new Error('Invalid stock.reserved payload');
  }

  const result = await db.order.updateMany({
    where: {
      id: payload.orderId,
      status: 'PENDING',
    },
    data: {
      status: 'AWAITING_PAYMENT',
    },
  });

  if (result.count === 0) {
    const existing = await db.order.findUnique({
      where: { id: payload.orderId },
    });

    if (!existing) {
      console.warn(`stock.reserved: unknown orderId ${payload.orderId}`);
    }
  }
}

export async function handleStockRejected(
  payload: unknown,
  db: Pick<PrismaClient, 'order'> = prisma,
): Promise<void> {
  if (!isStockRejectedPayload(payload)) {
    throw new Error('Invalid stock.rejected payload');
  }

  const result = await db.order.updateMany({
    where: {
      id: payload.orderId,
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
    },
  });

  if (result.count === 0) {
    const existing = await db.order.findUnique({
      where: { id: payload.orderId },
    });

    if (!existing) {
      console.warn(`stock.rejected: unknown orderId ${payload.orderId}`);
    }
  }
}

export async function handleStockEvent(
  payload: unknown,
  db: Pick<PrismaClient, 'order'> = prisma,
): Promise<void> {
  if (isStockReservedPayload(payload)) {
    await handleStockReserved(payload, db);
    return;
  }

  if (isStockRejectedPayload(payload)) {
    await handleStockRejected(payload, db);
    return;
  }

  throw new Error('Unknown stock event payload');
}
