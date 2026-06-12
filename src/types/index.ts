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
}

export interface Scan {
  id: string;
  user_id: string;
  raw_text: string | null;
  ai_summary: string | null;
  document_type: string | null;
  title: string | null;
  key_points: string[] | null;
  flags: string[] | null;
  created_at: string;
  message_count?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
