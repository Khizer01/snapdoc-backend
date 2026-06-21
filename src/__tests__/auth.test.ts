import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

const jwtVerifyMock = jest.fn();

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jwtVerifyMock,
}));

import { requireAuth } from '../middleware/auth';

function mockRes() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('requireAuth middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects requests with no Authorization header', async () => {
    const req = { headers: {} } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects requests with a malformed Authorization header', async () => {
    const req = { headers: { authorization: 'Token abc123' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid or expired token', async () => {
    jwtVerifyMock.mockRejectedValueOnce(new Error('signature verification failed'));
    const req = { headers: { authorization: 'Bearer bad-token' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('sets req.userId and calls next() for a valid token', async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { sub: 'user-123' } });
    const req = { headers: { authorization: 'Bearer good-token' } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
