import { parseOrFail, type ParseResult } from './types';

export interface UserRegisteredPayload {
  userId: number;
  username: string;
}

export interface ProductCreatedPayload {
  productId: number;
  name: string;
  price: number;
}

export interface ProductUpdatedPayload {
  productId: number;
  price?: number;
}

export interface OrderCreatedItem {
  productId: number;
  quantity: number;
}

export interface OrderCreatedPayload {
  orderId: number;
  userId: number;
  items: OrderCreatedItem[];
}

export interface StockReservedPayload {
  orderId: number;
  reservationId: number;
}

export interface StockRejectedPayload {
  orderId: number;
  reason: string;
}

export interface PaymentSucceededPayload {
  orderId: number;
  paymentId: number;
}

export interface PaymentFailedPayload {
  orderId: number;
  reason: string;
}

export interface OrderConfirmedPayload {
  orderId: number;
  userId: number;
}

export interface OrderCancelledPayload {
  orderId: number;
  userId?: number;
  reason: string;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isOrderCreatedItem(value: unknown): value is OrderCreatedItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { productId, quantity } = value as OrderCreatedItem;
  return isPositiveInt(productId) && isPositiveInt(quantity);
}

export function isUserRegisteredPayload(
  payload: unknown,
): payload is UserRegisteredPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { userId, username } = payload as UserRegisteredPayload;
  return isPositiveInt(userId) && isNonEmptyString(username.trim());
}

export function isProductCreatedPayload(
  payload: unknown,
): payload is ProductCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { productId, name, price } = payload as ProductCreatedPayload;
  return (
    isPositiveInt(productId) &&
    isNonEmptyString(name.trim()) &&
    isNonNegativeNumber(price)
  );
}

export function isProductUpdatedPayload(
  payload: unknown,
): payload is ProductUpdatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { productId, price } = payload as ProductUpdatedPayload;
  if (!isPositiveInt(productId)) {
    return false;
  }

  if (price === undefined) {
    return true;
  }

  return isNonNegativeNumber(price);
}

export function isOrderCreatedPayload(
  payload: unknown,
): payload is OrderCreatedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId, items } = payload as OrderCreatedPayload;
  return (
    isPositiveInt(orderId) &&
    isPositiveInt(userId) &&
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(isOrderCreatedItem)
  );
}

export function isStockReservedPayload(
  payload: unknown,
): payload is StockReservedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reservationId } = payload as StockReservedPayload;
  return isPositiveInt(orderId) && isPositiveInt(reservationId);
}

export function isStockRejectedPayload(
  payload: unknown,
): payload is StockRejectedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reason } = payload as StockRejectedPayload;
  return isPositiveInt(orderId) && isNonEmptyString(reason);
}

export function isPaymentSucceededPayload(
  payload: unknown,
): payload is PaymentSucceededPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, paymentId } = payload as PaymentSucceededPayload;
  return isPositiveInt(orderId) && isPositiveInt(paymentId);
}

export function isPaymentFailedPayload(
  payload: unknown,
): payload is PaymentFailedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, reason } = payload as PaymentFailedPayload;
  return isPositiveInt(orderId) && isNonEmptyString(reason);
}

export function isOrderConfirmedPayload(
  payload: unknown,
): payload is OrderConfirmedPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId } = payload as OrderConfirmedPayload;
  return isPositiveInt(orderId) && isPositiveInt(userId);
}

export function isOrderCancelledPayload(
  payload: unknown,
): payload is OrderCancelledPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId, reason } = payload as OrderCancelledPayload;
  return (
    isPositiveInt(orderId) &&
    (userId === undefined || isPositiveInt(userId)) &&
    isNonEmptyString(reason)
  );
}

export function parseUserRegisteredPayload(
  payload: unknown,
): ParseResult<UserRegisteredPayload> {
  return parseOrFail(payload, isUserRegisteredPayload, 'Invalid user.registered payload');
}

export function parseProductCreatedPayload(
  payload: unknown,
): ParseResult<ProductCreatedPayload> {
  return parseOrFail(payload, isProductCreatedPayload, 'Invalid product.created payload');
}

export function parseProductUpdatedPayload(
  payload: unknown,
): ParseResult<ProductUpdatedPayload> {
  return parseOrFail(payload, isProductUpdatedPayload, 'Invalid product.updated payload');
}

export function parseOrderCreatedPayload(
  payload: unknown,
): ParseResult<OrderCreatedPayload> {
  return parseOrFail(payload, isOrderCreatedPayload, 'Invalid order.created payload');
}

export function parseStockReservedPayload(
  payload: unknown,
): ParseResult<StockReservedPayload> {
  return parseOrFail(payload, isStockReservedPayload, 'Invalid stock.reserved payload');
}

export function parseStockRejectedPayload(
  payload: unknown,
): ParseResult<StockRejectedPayload> {
  return parseOrFail(payload, isStockRejectedPayload, 'Invalid stock.rejected payload');
}

export function parsePaymentSucceededPayload(
  payload: unknown,
): ParseResult<PaymentSucceededPayload> {
  return parseOrFail(
    payload,
    isPaymentSucceededPayload,
    'Invalid payment.succeeded payload',
  );
}

export function parsePaymentFailedPayload(
  payload: unknown,
): ParseResult<PaymentFailedPayload> {
  return parseOrFail(payload, isPaymentFailedPayload, 'Invalid payment.failed payload');
}

export function parseOrderConfirmedPayload(
  payload: unknown,
): ParseResult<OrderConfirmedPayload> {
  return parseOrFail(payload, isOrderConfirmedPayload, 'Invalid order.confirmed payload');
}

export function parseOrderCancelledPayload(
  payload: unknown,
): ParseResult<OrderCancelledPayload> {
  return parseOrFail(payload, isOrderCancelledPayload, 'Invalid order.cancelled payload');
}
