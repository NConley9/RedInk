import { geminiAdapter } from './gemini.js';
import { groqAdapter } from './groq.js';
import { mistralAdapter } from './mistral.js';
import { openaiCompatAdapter } from './openai-compat.js';
import type { ProviderAdapter } from './types.js';

type Mode = 'long_form' | 'role_play' | 'sexting';

type ProviderModelOption = {
  id: string;
  label: string;
  free: boolean;
  recommended_modes?: Mode[];
  input_token_soft_limit?: number;
  notes?: string;
};

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

export const PROVIDER_MODELS: Record<string, ProviderModelOption[]> = {
  gemini: [
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      free: true,
      recommended_modes: ['role_play', 'sexting'],
      input_token_soft_limit: 24000,
      notes: 'Fast and balanced for conversational scenes.',
    },
    {
      id: 'gemini-2.0-flash-lite',
      label: 'Gemini 2.0 Flash Lite',
      free: true,
      recommended_modes: ['sexting'],
      input_token_soft_limit: 16000,
      notes: 'Lower cost and latency, better for shorter turns.',
    },
    {
      id: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      free: true,
      recommended_modes: ['role_play'],
      input_token_soft_limit: 22000,
      notes: 'Stable compatibility option for broad Gemini availability.',
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B (Groq)',
      free: true,
      recommended_modes: ['role_play'],
      input_token_soft_limit: 12000,
      notes: 'Strong quality, but sensitive to oversized prompts on free tier.',
    },
    {
      id: 'llama-3.1-8b-instant',
      label: 'Llama 3.1 8B Instant (Groq)',
      free: true,
      recommended_modes: ['sexting'],
      input_token_soft_limit: 10000,
      notes: 'Very fast for short interactive turns.',
    },
    {
      id: 'mixtral-8x7b-32768',
      label: 'Mixtral 8x7B (Groq)',
      free: true,
      recommended_modes: ['long_form'],
      input_token_soft_limit: 14000,
      notes: 'More tolerant for story context than smaller Groq options.',
    },
  ],
  mistral: [
    {
      id: 'mistral-small-latest',
      label: 'Mistral Small',
      free: true,
      recommended_modes: ['role_play', 'sexting'],
      input_token_soft_limit: 20000,
      notes: 'Reliable default for mixed workloads.',
    },
    {
      id: 'mistral-medium-latest',
      label: 'Mistral Medium',
      free: false,
      recommended_modes: ['long_form'],
      input_token_soft_limit: 26000,
      notes: 'Better narrative quality with larger context windows.',
    },
    {
      id: 'mistral-large-latest',
      label: 'Mistral Large',
      free: false,
      recommended_modes: ['long_form'],
      input_token_soft_limit: 32000,
      notes: 'Best option for dense context and continuity.',
    },
  ],
  lmstudio: [
    {
      id: 'local-model',
      label: 'Local Model (auto-detect)',
      free: true,
      recommended_modes: ['long_form', 'role_play', 'sexting'],
      input_token_soft_limit: 48000,
      notes: 'Depends on your local model and hardware limits.',
    },
  ],
  openrouter: [
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      label: 'Llama 3.3 70B (free)',
      free: true,
      recommended_modes: ['role_play'],
      input_token_soft_limit: 14000,
      notes: 'Good prose quality, watch prompt size on free route.',
    },
    {
      id: 'mistralai/mistral-7b-instruct:free',
      label: 'Mistral 7B (free)',
      free: true,
      recommended_modes: ['sexting'],
      input_token_soft_limit: 12000,
      notes: 'Better for concise exchanges than heavy context.',
    },
    {
      id: 'google/gemma-3-27b-it:free',
      label: 'Gemma 3 27B (free)',
      free: true,
      recommended_modes: ['long_form'],
      input_token_soft_limit: 18000,
      notes: 'Solid long-form quality in free tier.',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      label: 'DeepSeek R1 (free)',
      free: true,
      recommended_modes: ['long_form'],
      input_token_soft_limit: 20000,
      notes: 'Useful for larger context and structured reasoning.',
    },
  ],
};

export { type ProviderAdapter } from './types.js';
