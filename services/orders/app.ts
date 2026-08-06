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

const ORDERS_PORT = process.env.ORDERS_PORT || 3004;

const server = app.listen(ORDERS_PORT, () => {
  console.log(`Orders service is running on port ${ORDERS_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
