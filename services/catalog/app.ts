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

const CATALOG_PORT = process.env.CATALOG_PORT || 3002;

const server = app.listen(CATALOG_PORT, () => {
  console.log(`Catalog service is running on port ${CATALOG_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
