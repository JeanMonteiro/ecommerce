import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

export interface OrderCreatedItem {
  productId: number;
  quantity: number;
}

export interface OrderCreatedPayload {
  orderId: number;
  userId: number;
  items: OrderCreatedItem[];
}

export type PublishFn = (routingKey: string, payload: unknown) => Promise<void>;

export const RESERVATION_STATUS = {
  RESERVED: 'RESERVED',
  RELEASED: 'RELEASED',
  COMMITTED: 'COMMITTED',
} as const;

type OrderCreatedDb = Pick<PrismaClient, 'reservation' | 'stock' | '$transaction'>;

class InsufficientStockError extends Error {
  constructor(
    readonly productId: number,
    message = `Insufficient stock for product ${productId}`,
  ) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

function isOrderCreatedItem(item: unknown): item is OrderCreatedItem {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const { productId, quantity } = item as OrderCreatedItem;
  return (
    Number.isInteger(productId) &&
    productId > 0 &&
    Number.isInteger(quantity) &&
    quantity > 0
  );
}

export function isOrderCreatedPayload(payload: unknown): payload is OrderCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId, items } = payload as OrderCreatedPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    Number.isInteger(userId) &&
    userId > 0 &&
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(isOrderCreatedItem)
  );
}

async function reserveStock(
  orderId: number,
  items: OrderCreatedItem[],
  db: OrderCreatedDb,
): Promise<{ id: number }> {
  return db.$transaction(async (tx) => {
    for (const item of items) {
      const updated = await tx.stock.updateMany({
        where: {
          productId: item.productId,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      if (updated.count === 0) {
        throw new InsufficientStockError(item.productId);
      }
    }

    return tx.reservation.create({
      data: {
        orderId,
        status: RESERVATION_STATUS.RESERVED,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    });
  });
}

export async function handleOrderCreated(
  payload: unknown,
  deps: {
    db?: OrderCreatedDb;
    publish?: PublishFn;
  } = {},
): Promise<void> {
  const db = deps.db ?? prisma;
  const publish = deps.publish;

  if (!publish) {
    throw new Error('handleOrderCreated requires a publish function');
  }

  if (!isOrderCreatedPayload(payload)) {
    throw new Error('Invalid order.created payload');
  }

  const { orderId, items } = payload;

  const existing = await db.reservation.findUnique({
    where: { orderId },
  });

  if (existing) {
    await publish('stock.reserved', {
      orderId,
      reservationId: existing.id,
    });
    return;
  }

  const stocks = await db.stock.findMany({
    where: { productId: { in: items.map((item) => item.productId) } },
  });
  const stockByProductId = new Map(stocks.map((stock) => [stock.productId, stock]));

  for (const item of items) {
    const stock = stockByProductId.get(item.productId);

    if (!stock) {
      await publish('stock.rejected', {
        orderId,
        reason: `No stock record for product ${item.productId}`,
      });
      return;
    }

    if (stock.quantity < item.quantity) {
      await publish('stock.rejected', {
        orderId,
        reason: `Insufficient stock for product ${item.productId}`,
      });
      return;
    }
  }

  try {
    const reservation = await reserveStock(orderId, items, db);

    await publish('stock.reserved', {
      orderId,
      reservationId: reservation.id,
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      await publish('stock.rejected', {
        orderId,
        reason: error.message,
      });
      return;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const reservation = await db.reservation.findUnique({
        where: { orderId },
      });

      if (reservation) {
        await publish('stock.reserved', {
          orderId,
          reservationId: reservation.id,
        });
        return;
      }
    }

    throw error;
  }
}
