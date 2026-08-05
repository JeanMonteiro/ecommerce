import express from 'express';
import cors from 'cors';
import routes from './src/routes';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(routes)
app.use(bodyParser.json())

// Start server
const AUTH_PORT = process.env.AUTH_PORT || 3000;
const server = app.listen(AUTH_PORT, () => {
  console.log(`Server is running on port ${AUTH_PORT}`);
});

export default server;