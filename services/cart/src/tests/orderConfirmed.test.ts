import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import {
  handleOrderConfirmed,
  type OrderConfirmedPayload,
} from '../handlers/orderConfirmed';

describe('handleOrderConfirmed', () => {
  const db = mockDeep<Pick<PrismaClient, 'cartItem'>>();

  const payload: OrderConfirmedPayload = {
    orderId: 42,
    userId: 7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all cart items for the user', async () => {
    db.cartItem.deleteMany.mockResolvedValue({ count: 3 });

    await handleOrderConfirmed(payload, { db });

    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
  });

  it('is idempotent when the cart is already empty', async () => {
    db.cartItem.deleteMany.mockResolvedValue({ count: 0 });

    await handleOrderConfirmed(payload, { db });

    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
  });

  it('throws when payload is invalid', async () => {
    await expect(
      handleOrderConfirmed({ orderId: 0, userId: 1 }, { db }),
    ).rejects.toThrow('Invalid order.confirmed payload');

    expect(db.cartItem.deleteMany).not.toHaveBeenCalled();
  });
});
