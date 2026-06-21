import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

const chatWithDocumentMock = jest.fn();
jest.mock('../services/gemini', () => ({
  chatWithDocument: chatWithDocumentMock,
}));

const singleMock = jest.fn();
const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: singleMock,
      insert: insertMock,
    })),
  },
}));

import app from '../index';

describe('POST /api/chat', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 404 when the scan does not belong to the user / does not exist', async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer fake-token')
      .send({ scan_id: 'missing-scan', message: 'What is the due date?' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Scan not found' });
    expect(chatWithDocumentMock).not.toHaveBeenCalled();
  });

  test('returns the assistant reply and persists both chat messages', async () => {
    singleMock.mockResolvedValueOnce({
      data: { raw_text: 'raw bill text', visual_context: 'a Vodafone bill', user_id: 'test-user-id' },
      error: null,
    });
    chatWithDocumentMock.mockResolvedValueOnce('The due date is 28 June 2026.');

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer fake-token')
      .send({ scan_id: 'scan-1', message: 'What is the due date?', history: [] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reply: 'The due date is 28 June 2026.' });
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ role: 'user', content: 'What is the due date?' }));
    expect(insertMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ role: 'assistant', content: 'The due date is 28 June 2026.' }));
  });

  test('returns 500 when the AI call fails', async () => {
    singleMock.mockResolvedValueOnce({
      data: { raw_text: 'raw bill text', visual_context: '', user_id: 'test-user-id' },
      error: null,
    });
    chatWithDocumentMock.mockRejectedValueOnce(new Error('gemini unavailable'));

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer fake-token')
      .send({ scan_id: 'scan-1', message: 'What is the due date?' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'gemini unavailable' });
  });
});
