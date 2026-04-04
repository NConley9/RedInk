import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import type { Character } from '../types/index.js';

type BackfillResponse = {
  processed: number;
  converted: number;
  failures: Array<{ id: string; name: string; error: string }>;
};

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Character[]>('/api/characters');
      setCharacters(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, content_md: string, tags: string[] = []) => {
    const c = await apiFetch<Character>('/api/characters', {
      method: 'POST',
      body: JSON.stringify({ name, content_md, tags }),
    });
    setCharacters((prev) => [...prev, c]);
    return c;
  };

  const update = async (id: string, patch: Partial<Pick<Character, 'name' | 'content_md' | 'tags'>>) => {
    const c = await apiFetch<Character>(`/api/characters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setCharacters((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/characters/${id}`, { method: 'DELETE' });
    setCharacters((prev) => prev.filter((x) => x.id !== id));
  };

  const createFromText = async (sourceText: string, generateLayers = true) => {
    const c = await apiFetch<Character>('/api/characters/from-text', {
      method: 'POST',
      body: JSON.stringify({ sourceText, generateLayers }),
    });
    setCharacters((prev) => [c, ...prev]);
    return c;
  };

  const generateLayers = async (id: string) => {
    const c = await apiFetch<Character>(`/api/characters/${id}/generate-layers`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setCharacters((prev) => prev.map((x) => (x.id === id ? c : x)));
    return c;
  };

  const backfillLayers = async (options: { limit?: number; includeStock?: boolean; onlyMissing?: boolean } = {}) => {
    const result = await apiFetch<BackfillResponse>('/api/characters/backfill-layers', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    await load();
    return result;
  };

  return { characters, loading, error, reload: load, create, update, remove, createFromText, generateLayers, backfillLayers };
}
