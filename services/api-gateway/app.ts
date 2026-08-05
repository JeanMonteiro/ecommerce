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

const authProxy = createProxyMiddleware({
  target: authServiceUrl,
  changeOrigin: true,
});

// Preserve existing auth paths — no rewrites needed.
app.use('/api/users', authProxy);
app.use('/api/auth', authProxy);

// TODO (Fase 6): protect routes with @ecommerce/auth-middleware at the gateway.
// Register/login stay public; JWT validation can move here for downstream services.

const gatewayPort =
  process.env.GATEWAY_PORT ?? process.env.API_GATEWAY_PORT ?? 3000;

const server = app.listen(gatewayPort, () => {
  console.log(`API gateway listening on port ${gatewayPort}`);
  console.log(`Proxying auth routes to ${authServiceUrl}`);
});

export default server;
