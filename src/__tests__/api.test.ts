import request from 'supertest';

// Mock requireAuth before importing app
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

// Mock Supabase client — must be before any module that imports supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }),
    auth: {
      admin: {
        updateUserById: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@test.com', user_metadata: {} } },
          error: null,
        }),
      },
    },
    storage: {
      from: jest.fn(),
    },
  },
}));

import app from '../index';

describe('SnapDoc AI API', () => {
  test('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  test('GET /api/scans with valid auth returns 200 with scans array', async () => {
    const res = await request(app)
      .get('/api/scans')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('scans');
    expect(Array.isArray(res.body.scans)).toBe(true);
  });

  test('POST /api/explain with missing image returns 400', async () => {
    const res = await request(app)
      .post('/api/explain')
      .set('Authorization', 'Bearer fake-token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/chat with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer fake-token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
