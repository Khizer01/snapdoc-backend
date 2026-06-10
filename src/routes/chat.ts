import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { chatWithDocument } from '../services/gemini';
import { supabase } from '../services/supabase';
import { AuthRequest, ChatMessage } from '../types';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { scan_id, message, history } = req.body as {
    scan_id?: string;
    message?: string;
    history?: ChatMessage[];
  };

  if (!scan_id || !message) {
    res.status(400).json({ error: 'scan_id and message are required' });
    return;
  }

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('raw_text, user_id')
    .eq('id', scan_id)
    .eq('user_id', req.userId!)
    .single();

  if (scanError || !scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  try {
    const reply = await chatWithDocument(
      scan.raw_text ?? '',
      message,
      history ?? []
    );

    await supabase.from('messages').insert({
      scan_id,
      role: 'user',
      content: message,
    });

    await supabase.from('messages').insert({
      scan_id,
      role: 'assistant',
      content: reply,
    });

    res.json({ reply });
  } catch (err: any) {
    console.error('chat error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to generate reply' });
  }
});

export default router;
