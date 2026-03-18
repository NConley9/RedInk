import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getProvider, PROVIDER_MODELS } from '../providers/index.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';

export const aiRouter = Router();

aiRouter.use(requireAuth);

// GET /api/ai/models — return provider/model registry
aiRouter.get('/models', (_req, res) => {
  res.json(PROVIDER_MODELS);
});

// POST /api/ai/chat — stream AI response
aiRouter.post('/chat', async (req: AuthRequest, res: Response) => {
  const { provider, model, messages, systemPrompt, baseUrl } = req.body as {
    provider: string;
    model: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt: string;
    baseUrl?: string;
  };

  if (!provider || !model || !messages || !systemPrompt) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Retrieve user API key from DB
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('api_keys, lmstudio_base_url')
    .eq('user_id', req.userId!)
    .single();

  const apiKeys = (settings?.api_keys as Record<string, string>) || {};
  const apiKey = apiKeys[provider];

  const resolvedBaseUrl =
    provider === 'lmstudio'
      ? (settings?.lmstudio_base_url as string | undefined) || baseUrl || 'http://localhost:1234/v1'
      : provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1'
      : undefined;

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: string) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify({ content: data })}\n\n`);
  };

  try {
    const adapter = getProvider(provider);
    await adapter.stream(
      messages,
      systemPrompt,
      { apiKey, model, baseUrl: resolvedBaseUrl },
      (token) => send('token', token),
      () => {
        res.write('event: done\ndata: {}\n\n');
        res.end();
      },
      (err) => {
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
        res.end();
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`);
    res.end();
  }
});
