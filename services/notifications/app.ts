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

const NOTIFICATIONS_PORT = process.env.NOTIFICATIONS_PORT || 3007;

const server = app.listen(NOTIFICATIONS_PORT, () => {
  console.log(`Notifications service is running on port ${NOTIFICATIONS_PORT}`);
});

initMessaging().catch((error) => {
  console.error('Failed to connect to RabbitMQ:', error);
});

process.on('SIGTERM', async () => {
  await closeMessaging();
  server.close();
});

export default server;
