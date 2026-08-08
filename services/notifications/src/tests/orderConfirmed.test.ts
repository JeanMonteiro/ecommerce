import {
  handleOrderConfirmed,
  type OrderConfirmedPayload,
  type SendMockEmailFn,
} from '../handlers/orderConfirmed';

describe('handleOrderConfirmed', () => {
  const payload: OrderConfirmedPayload = {
    orderId: 42,
    userId: 7,
  };

  const sendEmail = jest.fn() as jest.MockedFunction<SendMockEmailFn>;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockReturnValue({
      id: 'mock-id',
      type: 'order-confirmed',
      to: { userId: 7 },
      subject: 'Order #42 confirmed',
      body: 'Your order #42 has been confirmed. Thank you for shopping with us!',
      sentAt: new Date().toISOString(),
      payload,
    });
  });

  it('sends an order confirmed mock email', async () => {
    await handleOrderConfirmed(payload, { sendEmail });

    expect(sendEmail).toHaveBeenCalledWith({
      type: 'order-confirmed',
      to: { userId: 7 },
      subject: 'Order #42 confirmed',
      body: 'Your order #42 has been confirmed. Thank you for shopping with us!',
      payload,
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderConfirmed({ orderId: 0, userId: 1 }, { sendEmail }),
    ).rejects.toThrow('Invalid order.confirmed payload');

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
