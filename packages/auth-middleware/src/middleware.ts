import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './types';

function getJwtSecret(): string {
  const secret = process.env.JWT_HASH;
  if (!secret) {
    throw new Error('JWT_HASH environment variable is required');
  }
  return secret;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
