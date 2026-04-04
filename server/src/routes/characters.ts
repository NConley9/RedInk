import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';
import { parseJsonPayload, resolveGenerationConfig, runTextGeneration } from '../prompt/llm-utils.js';
import { buildCharacterFromTextPrompt, buildGenerateLayersPrompt, GENERATION_SYSTEM_PROMPT } from '../prompt/voice-card-prompt.js';
import type { ReferenceChunk } from '../prompt/types.js';

export const charactersRouter = Router();
charactersRouter.use(requireAuth);

function normalizeChunks(chunks: unknown): ReferenceChunk[] {
  return Array.isArray(chunks)
    ? chunks.filter((chunk): chunk is ReferenceChunk => Boolean(
        chunk && typeof chunk === 'object'
        && typeof (chunk as ReferenceChunk).id === 'string'
        && Array.isArray((chunk as ReferenceChunk).triggers)
        && typeof (chunk as ReferenceChunk).content === 'string',
      ))
    : [];
}

async function getGenerationSettings(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_settings')
    .select('api_keys, lmstudio_base_url')
    .eq('user_id', userId)
    .single();

  const apiKeys = (data?.api_keys as Record<string, string>) || {};
  return {
    apiKeys,
    lmstudioBaseUrl: data?.lmstudio_base_url as string | null | undefined,
  };
}

async function generateLayersForContent(params: {
  userId: string;
  content: string;
  provider?: string | null;
  model?: string | null;
}): Promise<{ voice_card_yaml: string; reference_chunks: ReferenceChunk[] }> {
  const settings = await getGenerationSettings(params.userId);
  const config = resolveGenerationConfig({
    ...settings,
    provider: params.provider,
    model: params.model,
  });

  const payload = await runTextGeneration({
    systemPrompt: GENERATION_SYSTEM_PROMPT,
    userPrompt: buildGenerateLayersPrompt(params.content),
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  const parsed = parseJsonPayload<{ voice_card_yaml?: string; reference_chunks?: ReferenceChunk[] }>(payload);
  return {
    voice_card_yaml: String(parsed.voice_card_yaml || '').trim(),
    reference_chunks: normalizeChunks(parsed.reference_chunks),
  };
}

// GET /api/characters — list global + user's own characters
charactersRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('characters')
    .select('*')
    .or(`and(user_id.is.null,is_stock.eq.true),user_id.eq.${req.userId}`)
    .order('is_stock', { ascending: false })
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
    .or(`and(user_id.is.null,is_stock.eq.true),user_id.eq.${req.userId}`)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(data);
});

charactersRouter.post('/from-text', async (req: AuthRequest, res: Response) => {
  const { sourceText, generateLayers = true, provider, model } = req.body as {
    sourceText?: string;
    generateLayers?: boolean;
    provider?: string;
    model?: string;
  };

  if (!sourceText?.trim()) {
    res.status(400).json({ error: 'sourceText required' });
    return;
  }

  const settings = await getGenerationSettings(req.userId!);
  const config = resolveGenerationConfig({
    ...settings,
    provider,
    model,
  });

  const payload = await runTextGeneration({
    systemPrompt: GENERATION_SYSTEM_PROMPT,
    userPrompt: buildCharacterFromTextPrompt(sourceText),
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  const parsed = parseJsonPayload<{
    name?: string;
    content_md?: string;
    tags?: string[];
    voice_card_yaml?: string;
    reference_chunks?: ReferenceChunk[];
  }>(payload);

  if (!parsed.name?.trim() || !parsed.content_md?.trim()) {
    res.status(422).json({ error: 'Model could not extract a valid character from the supplied text.' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('characters')
    .insert({
      user_id: req.userId,
      name: parsed.name.trim(),
      content_md: parsed.content_md.trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
      voice_card_yaml: generateLayers ? String(parsed.voice_card_yaml || '').trim() || null : null,
      reference_chunks: generateLayers ? normalizeChunks(parsed.reference_chunks) : [],
      is_global: false,
      is_stock: false,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// POST /api/characters — create user character
charactersRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { name, content_md, tags } = req.body;
  if (!name || !content_md) { res.status(400).json({ error: 'name and content_md required' }); return; }

  const { data, error } = await supabaseAdmin
    .from('characters')
    .insert({ user_id: req.userId, name, content_md, tags: tags || [], is_global: false, is_stock: false })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

charactersRouter.post('/backfill-layers', async (req: AuthRequest, res: Response) => {
  const { limit = 10, provider, model, includeStock = false, onlyMissing = true } = req.body as {
    limit?: number;
    provider?: string;
    model?: string;
    includeStock?: boolean;
    onlyMissing?: boolean;
  };

  const visibilityFilter = includeStock
    ? `and(user_id.is.null,is_stock.eq.true),user_id.eq.${req.userId}`
    : `user_id.eq.${req.userId}`;

  const { data, error } = await supabaseAdmin
    .from('characters')
    .select('id, name, content_md, voice_card_yaml, reference_chunks, user_id, is_stock')
    .or(visibilityFilter)
    .order('updated_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 50)));
  if (error) { res.status(500).json({ error: error.message }); return; }

  const candidates = (data || []).filter((character) => {
    if (!character.content_md?.trim()) return false;
    if (!onlyMissing) return true;

    const hasVoiceCard = Boolean(character.voice_card_yaml?.trim());
    const hasChunks = Array.isArray(character.reference_chunks) && character.reference_chunks.length > 0;
    return !hasVoiceCard || !hasChunks;
  });
  let converted = 0;
  const failures: Array<{ id: string; name: string; error: string }> = [];

  for (const character of candidates) {
    try {
      const layers = await generateLayersForContent({
        userId: req.userId!,
        content: character.content_md,
        provider,
        model,
      });

      const { error: updateError } = await supabaseAdmin
        .from('characters')
        .update({
          voice_card_yaml: layers.voice_card_yaml || null,
          reference_chunks: layers.reference_chunks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', character.id);

      if (updateError) throw updateError;
      converted += 1;
    } catch (err) {
      failures.push({
        id: character.id,
        name: character.name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  res.json({ processed: candidates.length, converted, failures });
});

charactersRouter.post('/:id/generate-layers', async (req: AuthRequest, res: Response) => {
  const { provider, model } = req.body as { provider?: string; model?: string };

  const { data: character, error: fetchError } = await supabaseAdmin
    .from('characters')
    .select('id, name, content_md, user_id, is_stock')
    .eq('id', req.params.id)
    .or(`and(user_id.is.null,is_stock.eq.true),user_id.eq.${req.userId}`)
    .single();

  if (fetchError || !character) { res.status(404).json({ error: 'Character not found' }); return; }

  const layers = await generateLayersForContent({
    userId: req.userId!,
    content: character.content_md,
    provider,
    model,
  });

  const { data, error } = await supabaseAdmin
    .from('characters')
    .update({
      voice_card_yaml: layers.voice_card_yaml || null,
      reference_chunks: layers.reference_chunks,
      updated_at: new Date().toISOString(),
    })
    .eq('id', character.id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PATCH /api/characters/:id
charactersRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { name, content_md, tags } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === 'string') updates.name = name;
  if (typeof tags !== 'undefined') updates.tags = tags;
  if (typeof content_md === 'string') {
    updates.content_md = content_md;
    updates.voice_card_yaml = null;
    updates.reference_chunks = [];
  }

  const { data, error } = await supabaseAdmin
    .from('characters')
    .update(updates)
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
