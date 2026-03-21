import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(`Network error calling ${path}: ${(e as Error).message}`);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status} for ${path}`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) message = body.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiStream(
  path: string,
  body: object,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders as Record<string, string>),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as { content?: string; message?: string };
          if (currentEvent === 'token' && data.content) onToken(data.content);
          else if (currentEvent === 'error') onError(data.message || 'Unknown error');
          else if (currentEvent === 'done') onDone();
        } catch { /* malformed event */ }
      }
    }
  }
}
