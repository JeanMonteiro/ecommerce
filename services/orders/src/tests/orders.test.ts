import server from '../../app';
import request from 'supertest';
import { Decimal } from '@prisma/client/runtime/library';
import { prismaMock } from '../libs/__mocks__/prisma.singleton';
import { CartError, getCart } from '../libs/cartClient';
import { publishEvent } from '../libs/messaging';
import {
  handlePaymentFailed,
  handlePaymentSucceeded,
  type PublishFn,
} from '../handlers/paymentEvents';
import {
  handleStockRejected,
  handleStockReserved,
} from '../handlers/stockEvents';

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

jest.mock('../libs/cartClient', () => ({
  __esModule: true,
  CartError: jest.requireActual('../libs/cartClient').CartError,
  CartUnavailableError: jest.requireActual('../libs/cartClient').CartUnavailableError,
  getCart: jest.fn(),
}));

jest.mock('../libs/messaging', () => ({
  __esModule: true,
  initMessaging: jest.fn().mockResolvedValue(undefined),
  closeMessaging: jest.fn().mockResolvedValue(undefined),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  getMessagingClient: jest.fn(),
  resetMessagingClientForTests: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn().mockImplementation(() => ({ userId: 1, username: 'testuser' })),
  },
}));

const getCartMock = getCart as jest.MockedFunction<typeof getCart>;
const publishEventMock = publishEvent as jest.MockedFunction<typeof publishEvent>;

describe('Orders Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    getCartMock.mockReset();
    publishEventMock.mockReset();
  });

  const testOrderItem = {
    id: 1,
    orderId: 1,
    productId: 10,
    quantity: 2,
    unitPrice: new Decimal('19.99'),
    name: 'Test Product',
  };

  const testOrder = {
    id: 1,
    userId: 1,
    status: 'PENDING' as const,
    total: new Decimal('39.98'),
    items: [testOrderItem],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const cartWithItems = {
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
  };

  it('should return 401 when creating order without a token', async () => {
    await request(server)
      .post('/api/orders')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Authentication required');
      });
  });

  it('should return 400 when cart is empty', async () => {
    getCartMock.mockResolvedValue({ items: [], subtotal: 0, itemCount: 0 });

    await request(server)
      .post('/api/orders')
      .set('Authorization', 'Bearer testtoken')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Cart is empty');
      });

    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(publishEventMock).not.toHaveBeenCalled();
  });

  it('should create order and publish order.created', async () => {
    getCartMock.mockResolvedValue(cartWithItems);
    prismaMock.order.create.mockResolvedValue(testOrder);

    const response = await request(server)
      .post('/api/orders')
      .set('Authorization', 'Bearer testtoken')
      .expect(202);

    expect(getCartMock).toHaveBeenCalledWith('Bearer testtoken');
    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        status: 'PENDING',
        total: expect.any(Decimal),
        items: {
          create: [
            {
              productId: 10,
              quantity: 2,
              unitPrice: expect.any(Decimal),
              name: 'Test Product',
            },
          ],
        },
      },
      include: { items: true },
    });
    expect(publishEventMock).toHaveBeenCalledWith('order.created', {
      orderId: 1,
      userId: 1,
      items: [{ productId: 10, quantity: 2 }],
    });
    expect(response.body).toEqual({
      orderId: 1,
      status: 'PENDING',
    });
  });

  it('should list user orders', async () => {
    prismaMock.order.findMany.mockResolvedValue([testOrder]);

    const response = await request(server)
      .get('/api/orders')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(response.body).toEqual([
      {
        id: 1,
        userId: 1,
        status: 'PENDING',
        total: 39.98,
        items: [
          {
            id: 1,
            productId: 10,
            name: 'Test Product',
            quantity: 2,
            unitPrice: 19.99,
            lineTotal: 39.98,
          },
        ],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('should get one order by id', async () => {
    prismaMock.order.findUnique.mockResolvedValue(testOrder);

    const response = await request(server)
      .get('/api/orders/1')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);

    expect(response.body.id).toBe(1);
    expect(response.body.status).toBe('PENDING');
  });

  it('should return 403 when order belongs to another user', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...testOrder,
      userId: 99,
    });

    await request(server)
      .get('/api/orders/1')
      .set('Authorization', 'Bearer testtoken')
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toBe('Forbidden');
      });
  });

  it('should return 404 when order is not found', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    await request(server)
      .get('/api/orders/999')
      .set('Authorization', 'Bearer testtoken')
      .expect(404);
  });

  it('should return 502 when cart service fails', async () => {
    getCartMock.mockRejectedValue(new CartError(500, 'Cart service returned status 500'));

    await request(server)
      .post('/api/orders')
      .set('Authorization', 'Bearer testtoken')
      .expect(502);
  });
});

