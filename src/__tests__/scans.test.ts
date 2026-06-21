import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

const selectMock = jest.fn().mockReturnThis();
const eqMock = jest.fn().mockReturnThis();
const isMock = jest.fn().mockReturnThis();
const notMock = jest.fn().mockReturnThis();
const orderMock = jest.fn();
const singleMock = jest.fn();
const updateMock = jest.fn().mockReturnThis();
const deleteMock = jest.fn().mockReturnThis();
const insertMock = jest.fn().mockReturnThis();

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: selectMock,
      eq: eqMock,
      is: isMock,
      not: notMock,
      order: orderMock,
      single: singleMock,
      update: updateMock,
      delete: deleteMock,
      insert: insertMock,
    })),
  },
}));

import app from '../index';

describe('GET /api/scans', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns active scans with message_count flattened', async () => {
    orderMock.mockResolvedValueOnce({
      data: [{ id: 'scan-1', messages: [{ count: 3 }] }],
      error: null,
    });

    const res = await request(app)
      .get('/api/scans')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.scans).toEqual([{ id: 'scan-1', message_count: 3, messages: undefined }]);
  });

  test('returns 500 when supabase errors', async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });

    const res = await request(app)
      .get('/api/scans')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'db down' });
  });
});

describe('GET /api/scans/archived', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns archived scans with message_count flattened', async () => {
    orderMock.mockResolvedValueOnce({
      data: [{ id: 'scan-2', messages: [{ count: 0 }] }],
      error: null,
    });

    const res = await request(app)
      .get('/api/scans/archived')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.scans).toEqual([{ id: 'scan-2', message_count: 0, messages: undefined }]);
  });
});

describe('GET /api/scans/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns scan with messages when found', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 'scan-1' }, error: null });
    orderMock.mockResolvedValueOnce({ data: [{ id: 'msg-1' }], error: null });

    const res = await request(app)
      .get('/api/scans/scan-1')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body.scan).toEqual({ id: 'scan-1' });
    expect(res.body.messages).toEqual([{ id: 'msg-1' }]);
  });

  test('returns 404 when scan is not found', async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const res = await request(app)
      .get('/api/scans/missing-id')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Scan not found' });
  });
});

describe('PATCH /api/scans/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 400 when archived is not a boolean', async () => {
    const res = await request(app)
      .patch('/api/scans/scan-1')
      .set('Authorization', 'Bearer fake-token')
      .send({ archived: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: '`archived` must be a boolean' });
  });

  test('archives a scan and returns the updated row', async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: 'scan-1', archived_at: '2026-06-21T00:00:00.000Z' },
      error: null,
    });

    const res = await request(app)
      .patch('/api/scans/scan-1')
      .set('Authorization', 'Bearer fake-token')
      .send({ archived: true });

    expect(res.status).toBe(200);
    expect(res.body.scan.archived_at).toBeTruthy();
  });

  test('returns 404 when the scan to update does not exist', async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const res = await request(app)
      .patch('/api/scans/missing-id')
      .set('Authorization', 'Bearer fake-token')
      .send({ archived: false });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Scan not found' });
  });
});

describe('DELETE /api/scans/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deletes a scan and returns 204', async () => {
    singleMock.mockResolvedValueOnce({ data: { id: 'scan-1' }, error: null });

    const res = await request(app)
      .delete('/api/scans/scan-1')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(204);
  });

  test('returns 404 when the scan to delete does not exist', async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const res = await request(app)
      .delete('/api/scans/missing-id')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Scan not found' });
  });
});
