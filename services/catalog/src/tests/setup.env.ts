process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://catalog:catalog@localhost:5434/catalog_db?schema=public';

process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
