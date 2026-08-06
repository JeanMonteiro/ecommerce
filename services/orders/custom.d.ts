declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    ORDERS_PORT: string;
    DATABASE_URL: string;
    CART_SERVICE_URL: string;
    JWT_HASH: string;
    RABBITMQ_URL: string;
  }
}
