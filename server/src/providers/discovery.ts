import type { ProviderModelOption } from './index.js';

type ProviderName = 'gemini' | 'groq' | 'mistral' | 'openrouter';

type DiscoveryCacheEntry = {
  expiresAt: number;
  models: ProviderModelOption[];
};

const DISCOVERY_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

function cacheKey(provider: ProviderName, apiKey: string): string {
  const last = apiKey.slice(-8);
  return `${provider}:${last}`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function normalizeGeminiModelName(name: string): string {
  return name.startsWith('models/') ? name.slice('models/'.length) : name;
}

function dedupeById(models: ProviderModelOption[]): ProviderModelOption[] {
  const seen = new Set<string>();
  const out: ProviderModelOption[] = [];
  for (const model of models) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    out.push(model);
  }
  return out;
}

async function discoverGemini(apiKey: string): Promise<ProviderModelOption[]> {
  const data = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  const rows = Array.isArray(data?.models) ? data.models : [];
  const mapped = rows
    .filter((m: any) => {
      const methods = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
      return methods.includes('generateContent') || methods.includes('streamGenerateContent');
    })
    .map((m: any) => {
      const id = normalizeGeminiModelName(String(m?.name || ''));
      const label = String(m?.displayName || id);
      return {
        id,
        label,
        free: true,
        notes: 'Auto-discovered from Gemini API.',
      } as ProviderModelOption;
    })
    .filter((m: ProviderModelOption) => m.id.startsWith('gemini-'));

  return dedupeById(mapped).sort((a, b) => a.label.localeCompare(b.label));
}

async function discoverGroq(apiKey: string): Promise<ProviderModelOption[]> {
  const data = await fetchJson('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const mapped = rows
    .map((m: any) => ({
      id: String(m?.id || ''),
      label: String(m?.id || ''),
      free: true,
      notes: 'Auto-discovered from Groq API.',
    } as ProviderModelOption))
    .filter((m: ProviderModelOption) => !!m.id);

  return dedupeById(mapped).sort((a, b) => a.label.localeCompare(b.label));
}

async function discoverMistral(apiKey: string): Promise<ProviderModelOption[]> {
  const data = await fetchJson('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const mapped = rows
    .map((m: any) => ({
      id: String(m?.id || ''),
      label: String(m?.id || ''),
      free: false,
      notes: 'Auto-discovered from Mistral API.',
    } as ProviderModelOption))
    .filter((m: ProviderModelOption) => !!m.id);

  return dedupeById(mapped).sort((a, b) => a.label.localeCompare(b.label));
}

async function discoverOpenRouter(apiKey: string): Promise<ProviderModelOption[]> {
  const data = await fetchJson('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.CLIENT_URL || 'https://red-ink-client.onrender.com',
      'X-Title': 'Red Ink',
    },
  });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const mapped = rows
    .map((m: any) => ({
      id: String(m?.id || ''),
      label: String(m?.name || m?.id || ''),
      free: /:free$/i.test(String(m?.id || '')),
      notes: 'Auto-discovered from OpenRouter API.',
    } as ProviderModelOption))
    .filter((m: ProviderModelOption) => !!m.id);

  return dedupeById(mapped).sort((a, b) => a.label.localeCompare(b.label));
}

async function discoverProvider(provider: ProviderName, apiKey: string): Promise<ProviderModelOption[]> {
  const key = cacheKey(provider, apiKey);
  const cached = discoveryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.models;

  let models: ProviderModelOption[] = [];
  if (provider === 'gemini') models = await discoverGemini(apiKey);
  if (provider === 'groq') models = await discoverGroq(apiKey);
  if (provider === 'mistral') models = await discoverMistral(apiKey);
  if (provider === 'openrouter') models = await discoverOpenRouter(apiKey);

  discoveryCache.set(key, { models, expiresAt: Date.now() + DISCOVERY_TTL_MS });
  return models;
}

export async function discoverModelsFromApiKeys(apiKeys: Record<string, string>): Promise<Partial<Record<ProviderName, ProviderModelOption[]>>> {
  const providers: ProviderName[] = ['gemini', 'groq', 'mistral', 'openrouter'];
  const out: Partial<Record<ProviderName, ProviderModelOption[]>> = {};

  await Promise.all(providers.map(async (provider) => {
    const apiKey = apiKeys[provider];
    if (!apiKey) return;
    try {
      out[provider] = await discoverProvider(provider, apiKey);
    } catch {
      // Silent fallback: discovery is best-effort and should not break model listing.
    }
  }));

  return out;
}

export function mergeDiscoveredModels(
  curated: Record<string, ProviderModelOption[]>,
  discovered: Partial<Record<ProviderName, ProviderModelOption[]>>,
): Record<string, ProviderModelOption[]> {
  const merged: Record<string, ProviderModelOption[]> = {};

  for (const [provider, curatedList] of Object.entries(curated)) {
    const discoveredList = discovered[provider as ProviderName] || [];
    const curatedIds = new Set(curatedList.map((m) => m.id));
    const extras = discoveredList.filter((m) => !curatedIds.has(m.id));
    merged[provider] = [...curatedList, ...extras];
  }

  return merged;
}
