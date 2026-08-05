declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    CART_PORT: string;
    DATABASE_URL: string;
    CATALOG_SERVICE_URL: string;
    JWT_HASH: string;
  }
}
