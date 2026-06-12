import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

jest.mock('../services/gemini', () => ({
  explainDocument: jest.fn().mockResolvedValue({
    title: 'Vodafone Bill – June 2026',
    raw_text: 'raw document text',
    summary: 'This is a phone bill for June 2026.',
    document_type: 'bill',
    key_points: ['Amount due is £42.00', 'Due date is 28 June 2026'],
    flags: ['Payment due 28 June 2026'],
  }),
}));

const insertMock = jest.fn().mockReturnThis();
const selectMock = jest.fn().mockReturnThis();
const singleMock = jest.fn().mockResolvedValue({
  data: { id: 'scan-1', title: 'Vodafone Bill – June 2026' },
  error: null,
});

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    })),
  },
}));

import app from '../index';

describe('POST /api/explain', () => {
  test('persists the generated title and returns it in the response', async () => {
    const res = await request(app)
      .post('/api/explain')
      .set('Authorization', 'Bearer fake-token')
      .send({ image: 'base64imagedata' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Vodafone Bill – June 2026');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Vodafone Bill – June 2026' })
    );
  });
});
