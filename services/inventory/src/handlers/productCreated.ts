import { PrismaClient } from '@prisma/client';
import prisma from '../libs/prisma';

export interface ProductCreatedPayload {
  productId: number;
  name?: string;
  price?: number;
}

export function isProductCreatedPayload(
  payload: unknown
): payload is ProductCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { productId } = payload as ProductCreatedPayload;
  return Number.isInteger(productId) && productId > 0;
}

export async function handleProductCreated(
  payload: unknown,
  db: Pick<PrismaClient, 'stock'> = prisma
): Promise<void> {
  if (!isProductCreatedPayload(payload)) {
    throw new Error('Invalid product.created payload');
  }

  await db.stock.upsert({
    where: { productId: payload.productId },
    create: { productId: payload.productId, quantity: 0 },
    update: {},
  });
}
