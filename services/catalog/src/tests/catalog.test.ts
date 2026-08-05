import server from '../../app';
import request from 'supertest';
import { Decimal } from '@prisma/client/runtime/library';
import { prismaMock } from '../libs/__mocks__/prisma.singleton';

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

const publishMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../libs/messaging', () => ({
  __esModule: true,
  initMessaging: jest.fn().mockResolvedValue(undefined),
  closeMessaging: jest.fn().mockResolvedValue(undefined),
  getMessagingClient: jest.fn(),
  publishEvent: (...args: unknown[]) => publishMock(...args),
  resetMessagingClientForTests: jest.fn(),
}));

describe('Catalog Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    publishMock.mockClear();
  });

  const testProduct = {
    id: 1,
    name: 'Test Product',
    price: new Decimal('19.99'),
    description: 'A test product',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  it('should list products', async () => {
    prismaMock.product.findMany.mockResolvedValue([testProduct]);

    const response = await request(server).get('/api/products').expect(200);

    expect(response.body).toEqual([
      {
        id: 1,
        name: 'Test Product',
        price: 19.99,
        description: 'A test product',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('should return 404 when product is missing', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await request(server)
      .get('/api/products/999')
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Product not found');
      });
  });

  it('should create a product and publish product.created', async () => {
    prismaMock.product.create.mockResolvedValue(testProduct);

    const response = await request(server)
      .post('/api/products')
      .send({ name: 'Test Product', price: 19.99, description: 'A test product' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      name: 'Test Product',
      price: 19.99,
      description: 'A test product',
    });

    expect(publishMock).toHaveBeenCalledWith('product.created', {
      productId: 1,
      name: 'Test Product',
      price: 19.99,
    });
  });

  it('should return 400 when name is empty on create', async () => {
    await request(server)
      .post('/api/products')
      .send({ name: '   ', price: 10 })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Name is required');
      });

    expect(publishMock).not.toHaveBeenCalled();
  });

  it('should update a product and publish product.updated when price changes', async () => {
    const updatedProduct = {
      ...testProduct,
      price: new Decimal('24.99'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    prismaMock.product.findUnique.mockResolvedValue(testProduct);
    prismaMock.product.update.mockResolvedValue(updatedProduct);

    const response = await request(server)
      .patch('/api/products/1')
      .send({ price: 24.99 })
      .expect(200);

    expect(response.body.price).toBe(24.99);
    expect(publishMock).toHaveBeenCalledWith('product.updated', {
      productId: 1,
      price: 24.99,
    });
  });
});
