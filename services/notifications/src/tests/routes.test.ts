import express from 'express';
import request from 'supertest';
import routes from '../routes';
import {
  getMockEmails,
  resetMockEmailStoreForTests,
  sendMockEmail,
} from '../libs/mockEmailStore';

describe('notifications routes', () => {
  const app = express();

  app.use(express.json());
  app.use(routes);

  beforeEach(() => {
    resetMockEmailStoreForTests();
  });

  it('GET /health returns ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/notifications returns stored mock emails newest first', async () => {
    sendMockEmail({
      type: 'welcome',
      to: { userId: 1, username: 'alice' },
      subject: 'Welcome',
      body: 'Hi alice',
      payload: { userId: 1, username: 'alice' },
    });
    sendMockEmail({
      type: 'order-confirmed',
      to: { userId: 1 },
      subject: 'Order confirmed',
      body: 'Order 10 confirmed',
      payload: { orderId: 10, userId: 1 },
    });

    const response = await request(app).get('/api/notifications?limit=10');

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(2);
    expect(response.body.notifications[0].type).toBe('order-confirmed');
    expect(response.body.notifications[1].type).toBe('welcome');
    expect(getMockEmails(10)).toHaveLength(2);
  });
});
