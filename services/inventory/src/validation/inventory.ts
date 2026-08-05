import { Stock } from '@prisma/client';

type ValidationResult =
  | { ok: true; quantity: number }
  | { ok: false; message: string };

export function validateQuantityInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { quantity } = body as { quantity?: unknown };

  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
    return { ok: false, message: 'Quantity must be an integer' };
  }

  if (quantity < 0) {
    return { ok: false, message: 'Quantity must be greater than or equal to 0' };
  }

  return { ok: true, quantity };
}

export function parseProductId(rawId: string): number | null {
  const productId = Number(rawId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }

  return productId;
}

export function serializeStock(stock: Stock) {
  return {
    productId: stock.productId,
    quantity: stock.quantity,
  };
}
