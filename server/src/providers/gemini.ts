import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ProviderAdapter, ChatMessage, ProviderConfig } from './types.js';

export const geminiAdapter: ProviderAdapter = {
  name: 'gemini',

  async stream(messages, systemPrompt, config, onToken, onDone, onError) {
    try {
      const genAI = new GoogleGenerativeAI(config.apiKey!);
      const model = genAI.getGenerativeModel({
        model: config.model || 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: config.temperature ?? 1.0,
          maxOutputTokens: config.maxTokens ?? 4096,
        },
      });

      // Convert messages to Gemini format (no system role)
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const lastMessage = messages[messages.length - 1];
      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastMessage.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) onToken(text);
      }
      onDone();
    } catch (err) {
      onError(err as Error);
    }
  },
};
