import {
  handleOrderCancelled,
  type OrderCancelledPayload,
  type SendMockEmailFn,
} from '../handlers/orderCancelled';

describe('handleOrderCancelled', () => {
  const sendEmail = jest.fn() as jest.MockedFunction<SendMockEmailFn>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends an order cancelled mock email with userId', async () => {
    const payload: OrderCancelledPayload = {
      orderId: 42,
      userId: 7,
      reason: 'Payment declined (mock)',
    };

    sendEmail.mockReturnValue({
      id: 'mock-id',
      type: 'order-cancelled',
      to: { userId: 7 },
      subject: 'Order #42 cancelled',
      body: 'Your order #42 was cancelled. Reason: Payment declined (mock)',
      sentAt: new Date().toISOString(),
      payload,
    });

    await handleOrderCancelled(payload, { sendEmail });

    expect(sendEmail).toHaveBeenCalledWith({
      type: 'order-cancelled',
      to: { userId: 7 },
      subject: 'Order #42 cancelled',
      body: 'Your order #42 was cancelled. Reason: Payment declined (mock)',
      payload,
    });
  });

  it('sends an order cancelled mock email without userId', async () => {
    const payload: OrderCancelledPayload = {
      orderId: 42,
      reason: 'Insufficient stock',
    };

    sendEmail.mockReturnValue({
      id: 'mock-id',
      type: 'order-cancelled',
      to: { userId: 0 },
      subject: 'Order #42 cancelled',
      body: 'Your order #42 was cancelled. Reason: Insufficient stock',
      sentAt: new Date().toISOString(),
      payload,
    });

    await handleOrderCancelled(payload, { sendEmail });

    expect(sendEmail).toHaveBeenCalledWith({
      type: 'order-cancelled',
      to: { userId: 0 },
      subject: 'Order #42 cancelled',
      body: 'Your order #42 was cancelled. Reason: Insufficient stock',
      payload,
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderCancelled({ orderId: 42, reason: '' }, { sendEmail }),
    ).rejects.toThrow('Invalid order.cancelled payload');

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
