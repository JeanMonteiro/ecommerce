process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://inventory:inventory@localhost:5436/inventory_db?schema=public';

process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
