import type { JwtPayload } from '@ecommerce/auth-middleware';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export {};
