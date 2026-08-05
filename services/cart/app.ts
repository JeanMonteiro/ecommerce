import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes';

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

// TODO (Phase 5): subscribe to order.confirmed and clear cart for userId

export default server;
