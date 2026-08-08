import {
  isOrderCancelledPayload,
  isOrderConfirmedPayload,
  isOrderCreatedPayload,
  isPaymentFailedPayload,
  isPaymentSucceededPayload,
  isProductCreatedPayload,
  isProductUpdatedPayload,
  isStockRejectedPayload,
  isStockReservedPayload,
  isUserRegisteredPayload,
  orderCancelledFixture,
  orderConfirmedFixture,
  orderCreatedFixture,
  parseOrderConfirmedPayload,
  parseUserRegisteredPayload,
  paymentFailedFixture,
  paymentSucceededFixture,
  productCreatedFixture,
  productUpdatedFixture,
  stockRejectedFixture,
  stockReservedFixture,
  userRegisteredFixture,
} from './index';

describe('event contract fixtures', () => {
  it.each([
    ['user.registered', userRegisteredFixture, isUserRegisteredPayload],
    ['product.created', productCreatedFixture, isProductCreatedPayload],
    ['product.updated', productUpdatedFixture, isProductUpdatedPayload],
    ['order.created', orderCreatedFixture, isOrderCreatedPayload],
    ['stock.reserved', stockReservedFixture, isStockReservedPayload],
    ['stock.rejected', stockRejectedFixture, isStockRejectedPayload],
    ['payment.succeeded', paymentSucceededFixture, isPaymentSucceededPayload],
    ['payment.failed', paymentFailedFixture, isPaymentFailedPayload],
    ['order.confirmed', orderConfirmedFixture, isOrderConfirmedPayload],
    ['order.cancelled', orderCancelledFixture, isOrderCancelledPayload],
  ])('%s fixture passes its validator', (_event, fixture, validator) => {
    expect(validator(fixture)).toBe(true);
  });
});

describe('parse helpers', () => {
  it('returns parsed data for valid payloads', () => {
    const result = parseUserRegisteredPayload(userRegisteredFixture);
    expect(result).toEqual({
      success: true,
      data: userRegisteredFixture,
    });
  });

  it('returns an error for invalid payloads', () => {
    const result = parseOrderConfirmedPayload({ orderId: 0, userId: 1 });
    expect(result).toEqual({
      success: false,
      error: 'Invalid order.confirmed payload',
    });
  });
});

describe('invalid payloads are rejected', () => {
  it('rejects user.registered without username', () => {
    expect(isUserRegisteredPayload({ userId: 1, username: '   ' })).toBe(false);
  });

  it('rejects product.created with negative price', () => {
    expect(
      isProductCreatedPayload({ productId: 1, name: 'Widget', price: -1 }),
    ).toBe(false);
  });

  it('rejects order.created with empty items', () => {
    expect(isOrderCreatedPayload({ orderId: 1, userId: 1, items: [] })).toBe(false);
  });

  it('rejects stock.reserved with missing reservationId', () => {
    expect(isStockReservedPayload({ orderId: 1 })).toBe(false);
  });

  it('rejects payment.failed with empty reason', () => {
    expect(isPaymentFailedPayload({ orderId: 1, reason: '' })).toBe(false);
  });

  it('rejects order.cancelled with invalid userId', () => {
    expect(
      isOrderCancelledPayload({ orderId: 1, userId: 0, reason: 'failed' }),
    ).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(isProductUpdatedPayload(null)).toBe(false);
    expect(isStockRejectedPayload('bad')).toBe(false);
  });
});
