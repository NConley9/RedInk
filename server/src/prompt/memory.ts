import { supabaseAdmin } from '../lib/supabase-admin.js';
import { buildMemoryChunkPrompt, GENERATION_SYSTEM_PROMPT } from './voice-card-prompt.js';
import { parseJsonPayload, resolveGenerationConfigs, runTextGenerationWithFallback } from './llm-utils.js';
import type { ReferenceChunk } from './types.js';

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

export function shouldGenerateMemoryChunks(messageCount: number, memoryCursorMessageCount: number): boolean {
  return messageCount - memoryCursorMessageCount >= 20;
}

export function mergeMemoryChunks(existing: ReferenceChunk[], incoming: ReferenceChunk[]): ReferenceChunk[] {
  const merged = new Map<string, ReferenceChunk>();

  for (const chunk of existing) {
    merged.set(chunk.id, chunk);
  }

  for (const chunk of incoming) {
    merged.set(chunk.id, chunk);
  }

  return Array.from(merged.values()).slice(-20);
}

export async function maybeRefreshChatMemoryChunks(params: {
  chatId: string;
  userId: string;
  provider: string;
  model: string;
}): Promise<void> {
  const [{ data: chat, error: chatError }, { data: settings }] = await Promise.all([
    supabaseAdmin
      .from('chats')
      .select('id, memory_chunks, memory_cursor_message_count, model_provider, model_name')
      .eq('id', params.chatId)
      .eq('user_id', params.userId)
      .single(),
    supabaseAdmin
      .from('user_settings')
      .select('api_keys, lmstudio_base_url')
      .eq('user_id', params.userId)
      .single(),
  ]);

  if (chatError || !chat) return;

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from('messages')
    .select('role, content, created_at')
    .eq('chat_id', params.chatId)
    .order('created_at', { ascending: true });

  if (messagesError || !messages) return;

  if (!shouldGenerateMemoryChunks(messages.length, chat.memory_cursor_message_count || 0)) {
    return;
  }

  const recentMessages = messages.slice(chat.memory_cursor_message_count || 0);
  const existingMemoryChunks = normalizeChunks(chat.memory_chunks);
  const apiKeys = (settings?.api_keys as Record<string, string>) || {};

  let configs;
  try {
    configs = resolveGenerationConfigs({
      apiKeys,
      lmstudioBaseUrl: settings?.lmstudio_base_url as string | null | undefined,
      provider: params.provider || chat.model_provider,
      model: params.model || chat.model_name,
    });
  } catch {
    return;
  }

  const { text: payload } = await runTextGenerationWithFallback({
    systemPrompt: GENERATION_SYSTEM_PROMPT,
    userPrompt: buildMemoryChunkPrompt(
      recentMessages.map((message) => `${message.role}: ${message.content}`).join('\n'),
      JSON.stringify(existingMemoryChunks, null, 2),
    ),
    configs,
  });

  const parsed = parseJsonPayload<{ memory_chunks?: ReferenceChunk[] }>(payload);
  const merged = mergeMemoryChunks(existingMemoryChunks, normalizeChunks(parsed.memory_chunks));

  await supabaseAdmin
    .from('chats')
    .update({
      memory_chunks: merged,
      memory_cursor_message_count: messages.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.chatId)
    .eq('user_id', params.userId);
}
