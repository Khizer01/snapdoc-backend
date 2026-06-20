import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface ExplainResult {
  title: string;
  summary: string;
  document_type: string;
  key_points: string[];
  flags: string[];
  raw_text: string;
  visual_context: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
