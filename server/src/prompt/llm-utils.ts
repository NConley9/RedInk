import { getProvider } from '../providers/index.js';

type ResolvedGenerationConfig = {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

const DEFAULT_MODEL_CANDIDATES: Array<{ provider: string; model: string }> = [
  { provider: 'gemini', model: 'gemini-2.0-flash' },
  { provider: 'openrouter', model: 'deepseek/deepseek-v3.2' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'mistral', model: 'mistral-small-latest' },
  { provider: 'lmstudio', model: 'local-model' },
];

export function resolveGenerationConfig(params: {
  apiKeys: Record<string, string>;
  lmstudioBaseUrl?: string | null;
  provider?: string | null;
  model?: string | null;
  baseUrl?: string | null;
}): ResolvedGenerationConfig {
  const preferredProvider = params.provider?.trim();
  const preferredModel = params.model?.trim();

  if (preferredProvider && preferredModel) {
    return {
      provider: preferredProvider,
      model: preferredModel,
      apiKey: params.apiKeys[preferredProvider],
      baseUrl: preferredProvider === 'lmstudio'
        ? params.lmstudioBaseUrl || params.baseUrl || 'http://localhost:1234/v1'
        : preferredProvider === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : params.baseUrl || undefined,
    };
  }

  for (const candidate of DEFAULT_MODEL_CANDIDATES) {
    if (candidate.provider === 'lmstudio' && params.lmstudioBaseUrl) {
      return { provider: candidate.provider, model: candidate.model, baseUrl: params.lmstudioBaseUrl };
    }

    if (params.apiKeys[candidate.provider]) {
      return {
        provider: candidate.provider,
        model: candidate.model,
        apiKey: params.apiKeys[candidate.provider],
        baseUrl: candidate.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined,
      };
    }
  }

  throw new Error('No configured model is available for layer generation. Add an API key or configure LM Studio.');
}

export async function runTextGeneration(params: {
  systemPrompt: string;
  userPrompt: string;
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}): Promise<string> {
  const adapter = getProvider(params.provider);
  let output = '';

  await new Promise<void>((resolve, reject) => {
    void adapter.stream(
      [{ role: 'user', content: params.userPrompt }],
      params.systemPrompt,
      {
        apiKey: params.apiKey,
        model: params.model,
        baseUrl: params.baseUrl,
      },
      (token) => {
        output += token;
      },
      () => resolve(),
      (err) => reject(err),
    ).catch(reject);
  });

  return output.trim();
}

export function parseJsonPayload<T>(text: string): T {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  const candidates = [cleaned];
  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
    candidates.push(cleaned.slice(firstObject, lastObject + 1));
  }

  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');
  if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
    candidates.push(cleaned.slice(firstArray, lastArray + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Keep trying candidates.
    }
  }

  throw new Error('Model output was not valid JSON.');
}
