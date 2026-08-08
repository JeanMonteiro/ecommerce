import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes';
import { initMessaging, closeMessaging } from './src/libs/messaging';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

const PAYMENT_PORT = process.env.PAYMENT_PORT || 3006;

const server = app.listen(PAYMENT_PORT, () => {
  console.log(`Payment service is running on port ${PAYMENT_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
