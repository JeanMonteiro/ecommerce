import {
  sendMockEmail,
  type MockEmail,
} from '../libs/mockEmailStore';

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

export type SendMockEmailFn = typeof sendMockEmail;

export async function handleOrderConfirmed(
  payload: unknown,
  deps: {
    sendEmail?: SendMockEmailFn;
  } = {},
): Promise<MockEmail> {
  if (!isOrderConfirmedPayload(payload)) {
    throw new Error('Invalid order.confirmed payload');
  }

  const sendEmail = deps.sendEmail ?? sendMockEmail;

  return sendEmail({
    type: 'order-confirmed',
    to: { userId: payload.userId },
    subject: `Order #${payload.orderId} confirmed`,
    body: `Your order #${payload.orderId} has been confirmed. Thank you for shopping with us!`,
    payload,
  });
}
