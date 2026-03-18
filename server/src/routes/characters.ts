import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';

export const charactersRouter = Router();
charactersRouter.use(requireAuth);

// GET /api/characters — list global + user's own characters
charactersRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('characters')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${req.userId}`)
    .order('is_global', { ascending: false })
    .order('name');

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/characters/:id
charactersRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('characters')
    .select('*')
    .eq('id', req.params.id)
    .or(`user_id.is.null,user_id.eq.${req.userId}`)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

// POST /api/characters — create user character
charactersRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { name, content_md, tags } = req.body;
  if (!name || !content_md) { res.status(400).json({ error: 'name and content_md required' }); return; }

  const { data, error } = await supabaseAdmin
    .from('characters')
    .insert({ user_id: req.userId, name, content_md, tags: tags || [], is_global: false })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH /api/characters/:id
charactersRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, content_md, tags } = req.body;

  const { data, error } = await supabaseAdmin
    .from('characters')
    .update({ name, content_md, tags, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: 'Not found or not authorized' }); return; }
  res.json(data);
});

// DELETE /api/characters/:id
charactersRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from('characters')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).end();
});
