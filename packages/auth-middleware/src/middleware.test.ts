import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './middleware';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

const mockedVerify = jwt.verify as jest.Mock;

function createMocks(authHeader?: string) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Request;

  const json = jest.fn();
  const res = {
    status: jest.fn().mockReturnValue({ json }),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, json, next };
}

describe('authMiddleware', () => {
  beforeEach(() => {
    process.env.JWT_HASH = 'test-secret';
    jest.clearAllMocks();
  });

  it('returns 401 when Authorization header is missing', () => {
    const { req, res, json, next } = createMocks();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const { req, res, json, next } = createMocks('Basic abc');

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', () => {
    mockedVerify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { req, res, json, next } = createMocks('Bearer badtoken');

    authMiddleware(req, res, next);

    expect(mockedVerify).toHaveBeenCalledWith('badtoken', 'test-secret');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches decoded payload to req.user and calls next on success', () => {
    const payload = { userId: 1, username: 'testuser' };
    mockedVerify.mockReturnValue(payload);
    const { req, res, next } = createMocks('Bearer goodtoken');

    authMiddleware(req, res, next);

    expect(mockedVerify).toHaveBeenCalledWith('goodtoken', 'test-secret');
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
