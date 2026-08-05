import { CartItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CartItemInput =
  | { ok: true; productId: number; quantity: number }
  | { ok: false; message: string };

export type CartQuantityInput =
  | { ok: true; quantity: number }
  | { ok: false; message: string };

function parsePositiveInt(value: unknown, fieldName: string): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;

  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function validateCartItemInput(body: unknown): CartItemInput {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { productId, quantity } = body as Record<string, unknown>;
  const parsedProductId = parsePositiveInt(productId, 'productId');

  if (parsedProductId === null) {
    return { ok: false, message: 'productId must be a positive integer' };
  }

  const parsedQuantity = parsePositiveInt(quantity, 'quantity');
  if (parsedQuantity === null) {
    return { ok: false, message: 'quantity must be a positive integer' };
  }

  return {
    ok: true,
    productId: parsedProductId,
    quantity: parsedQuantity,
  };
}

export function validateCartQuantityInput(body: unknown): CartQuantityInput {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { quantity } = body as Record<string, unknown>;
  const parsedQuantity = parsePositiveInt(quantity, 'quantity');

  if (parsedQuantity === null) {
    return { ok: false, message: 'quantity must be a positive integer' };
  }

  return {
    ok: true,
    quantity: parsedQuantity,
  };
}

export function parseProductIdParam(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export function serializeCartItem(item: CartItem) {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(new Decimal(item.unitPrice).mul(item.quantity)),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toDecimal(value: number): Decimal {
  return new Decimal(value.toFixed(2));
}

export function calculateCartTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => {
    return sum + Number(new Decimal(item.unitPrice).mul(item.quantity));
  }, 0);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    itemCount,
  };
}
