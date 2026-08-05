declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    INVENTORY_PORT: string;
    DATABASE_URL: string;
    RABBITMQ_URL: string;
  }
}
