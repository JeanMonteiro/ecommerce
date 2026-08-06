process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://orders:orders@localhost:5437/orders_db?schema=public';

process.env.JWT_HASH = process.env.JWT_HASH || 'test-secret';

process.env.CART_SERVICE_URL =
  process.env.CART_SERVICE_URL || 'http://localhost:3003';

process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
