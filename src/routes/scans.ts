import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../types';

const router = Router();

// MUST be before /:id so Express doesn't treat "archived" as a scan ID
router.get('/archived', requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('scans')
    .select('*, messages(count)')
    .eq('user_id', req.userId!)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const scans = (data ?? []).map((scan: any) => ({
    ...scan,
    message_count: scan.messages?.[0]?.count ?? 0,
    messages: undefined,
  }));
  res.json({ scans });
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('scans')
    .select('*, messages(count)')
    .eq('user_id', req.userId!)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const scans = (data ?? []).map((scan: any) => ({
    ...scan,
    message_count: scan.messages?.[0]?.count ?? 0,
    messages: undefined,
  }));
  res.json({ scans });
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .single();

  if (scanError || !scan) { res.status(404).json({ error: 'Scan not found' }); return; }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('scan_id', id)
    .order('created_at', { ascending: true });

  res.json({ scan, messages: messages ?? [] });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { archived } = req.body as { archived: boolean };

  if (typeof archived !== 'boolean') {
    res.status(400).json({ error: '`archived` must be a boolean' });
    return;
  }

  const { data, error } = await supabase
    .from('scans')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: 'Scan not found' }); return; }
  res.json({ scan: data });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('scans')
    .delete()
    .eq('id', id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: 'Scan not found' }); return; }
  res.status(204).send();
});

export default router;
