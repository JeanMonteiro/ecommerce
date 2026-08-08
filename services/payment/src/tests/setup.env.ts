process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://payment:payment@localhost:5438/payment_db?schema=public';

process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

process.env.PAYMENT_FORCE_RESULT = process.env.PAYMENT_FORCE_RESULT || 'success';
