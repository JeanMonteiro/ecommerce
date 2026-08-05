import jwt from 'jsonwebtoken';

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function getJwtSecret(): string {
  const secret = process.env.JWT_HASH;
  if (!secret) {
    throw new Error('JWT_HASH environment variable is required');
  }
  return secret;
}

export function signToken(payload: { userId: number; username: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}
