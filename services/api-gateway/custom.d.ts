declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    GATEWAY_PORT: string;
    API_GATEWAY_PORT: string;
    AUTH_SERVICE_URL: string;
    CATALOG_SERVICE_URL: string;
    INVENTORY_SERVICE_URL: string;
    CART_SERVICE_URL: string;
    ORDERS_SERVICE_URL: string;
    NOTIFICATIONS_SERVICE_URL: string;
    JWT_HASH: string;
  }
}
