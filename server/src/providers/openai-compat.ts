// OpenAI-compatible adapter used for: LM Studio, OpenRouter
import OpenAI from 'openai';
import type { ProviderAdapter, ChatMessage, ProviderConfig } from './types.js';

export const openaiCompatAdapter: ProviderAdapter = {
  name: 'openai-compat',

  async stream(messages, systemPrompt, config, onToken, onDone, onError) {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey || 'not-required',
        baseURL: config.baseUrl || 'http://localhost:1234/v1',
      });

      const allMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      const stream = await client.chat.completions.create({
        model: config.model || 'local-model',
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
