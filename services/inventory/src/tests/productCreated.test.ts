import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { handleProductCreated } from '../handlers/productCreated';

describe('handleProductCreated', () => {
  const db = mockDeep<Pick<PrismaClient, 'stock'>>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates stock with quantity 0 for a new product', async () => {
    db.stock.upsert.mockResolvedValue({
      id: 1,
      productId: 7,
      quantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handleProductCreated(
      { productId: 7, name: 'Widget', price: 9.99 },
      db as DeepMockProxy<Pick<PrismaClient, 'stock'>>
    );

    expect(db.stock.upsert).toHaveBeenCalledWith({
      where: { productId: 7 },
      create: { productId: 7, quantity: 0 },
      update: {},
    });
  });

  it('is idempotent and does not reset quantity on duplicate events', async () => {
    await handleProductCreated({ productId: 7 }, db as DeepMockProxy<Pick<PrismaClient, 'stock'>>);

    expect(db.stock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 7 },
        update: {},
      })
    );
  });

  it('throws when payload is invalid', async () => {
    await expect(handleProductCreated({ productId: 0 }, db)).rejects.toThrow(
      'Invalid product.created payload'
    );

    expect(db.stock.upsert).not.toHaveBeenCalled();
  });
});
