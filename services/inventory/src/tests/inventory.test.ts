import server from '../../app';
import request from 'supertest';
import { prismaMock } from '../libs/__mocks__/prisma.singleton';

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

const subscribeMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../libs/messaging', () => ({
  __esModule: true,
  initMessaging: jest.fn().mockResolvedValue(undefined),
  closeMessaging: jest.fn().mockResolvedValue(undefined),
  getMessagingClient: jest.fn(),
  resetMessagingClientForTests: jest.fn(),
}));

jest.mock('@ecommerce/messaging', () => ({
  createMessagingClient: jest.fn().mockResolvedValue({
    subscribe: subscribeMock,
    publish: jest.fn(),
    close: jest.fn(),
  }),
}));

describe('Inventory Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  const testStock = {
    id: 1,
    productId: 42,
    quantity: 10,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  it('should list all stock entries', async () => {
    prismaMock.stock.findMany.mockResolvedValue([testStock]);

    const response = await request(server).get('/api/inventory').expect(200);

    expect(response.body).toEqual([{ productId: 42, quantity: 10 }]);
  });

  it('should return stock for a product', async () => {
    prismaMock.stock.findUnique.mockResolvedValue(testStock);

    const response = await request(server)
      .get('/api/inventory/42')
      .expect(200);

    expect(response.body).toEqual({ productId: 42, quantity: 10 });
  });

  it('should return 404 when stock is missing', async () => {
    prismaMock.stock.findUnique.mockResolvedValue(null);

    await request(server)
      .get('/api/inventory/999')
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toBe('Stock not found');
      });
  });

  it('should return 400 for invalid product id', async () => {
    await request(server)
      .get('/api/inventory/abc')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Invalid product id');
      });
  });

  it('should update stock quantity', async () => {
    prismaMock.stock.findUnique.mockResolvedValue(testStock);
    prismaMock.stock.update.mockResolvedValue({ ...testStock, quantity: 25 });

    const response = await request(server)
      .patch('/api/inventory/42')
      .send({ quantity: 25 })
      .expect(200);

    expect(response.body).toEqual({ productId: 42, quantity: 25 });
  });

  it('should return 400 when quantity is negative', async () => {
    await request(server)
      .patch('/api/inventory/42')
      .send({ quantity: -1 })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe(
          'Quantity must be greater than or equal to 0'
        );
      });
  });
});
