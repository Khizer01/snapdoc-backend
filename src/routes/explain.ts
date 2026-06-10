import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { explainDocument } from '../services/gemini';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../types';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { image } = req.body as { image?: string };
  if (!image) {
    res.status(400).json({ error: 'image (base64) is required' });
    return;
  }

  try {
    const geminiResult = await explainDocument(image);

    const { data: scan, error } = await supabase
      .from('scans')
      .insert({
        user_id: req.userId,
        raw_text: geminiResult.raw_text,
        ai_summary: geminiResult.summary,
        document_type: geminiResult.document_type,
        key_points: geminiResult.key_points,
        flags: geminiResult.flags,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      scan_id: scan.id,
      title: geminiResult.title,
      summary: geminiResult.summary,
      document_type: geminiResult.document_type,
      key_points: geminiResult.key_points,
      flags: geminiResult.flags,
    });
  } catch (err: any) {
    console.error('explain error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to process document' });
  }
});

export default router;