describe('Stock event handlers', () => {
  beforeEach(() => {
    prismaMock.order.updateMany.mockReset();
    prismaMock.order.findUnique.mockReset();
  });

  it('should update status to AWAITING_PAYMENT on stock.reserved', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await handleStockReserved({ orderId: 1, reservationId: 100 }, prismaMock);

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'AWAITING_PAYMENT' },
    });
  });

  it('should update status to CANCELLED on stock.rejected', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await handleStockRejected({ orderId: 1, reason: 'Insufficient stock' }, prismaMock);

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  });

  it('should log unknown orderId on stock.reserved without updating', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUnique.mockResolvedValue(null);

    await handleStockReserved({ orderId: 999, reservationId: 100 }, prismaMock);

    expect(warnSpy).toHaveBeenCalledWith('stock.reserved: unknown orderId 999');
    warnSpy.mockRestore();
  });
});

describe('Payment event handlers', () => {
  const publish = jest.fn() as jest.MockedFunction<PublishFn>;

  const awaitingPaymentOrder = {
    id: 1,
    userId: 1,
    status: 'AWAITING_PAYMENT' as const,
    total: new Decimal('39.98'),
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const confirmedOrder = {
    ...awaitingPaymentOrder,
    status: 'CONFIRMED' as const,
  };

  const cancelledOrder = {
    ...awaitingPaymentOrder,
    status: 'CANCELLED' as const,
  };

  beforeEach(() => {
    prismaMock.order.updateMany.mockReset();
    prismaMock.order.findUnique.mockReset();
    publish.mockReset();
  });

  it('should update status to CONFIRMED and publish order.confirmed on payment.succeeded', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.findUnique.mockResolvedValue(confirmedOrder);

    await handlePaymentSucceeded(
      { orderId: 1, paymentId: 7 },
      { db: prismaMock, publish },
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'AWAITING_PAYMENT' },
      data: { status: 'CONFIRMED' },
    });
    expect(publish).toHaveBeenCalledWith('order.confirmed', {
      orderId: 1,
      userId: 1,
    });
  });

  it('should re-publish order.confirmed when order is already CONFIRMED', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUnique.mockResolvedValue(confirmedOrder);

    await handlePaymentSucceeded(
      { orderId: 1, paymentId: 7 },
      { db: prismaMock, publish },
    );

    expect(publish).toHaveBeenCalledWith('order.confirmed', {
      orderId: 1,
      userId: 1,
    });
  });

  it('should not publish order.confirmed when order is not awaiting payment or confirmed', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUnique.mockResolvedValue({
      ...awaitingPaymentOrder,
      status: 'PENDING',
    });

    await handlePaymentSucceeded(
      { orderId: 1, paymentId: 7 },
      { db: prismaMock, publish },
    );

    expect(publish).not.toHaveBeenCalled();
  });

  it('should update status to CANCELLED and publish order.cancelled on payment.failed', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.findUnique.mockResolvedValue(cancelledOrder);

    await handlePaymentFailed(
      { orderId: 1, reason: 'Payment declined (mock)' },
      { db: prismaMock, publish },
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'AWAITING_PAYMENT' },
      data: { status: 'CANCELLED' },
    });
    expect(publish).toHaveBeenCalledWith('order.cancelled', {
      orderId: 1,
      userId: 1,
      reason: 'Payment declined (mock)',
    });
  });

  it('should re-publish order.cancelled when order is already CANCELLED', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUnique.mockResolvedValue(cancelledOrder);

    await handlePaymentFailed(
      { orderId: 1, reason: 'Payment declined (mock)' },
      { db: prismaMock, publish },
    );

    expect(publish).toHaveBeenCalledWith('order.cancelled', {
      orderId: 1,
      userId: 1,
      reason: 'Payment declined (mock)',
    });
  });

  it('should log unknown orderId on payment.failed without publishing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUnique.mockResolvedValue(null);

    await handlePaymentFailed(
      { orderId: 999, reason: 'Payment declined (mock)' },
      { db: prismaMock, publish },
    );

    expect(warnSpy).toHaveBeenCalledWith('payment.failed: unknown orderId 999');
    expect(publish).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
