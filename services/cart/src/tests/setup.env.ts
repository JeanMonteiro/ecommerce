process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://cart:cart@localhost:5436/cart_db?schema=public';

process.env.JWT_HASH = process.env.JWT_HASH || 'test-secret';

process.env.CATALOG_SERVICE_URL =
  process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
