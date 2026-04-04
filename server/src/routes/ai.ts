import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getProvider, PROVIDER_MODELS } from '../providers/index.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import type { Response } from 'express';
import { buildServerSystemPrompt } from '../prompt/system-prompt.js';
import { discoverModelsFromApiKeys, mergeDiscoveredModels } from '../providers/discovery.js';
import type { PromptCharacterContext, ReferenceChunk } from '../prompt/types.js';

export const aiRouter = Router();

aiRouter.use(requireAuth);

// GET /api/ai/models — return provider/model registry
aiRouter.get('/models', async (req: AuthRequest, res: Response) => {
  const { data: settings } = await supabaseAdmin
    .from('user_settings')
    .select('api_keys')
    .eq('user_id', req.userId!)
    .single();

  const apiKeys = (settings?.api_keys as Record<string, string>) || {};
  const discovered = await discoverModelsFromApiKeys(apiKeys);
  const merged = mergeDiscoveredModels(PROVIDER_MODELS, discovered);

  res.json(merged);
});

// POST /api/ai/chat — stream AI response
aiRouter.post('/chat', async (req: AuthRequest, res: Response) => {
  const {
    provider,
    model,
    messages,
    systemPrompt,
    baseUrl,
    chatId,
    mode,
    personaCharacter,
    loveInterestCharacter,
    characterContent,
    scenarioContent,
  } = req.body as {
    provider: string;
    model: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
    baseUrl?: string;
    chatId?: string;
    mode?: 'long_form' | 'role_play' | 'sexting' | 'texting';
    personaCharacter?: PromptCharacterContext | null;
    loveInterestCharacter?: PromptCharacterContext | null;
    characterContent?: string;
    scenarioContent?: string;
  };

  if (!provider || !model || !messages) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  let memoryChunks: ReferenceChunk[] = [];
  if (chatId) {
    const { data: chatData } = await supabaseAdmin
      .from('chats')
      .select('memory_chunks')
      .eq('id', chatId)
      .eq('user_id', req.userId!)
      .single();

    memoryChunks = Array.isArray(chatData?.memory_chunks) ? chatData.memory_chunks as ReferenceChunk[] : [];
  }

  const { prompt: resolvedSystemPrompt, appliedSkills } = await buildServerSystemPrompt({
    mode,
    personaCharacter: personaCharacter || null,
    loveInterestCharacter: loveInterestCharacter || (characterContent
      ? { name: 'Character', content_md: characterContent, reference_chunks: [], voice_card_yaml: null }
      : null),
    scenarioContent: scenarioContent || null,
    memoryChunks,
    messages,
    fallbackSystemPrompt: systemPrompt,
  });

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

    // Expose auto-selected skill metadata to client for observability.
    res.write(`event: meta\ndata: ${JSON.stringify({ appliedSkills })}\n\n`);

    await adapter.stream(
      messages,
      resolvedSystemPrompt,
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
