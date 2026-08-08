import type { Request, Response } from 'express';
import request from 'supertest';

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: () => (_req: Request, res: Response) => {
    res.status(200).json({ proxied: true });
  },
}));

import server, { app } from '../../app';

describe('API Gateway', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('GET /health returns ok without auth', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/cart returns 401 without JWT', async () => {
    const response = await request(app).get('/api/cart');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  it('POST /api/users is public (does not require JWT)', async () => {
    const response = await request(app).post('/api/users').send({});

    expect(response.status).not.toBe(401);
    expect(response.body).toEqual({ proxied: true });
  });

  it('GET /api/users returns 401 without JWT', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });

  it('GET /api/products is public', async () => {
    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ proxied: true });
  });

  it('POST /api/products returns 401 without JWT', async () => {
    const response = await request(app).post('/api/products').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication required' });
  });
});
