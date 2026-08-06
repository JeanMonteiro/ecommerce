import { Order, OrderItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type OrderWithItems = Order & { items: OrderItem[] };

export function parseOrderIdParam(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export function serializeOrderItem(item: OrderItem) {
  return {
    id: item.id,
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(new Decimal(item.unitPrice).mul(item.quantity)),
  };
}

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    total: Number(order.total),
    items: order.items.map(serializeOrderItem),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toDecimal(value: number): Decimal {
  return new Decimal(value.toFixed(2));
}
