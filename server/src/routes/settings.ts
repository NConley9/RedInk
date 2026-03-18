import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

// GET /api/settings
settingsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { data } = await supabaseAdmin
    .from('user_settings')
    .select('model_configs, lmstudio_base_url, api_keys_configured')
    .eq('user_id', req.userId!)
    .single();

  // Never return raw api_keys — only return which providers are configured
  res.json(data || { model_configs: {}, lmstudio_base_url: '', api_keys_configured: [] });
});

// PUT /api/settings — upsert user settings
settingsRouter.put('/', async (req: AuthRequest, res: Response) => {
  const { api_keys, model_configs, lmstudio_base_url } = req.body;

  // Build api_keys_configured list (which providers have a key, without exposing the keys)
  const existingSettings = await supabaseAdmin
    .from('user_settings')
    .select('api_keys')
    .eq('user_id', req.userId!)
    .single();

  const currentKeys = (existingSettings.data?.api_keys as Record<string, string>) || {};
  const mergedKeys = { ...currentKeys, ...api_keys };
  const configuredList = Object.keys(mergedKeys).filter((k) => !!mergedKeys[k]);

  const { error } = await supabaseAdmin
    .from('user_settings')
    .upsert({
      user_id: req.userId,
      api_keys: mergedKeys,
      api_keys_configured: configuredList,
      model_configs: model_configs || {},
      lmstudio_base_url: lmstudio_base_url || '',
      updated_at: new Date().toISOString(),
    });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true, api_keys_configured: configuredList });
});

// DELETE /api/settings/key/:provider — remove a specific API key
settingsRouter.delete('/key/:provider', async (req: AuthRequest, res: Response) => {
  const provider = Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider;

  const { data } = await supabaseAdmin
    .from('user_settings')
    .select('api_keys')
    .eq('user_id', req.userId!)
    .single();

  const keys = (data?.api_keys as Record<string, string>) || {};
  delete keys[provider];

  const configuredList = Object.keys(keys).filter((k) => !!keys[k]);

  await supabaseAdmin
    .from('user_settings')
    .update({ api_keys: keys, api_keys_configured: configuredList })
    .eq('user_id', req.userId!);

  res.json({ success: true, api_keys_configured: configuredList });
});
