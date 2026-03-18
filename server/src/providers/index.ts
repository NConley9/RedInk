import { geminiAdapter } from './gemini.js';
import { groqAdapter } from './groq.js';
import { mistralAdapter } from './mistral.js';
import { openaiCompatAdapter } from './openai-compat.js';
import type { ProviderAdapter } from './types.js';

export const PROVIDER_REGISTRY: Record<string, ProviderAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  mistral: mistralAdapter,
  lmstudio: openaiCompatAdapter,
  openrouter: openaiCompatAdapter,
};

export function getProvider(name: string): ProviderAdapter {
  const adapter = PROVIDER_REGISTRY[name];
  if (!adapter) throw new Error(`Unknown provider: ${name}`);
  return adapter;
}

export const PROVIDER_MODELS: Record<string, Array<{ id: string; label: string; free: boolean }>> = {
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', free: true },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', free: true },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', free: true },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', free: true },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq)', free: true },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq)', free: true },
  ],
  mistral: [
    { id: 'mistral-small-latest', label: 'Mistral Small', free: true },
    { id: 'mistral-medium-latest', label: 'Mistral Medium', free: false },
    { id: 'mistral-large-latest', label: 'Mistral Large', free: false },
  ],
  lmstudio: [
    { id: 'local-model', label: 'Local Model (auto-detect)', free: true },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)', free: true },
    { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (free)', free: true },
    { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)', free: true },
    { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)', free: true },
  ],
};

export { type ProviderAdapter } from './types.js';
