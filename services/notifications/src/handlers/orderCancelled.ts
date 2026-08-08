import {
  sendMockEmail,
  type MockEmail,
} from '../libs/mockEmailStore';

export interface OrderCancelledPayload {
  orderId: number;
  userId?: number;
  reason: string;
}

export function isOrderCancelledPayload(
  payload: unknown,
): payload is OrderCancelledPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const { orderId, userId, reason } = payload as OrderCancelledPayload;
  return (
    Number.isInteger(orderId) &&
    orderId > 0 &&
    (userId === undefined ||
      (Number.isInteger(userId) && userId > 0)) &&
    typeof reason === 'string' &&
    reason.length > 0
  );
}

export type SendMockEmailFn = typeof sendMockEmail;

export async function handleOrderCancelled(
  payload: unknown,
  deps: {
    sendEmail?: SendMockEmailFn;
  } = {},
): Promise<MockEmail> {
  if (!isOrderCancelledPayload(payload)) {
    throw new Error('Invalid order.cancelled payload');
  }

  const sendEmail = deps.sendEmail ?? sendMockEmail;

  return sendEmail({
    type: 'order-cancelled',
    to: { userId: payload.userId ?? 0 },
    subject: `Order #${payload.orderId} cancelled`,
    body: `Your order #${payload.orderId} was cancelled. Reason: ${payload.reason}`,
    payload,
  });
}
