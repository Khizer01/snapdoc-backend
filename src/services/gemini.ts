import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExplainResult, ChatMessage } from '../types';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY env var');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fallback chain across separate quota buckets (all confirmed available on v1beta).
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'];
const CHAT_MODEL = 'gemini-2.5-flash';

function isRateLimit(err: any): boolean {
  return String(err?.message ?? '').includes('429');
}

function stripJsonFences(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
}

export async function explainDocument(imageBase64: string): Promise<ExplainResult> {
  const prompt = `You are a helpful assistant that explains documents in plain, simple language.

Analyse this document image and respond ONLY with valid JSON in this exact format:
{
  "title": "Short descriptive name for this specific document (e.g. 'Vodafone Bill – June 2026', 'Employment Contract – Acme Corp', 'HMRC Tax Notice – Apr 2025'). Be specific, not generic.",
  "raw_text": "the full text you can see in the document",
  "summary": "2-3 sentence plain-language summary of what this document is and what it means for the recipient",
  "document_type": "one of: contract, bill, form, letter, receipt, medical, legal, other",
  "key_points": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "flags": ["any important deadline or required action — omit this key if none"],
  "visual_context": "describe anything visual that is NOT already captured in raw_text and that someone might later ask about: stamps, signatures, logos, photos or diagrams, checkboxes/tick marks and their state, table layout, handwriting, colors, condition of the document, etc. Empty string if there is nothing notable beyond the text."
}

Rules:
- Use simple language, no jargon
- title: 3-7 words, specific to this document's content
- key_points: exactly 3-5 items
- flags: only real deadlines, payment due dates, or required actions — empty array if none
- visual_context: this is the only record kept of the image after this call, so be thorough about anything non-textual a follow-up question might reasonably ask about
- Respond with JSON only, no markdown fences, no extra text`;

  let lastError: Error = new Error('All Gemini models are currently rate-limited. Please try again in a minute.');

  for (const modelName of VISION_MODELS) {
    const model = genAI.getGenerativeModel({ model: modelName });
    let geminiResult;

    try {
      geminiResult = await model.generateContent([
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: prompt },
      ]);
    } catch (err: any) {
      if (isRateLimit(err)) {
        console.warn(`Rate limit on ${modelName}, trying next model…`);
        lastError = new Error(`Rate limit on ${modelName}. Trying fallback…`);
        continue;
      }
      throw new Error(`Gemini API error: ${err?.message ?? 'Unknown error'}`);
    }

    let rawText: string;
    try {
      rawText = geminiResult.response.text();
    } catch {
      throw new Error('Document could not be analysed — the image may be unclear or contain unsupported content. Please try a clearer photo.');
    }

    if (!rawText || rawText.trim() === '') {
      throw new Error('Gemini returned an empty response. Please try a clearer image.');
    }

    const text = stripJsonFences(rawText);
    try {
      const parsed = JSON.parse(text);
      return {
        title: parsed.title ?? '',
        raw_text: parsed.raw_text ?? '',
        summary: parsed.summary ?? '',
        document_type: parsed.document_type ?? 'other',
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        visual_context: parsed.visual_context ?? '',
      };
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${text.substring(0, 200)}`);
    }
  }

  throw lastError;
}

export async function chatWithDocument(
  rawText: string,
  visualContext: string,
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const systemContext = `You are a helpful assistant. The user scanned a document with this content:

---
${rawText}
---
${visualContext ? `\nAdditional visual details from the original photo (stamps, signatures, layout, etc.):\n${visualContext}\n` : ''}
Answer their questions about this document simply, clearly, and concisely. If the answer isn't in the document, say so honestly.`;

  const historyText = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${systemContext}

${historyText ? `Conversation so far:\n${historyText}\n` : ''}
User: ${userMessage}
Assistant:`;

  // Chat also falls back through models on rate limit
  for (const modelName of [CHAT_MODEL, 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest']) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      const result = await model.generateContent(fullPrompt);
      return result.response.text().trim();
    } catch (err: any) {
      if (isRateLimit(err)) {
        console.warn(`Rate limit on ${modelName} (chat), trying next model…`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All Gemini models are currently rate-limited. Please try again in a minute.');
}
