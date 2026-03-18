import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';

export const chatsRouter = Router();
chatsRouter.use(requireAuth);

// GET /api/chats — list user's chats (with last message preview)
chatsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('chats')
    .select(`
      *,
      love_interest:characters!chats_character_id_fkey(id, name, content_md),
      persona:characters!chats_persona_character_id_fkey(id, name, content_md),
      scenario:scenarios(id, name, content_md),
      messages(content, created_at, role)
    `)
    .eq('user_id', req.userId!)
    .order('updated_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Attach last message preview
  const chats = (data || []).map((chat: any) => {
    const msgs = (chat.messages || []) as Array<{ content: string; created_at: string; role: string }>;
    msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastMsg = msgs[0];
    const { messages: _m, ...rest } = chat;
    return { ...rest, last_message: lastMsg ? { content: lastMsg.content.slice(0, 120), role: lastMsg.role } : null };
  });

  res.json(chats);
});

// GET /api/chats/:id — full chat with all messages
chatsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('chats')
    .select(`
      *,
      love_interest:characters!chats_character_id_fkey(id, name, content_md),
      persona:characters!chats_persona_character_id_fkey(id, name, content_md),
      scenario:scenarios(id, name, content_md),
      messages(*)
    `)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .order('created_at', { referencedTable: 'messages', ascending: true })
    .single();

  if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

// POST /api/chats — create new chat
chatsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { title, mode, persona_character_id, character_id, scenario_id, model_provider, model_name } = req.body;

  const { data, error } = await supabaseAdmin
    .from('chats')
    .insert({
      user_id: req.userId,
      title: title || 'New Chat',
      mode,
      persona_character_id: persona_character_id || null,
      character_id: character_id || null,
      scenario_id: scenario_id || null,
      model_provider,
      model_name,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH /api/chats/:id — update mutable chat fields
chatsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { title, model_provider, model_name } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof title === 'string' && title.trim()) updates.title = title;
  if (typeof model_provider === 'string' && model_provider.trim()) updates.model_provider = model_provider;
  if (typeof model_name === 'string' && model_name.trim()) updates.model_name = model_name;

  if (Object.keys(updates).length === 1) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('chats')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

// DELETE /api/chats/:id
chatsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  // Messages will cascade-delete via FK
  const { error } = await supabaseAdmin
    .from('chats')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).end();
});

// POST /api/chats/:id/messages — append a message
chatsRouter.post('/:id/messages', async (req: AuthRequest, res: Response) => {
  const { role, content, image_url } = req.body;
  if (!role || !content) { res.status(400).json({ error: 'role and content required' }); return; }

  // Verify ownership
  const { data: chat } = await supabaseAdmin
    .from('chats')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single();

  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ chat_id: req.params.id, user_id: req.userId, role, content, image_url: image_url || null })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Bump chat updated_at
  await supabaseAdmin
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  res.status(201).json(data);
});
