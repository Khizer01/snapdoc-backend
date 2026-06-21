import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

const updateUserByIdMock = jest.fn();

jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      admin: {
        updateUserById: updateUserByIdMock,
      },
    },
  },
}));

import app from '../index';

describe('PUT /api/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when first_name or last_name is missing', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer fake-token')
      .send({ first_name: 'Ada' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'first_name and last_name are required' });
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  test('updates the profile and returns the merged user', async () => {
    updateUserByIdMock.mockResolvedValueOnce({
      data: {
        user: {
          id: 'test-user-id',
          email: 'ada@test.com',
          user_metadata: { first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace' },
        },
      },
      error: null,
    });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer fake-token')
      .send({ first_name: 'Ada', last_name: 'Lovelace' });

    expect(res.status).toBe(200);
    expect(res.body.user.user_metadata.full_name).toBe('Ada Lovelace');
    expect(updateUserByIdMock).toHaveBeenCalledWith(
      'test-user-id',
      expect.objectContaining({
        user_metadata: expect.objectContaining({ full_name: 'Ada Lovelace' }),
      })
    );
  });

  test('returns 500 when supabase update fails', async () => {
    updateUserByIdMock.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } });

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer fake-token')
      .send({ first_name: 'Ada', last_name: 'Lovelace' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'update failed' });
  });
});
