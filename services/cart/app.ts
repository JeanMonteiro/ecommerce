import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes';
import { initMessaging, closeMessaging } from './src/libs/messaging';

dotenv.config();

if (!process.env.JWT_HASH) {
  throw new Error('JWT_HASH environment variable is required');
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

const CART_PORT = process.env.CART_PORT || 3003;

const server = app.listen(CART_PORT, () => {
  console.log(`Cart service is running on port ${CART_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
