import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

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

// Preserve existing auth paths — no rewrites needed.
app.use('/api/users', authProxy);
app.use('/api/auth', authProxy);

app.use('/api/products', catalogProxy);
app.use('/api/inventory', inventoryProxy);

// TODO (Fase 6): protect routes with @ecommerce/auth-middleware at the gateway.
// Register/login stay public; JWT validation can move here for downstream services.

const gatewayPort =
  process.env.GATEWAY_PORT ?? process.env.API_GATEWAY_PORT ?? 3000;

const server = app.listen(gatewayPort, () => {
  console.log(`API gateway listening on port ${gatewayPort}`);
  console.log(`Proxying auth routes to ${authServiceUrl}`);
  console.log(`Proxying catalog routes to ${catalogServiceUrl}`);
  console.log(`Proxying inventory routes to ${inventoryServiceUrl}`);
});

export default server;
