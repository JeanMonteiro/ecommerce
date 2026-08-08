declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NOTIFICATIONS_PORT: string;
    RABBITMQ_URL: string;
    NOTIFICATIONS_MAX_STORED?: string;
  }
}
