import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes';
import { getJwtSecret } from './src/config/jwt';

dotenv.config();
getJwtSecret();

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);

const AUTH_PORT = process.env.AUTH_PORT || 3000;
const server = app.listen(AUTH_PORT, () => {
  console.log(`Server is running on port ${AUTH_PORT}`);
});

export default server;
