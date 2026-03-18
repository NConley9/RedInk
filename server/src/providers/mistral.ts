import OpenAI from 'openai';
import type { ProviderAdapter, ChatMessage, ProviderConfig } from './types.js';

export const mistralAdapter: ProviderAdapter = {
  name: 'mistral',

  async stream(messages, systemPrompt, config, onToken, onDone, onError) {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: 'https://api.mistral.ai/v1',
      });

      const allMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const stream = await client.chat.completions.create({
        model: config.model || 'mistral-small-latest',
        messages: allMessages,
        temperature: config.temperature ?? 1.0,
        max_tokens: config.maxTokens ?? 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) onToken(token);
      }
      onDone();
    } catch (err) {
      onError(err as Error);
    }
  },
};
