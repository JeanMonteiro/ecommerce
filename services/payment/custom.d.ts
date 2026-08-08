declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PAYMENT_PORT: string;
    DATABASE_URL: string;
    RABBITMQ_URL: string;
    PAYMENT_FORCE_RESULT?: 'success' | 'failure' | 'random';
  }
}
