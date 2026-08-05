import { Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type ProductInput =
  | { ok: true; name: string; price: number; description?: string }
  | { ok: false; message: string };

export type ProductUpdateInput =
  | {
      ok: true;
      name?: string;
      price?: number;
      description?: string | null;
    }
  | { ok: false; message: string };

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function validateProductInput(body: unknown): ProductInput {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { name, price, description } = body as Record<string, unknown>;

  if (typeof name !== 'string') {
    return { ok: false, message: 'Name must be a string' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, message: 'Name is required' };
  }

  const parsedPrice = parsePrice(price);
  if (parsedPrice === null) {
    return { ok: false, message: 'Price must be a number' };
  }

  if (parsedPrice < 0) {
    return { ok: false, message: 'Price must be greater than or equal to 0' };
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return { ok: false, message: 'Description must be a string' };
  }

  return {
    ok: true,
    name: trimmedName,
    price: parsedPrice,
    description: typeof description === 'string' ? description : undefined,
  };
}

export function validateProductUpdateInput(body: unknown): ProductUpdateInput {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const { name, price, description } = body as Record<string, unknown>;
  const update: ProductUpdateInput & { ok: true } = { ok: true };

  if (name !== undefined) {
    if (typeof name !== 'string') {
      return { ok: false, message: 'Name must be a string' };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, message: 'Name cannot be empty' };
    }

    update.name = trimmedName;
  }

  if (price !== undefined) {
    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      return { ok: false, message: 'Price must be a number' };
    }

    if (parsedPrice < 0) {
      return { ok: false, message: 'Price must be greater than or equal to 0' };
    }

    update.price = parsedPrice;
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      return { ok: false, message: 'Description must be a string or null' };
    }

    update.description = description as string | null;
  }

  if (
    update.name === undefined &&
    update.price === undefined &&
    update.description === undefined
  ) {
    return { ok: false, message: 'At least one field must be provided' };
  }

  return update;
}

export function serializeProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    description: product.description,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toDecimal(value: number): Decimal {
  return new Decimal(value.toFixed(2));
}
