import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { invalidatePromptAssetsCache } from '../prompt/assets.js';

type ContentKind = 'prompt_asset' | 'character' | 'scenario';

const PROMPT_ASSET_KEYS = new Set([
  'instructions-nicks-erotica.md',
  'skill-dirty-talk.md',
  'skill-cumshot.md',
  'prompt-skills-to-perplexity.md',
]);

function parseNameFromFileName(fileName: string): string {
  return fileName.replace(/\.md$/i, '').trim();
}

function normalizeTags(kind: Exclude<ContentKind, 'prompt_asset'>, existingTags: string[] | null, isStock: boolean) {
  const base = kind === 'character' ? ['global', 'character'] : ['global', 'scenario'];
  const tags = new Set<string>([...base, ...((existingTags || []).filter(Boolean))]);
  if (isStock) tags.add('stock');
  return Array.from(tags);
}

export const contentRouter = Router();
contentRouter.use(requireAuth);

contentRouter.get('/assets', async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('key, source_filename, updated_at, updated_by')
    .order('key');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data || []);
});

contentRouter.post('/import', async (req: AuthRequest, res: Response) => {
  const { kind, fileName, content, assetKey } = req.body as {
    kind?: ContentKind;
    fileName?: string;
    content?: string;
    assetKey?: string;
  };

  if (!kind || !fileName || !content) {
    res.status(400).json({ error: 'kind, fileName, and content are required' });
    return;
  }

  if (!/\.md$/i.test(fileName)) {
    res.status(400).json({ error: 'Only .md uploads are supported' });
    return;
  }

  if (kind === 'prompt_asset') {
    const key = assetKey || fileName;
    if (!PROMPT_ASSET_KEYS.has(key)) {
      res.status(400).json({ error: 'Unsupported prompt asset key' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('content_assets')
      .upsert({
        key,
        content_md: content,
        source_filename: fileName,
        updated_by: req.userId,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    invalidatePromptAssetsCache();
    res.json({ success: true, kind, key, action: 'upserted' });
    return;
  }

  const table = kind === 'character' ? 'characters' : 'scenarios';
  const name = parseNameFromFileName(fileName);

  if (!name) {
    res.status(400).json({ error: 'Could not derive a name from the file name' });
    return;
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from(table)
    .select('id, tags, is_stock')
    .eq('name', name)
    .is('user_id', null)
    .maybeSingle();

  if (existingError) {
    res.status(500).json({ error: existingError.message });
    return;
  }

  const payload = {
    name,
    content_md: content,
    tags: normalizeTags(kind, existing?.tags || null, Boolean(existing?.is_stock)),
    is_global: true,
    is_stock: Boolean(existing?.is_stock),
    user_id: null,
    updated_at: new Date().toISOString(),
  };

  const query = existing?.id
    ? supabaseAdmin.from(table).update(payload).eq('id', existing.id).select('id').single()
    : supabaseAdmin.from(table).insert(payload).select('id').single();

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    success: true,
    kind,
    id: data?.id || existing?.id,
    name,
    action: existing?.id ? 'updated' : 'created',
  });
});