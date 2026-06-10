import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../types';

const router = Router();

router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { first_name, last_name, avatar_url } = req.body;

  if (!first_name || !last_name) {
    res.status(400).json({ error: 'first_name and last_name are required' });
    return;
  }

  const updateData: Record<string, string> = {
    first_name,
    last_name,
    full_name: `${first_name} ${last_name}`,
  };
  if (avatar_url) updateData.avatar_url = avatar_url;

  const { data, error } = await supabase.auth.admin.updateUserById(
    req.userId!,
    { user_metadata: updateData }
  );

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    },
  });
});

export default router;
