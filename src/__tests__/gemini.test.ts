const generateContentMock = jest.fn();
const getGenerativeModelMock = jest.fn(() => ({ generateContent: generateContentMock }));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

import { explainDocument, chatWithDocument } from '../services/gemini';

function geminiResponse(text: string) {
  return { response: { text: () => text } };
}

function rateLimitError() {
  return Object.assign(new Error('429 Too Many Requests'), {});
}

describe('explainDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  const validJson = JSON.stringify({
    title: 'Vodafone Bill – June 2026',
    raw_text: 'raw text',
    summary: 'a phone bill',
    document_type: 'bill',
    key_points: ['point 1'],
    flags: [],
    visual_context: '',
  });

  test('parses a valid JSON response on the first model', async () => {
    generateContentMock.mockResolvedValueOnce(geminiResponse(validJson));

    const result = await explainDocument('base64image');

    expect(result.title).toBe('Vodafone Bill – June 2026');
    expect(result.document_type).toBe('bill');
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(1);
  });

  test('strips markdown json fences before parsing', async () => {
    generateContentMock.mockResolvedValueOnce(geminiResponse('```json\n' + validJson + '\n```'));

    const result = await explainDocument('base64image');

    expect(result.summary).toBe('a phone bill');
  });

  test('falls back to the next model when one is rate-limited', async () => {
    generateContentMock
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce(geminiResponse(validJson));

    const result = await explainDocument('base64image');

    expect(result.title).toBe('Vodafone Bill – June 2026');
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(2);
  });

  test('throws when every model is rate-limited', async () => {
    generateContentMock.mockRejectedValue(rateLimitError());

    await expect(explainDocument('base64image')).rejects.toThrow(/rate limit/i);
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(3);
  });

  test('throws a descriptive error on invalid JSON', async () => {
    generateContentMock.mockResolvedValueOnce(geminiResponse('not json at all'));

    await expect(explainDocument('base64image')).rejects.toThrow(/invalid JSON/i);
  });

  test('throws on a non-rate-limit API error without trying other models', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    await expect(explainDocument('base64image')).rejects.toThrow(/Gemini API error/i);
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(1);
  });
});

describe('chatWithDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns the trimmed reply from the first model', async () => {
    generateContentMock.mockResolvedValueOnce(geminiResponse('  The due date is 28 June 2026.  '));

    const reply = await chatWithDocument('raw text', 'a stamp in the corner', 'when is it due?', []);

    expect(reply).toBe('The due date is 28 June 2026.');
  });

  test('falls back to the next model when one is rate-limited', async () => {
    generateContentMock
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce(geminiResponse('Fallback reply'));

    const reply = await chatWithDocument('raw text', '', 'when is it due?', []);

    expect(reply).toBe('Fallback reply');
    expect(getGenerativeModelMock).toHaveBeenCalledTimes(2);
  });

  test('throws when every model is rate-limited', async () => {
    generateContentMock.mockRejectedValue(rateLimitError());

    await expect(chatWithDocument('raw text', '', 'when is it due?', [])).rejects.toThrow(/rate-limited/i);
  });
});
