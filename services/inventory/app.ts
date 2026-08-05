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

const INVENTORY_PORT = process.env.INVENTORY_PORT || 3005;

const server = app.listen(INVENTORY_PORT, () => {
  console.log(`Inventory service is running on port ${INVENTORY_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
