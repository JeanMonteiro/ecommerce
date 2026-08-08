import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from '@ecommerce/auth-middleware';

dotenv.config();

if (!process.env.JWT_HASH) {
  throw new Error('JWT_HASH environment variable is required');
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const authServiceUrl =
  process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001';
const catalogServiceUrl =
  process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002';
const inventoryServiceUrl =
  process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3005';
const cartServiceUrl =
  process.env.CART_SERVICE_URL ?? 'http://localhost:3003';
const ordersServiceUrl =
  process.env.ORDERS_SERVICE_URL ?? 'http://localhost:3004';
const notificationsServiceUrl =
  process.env.NOTIFICATIONS_SERVICE_URL ?? 'http://localhost:3007';

const authProxy = createProxyMiddleware({
  target: authServiceUrl,
  changeOrigin: true,
});

const catalogProxy = createProxyMiddleware({
  target: catalogServiceUrl,
  changeOrigin: true,
});

const inventoryProxy = createProxyMiddleware({
  target: inventoryServiceUrl,
  changeOrigin: true,
});

const cartProxy = createProxyMiddleware({
  target: cartServiceUrl,
  changeOrigin: true,
});

const ordersProxy = createProxyMiddleware({
  target: ordersServiceUrl,
  changeOrigin: true,
});

const notificationsProxy = createProxyMiddleware({
  target: notificationsServiceUrl,
  changeOrigin: true,
});

function protectWrites(proxy: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => {
    if (req.method === 'GET') {
      return proxy(req, res, next);
    }
    return authMiddleware(req, res, () => proxy(req, res, next));
  };
}

// Public: register and login
app.post('/api/users', authProxy);
app.post('/api/auth', authProxy);

// Protected: list users
app.get('/api/users', authMiddleware, authProxy);

// Public GET browse; protected writes (POST/PUT/PATCH/DELETE)
app.use('/api/products', protectWrites(catalogProxy));
app.use('/api/inventory', protectWrites(inventoryProxy));

// Protected: cart and orders (defense in depth — services also validate JWT)
app.use('/api/cart', authMiddleware, cartProxy);
app.use('/api/orders', authMiddleware, ordersProxy);

// Public debug endpoint for mock emails (notifications not in compose yet)
app.get('/api/notifications', notificationsProxy);

const gatewayPort =
  process.env.GATEWAY_PORT ?? process.env.API_GATEWAY_PORT ?? 3000;

const server = app.listen(gatewayPort, () => {
  console.log(`API gateway listening on port ${gatewayPort}`);
  console.log(`Proxying auth routes to ${authServiceUrl}`);
  console.log(`Proxying catalog routes to ${catalogServiceUrl}`);
  console.log(`Proxying inventory routes to ${inventoryServiceUrl}`);
  console.log(`Proxying cart routes to ${cartServiceUrl}`);
  console.log(`Proxying orders routes to ${ordersServiceUrl}`);
  console.log(`Proxying notifications routes to ${notificationsServiceUrl}`);
});

export { app };
export default server;
