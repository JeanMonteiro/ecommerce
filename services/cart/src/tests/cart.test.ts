import server from '../../app';
import request from 'supertest';
import { Decimal } from '@prisma/client/runtime/library';
import { prismaMock } from '../libs/__mocks__/prisma.singleton';
import { CatalogError, getProduct } from '../libs/catalogClient';

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

jest.mock('../libs/catalogClient', () => ({
  __esModule: true,
  CatalogError: jest.requireActual('../libs/catalogClient').CatalogError,
  CatalogUnavailableError: jest.requireActual('../libs/catalogClient').CatalogUnavailableError,
  getProduct: jest.fn(),
}));

const getProductMock = getProduct as jest.MockedFunction<typeof getProduct>;

describe('Cart Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    getProductMock.mockReset();
    const jwt = require('jsonwebtoken').default;
    jwt.verify.mockImplementation(() => ({ userId: 1, username: 'testuser' }));
  });

  const catalogProduct = {
    id: 10,
    name: 'Test Product',
    price: 19.99,
    description: 'A test product',
  };

  const testCartItem = {
    id: 1,
    userId: 1,
    productId: 10,
    quantity: 2,
    unitPrice: new Decimal('19.99'),
    name: 'Test Product',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  it('should return 401 when listing cart without a token', async () => {
    await request(server)
      .get('/api/cart')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Authentication required');
      });
  });

  it('should list cart items with totals', async () => {
    prismaMock.cartItem.findMany.mockResolvedValue([testCartItem]);

    const response = await request(server)
      .get('/api/cart')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        {
          id: 1,
          productId: 10,
          name: 'Test Product',
          quantity: 2,
          unitPrice: 19.99,
          lineTotal: 39.98,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      subtotal: 39.98,
      itemCount: 2,
    });
  });

  it('should add an item to the cart', async () => {
    getProductMock.mockResolvedValue(catalogProduct);
    prismaMock.cartItem.upsert.mockResolvedValue(testCartItem);

    const response = await request(server)
      .post('/api/cart')
      .set('Authorization', 'Bearer testtoken')
      .send({ productId: 10, quantity: 2 })
      .expect(200);

    expect(getProductMock).toHaveBeenCalledWith(10);
    expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith({
      where: {
        userId_productId: { userId: 1, productId: 10 },
      },
      create: {
        userId: 1,
        productId: 10,
        quantity: 2,
        unitPrice: expect.any(Decimal),
        name: 'Test Product',
      },
      update: {
        quantity: { increment: 2 },
        unitPrice: expect.any(Decimal),
        name: 'Test Product',
      },
    });

    expect(response.body).toMatchObject({
      productId: 10,
      name: 'Test Product',
      quantity: 2,
      unitPrice: 19.99,
      lineTotal: 39.98,
    });
  });

  it('should return 404 when catalog product is missing on add', async () => {
    getProductMock.mockRejectedValue(new CatalogError(404, 'Product not found'));

    await request(server)
      .post('/api/cart')
      .set('Authorization', 'Bearer testtoken')
      .send({ productId: 999, quantity: 1 })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Product not found');
      });

    expect(prismaMock.cartItem.upsert).not.toHaveBeenCalled();
  });

  it('should update cart item quantity via PATCH', async () => {
    const updatedItem = {
      ...testCartItem,
      quantity: 5,
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    prismaMock.cartItem.findUnique.mockResolvedValue(testCartItem);
    getProductMock.mockResolvedValue(catalogProduct);
    prismaMock.cartItem.update.mockResolvedValue(updatedItem);

    const response = await request(server)
      .patch('/api/cart/10')
      .set('Authorization', 'Bearer testtoken')
      .send({ quantity: 5 })
      .expect(200);

    expect(getProductMock).toHaveBeenCalledWith(10);
    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: {
        userId_productId: { userId: 1, productId: 10 },
      },
      data: {
        quantity: 5,
        unitPrice: expect.any(Decimal),
        name: 'Test Product',
      },
    });

    expect(response.body).toMatchObject({
      productId: 10,
      quantity: 5,
      unitPrice: 19.99,
      lineTotal: 99.95,
    });
  });

  it('should return 400 when PATCH quantity is invalid', async () => {
    await request(server)
      .patch('/api/cart/10')
      .set('Authorization', 'Bearer testtoken')
      .send({ quantity: 0 })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('quantity must be a positive integer');
      });

    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('should return 400 when PATCH product id param is invalid', async () => {
    await request(server)
      .patch('/api/cart/not-a-number')
      .set('Authorization', 'Bearer testtoken')
      .send({ quantity: 2 })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid product id');
      });
  });

  it('should return 404 when PATCH targets a missing cart item', async () => {
    prismaMock.cartItem.findUnique.mockResolvedValue(null);

    await request(server)
      .patch('/api/cart/10')
      .set('Authorization', 'Bearer testtoken')
      .send({ quantity: 3 })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Cart item not found');
      });

    expect(getProductMock).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('should return 404 when catalog product is missing on PATCH', async () => {
    prismaMock.cartItem.findUnique.mockResolvedValue(testCartItem);
    getProductMock.mockRejectedValue(new CatalogError(404, 'Product not found'));

    await request(server)
      .patch('/api/cart/10')
      .set('Authorization', 'Bearer testtoken')
      .send({ quantity: 3 })
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Product not found');
      });

    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
  });

  it('should remove an item from the cart', async () => {
    prismaMock.cartItem.findUnique.mockResolvedValue(testCartItem);
    prismaMock.cartItem.delete.mockResolvedValue(testCartItem);

    await request(server)
      .delete('/api/cart/10')
      .set('Authorization', 'Bearer testtoken')
      .expect(204);

    expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
      where: {
        userId_productId: { userId: 1, productId: 10 },
      },
    });
  });

  it('should clear the entire cart', async () => {
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 2 });

    await request(server)
      .delete('/api/cart')
      .set('Authorization', 'Bearer testtoken')
      .expect(204);

    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
  });
});
