import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import type { Character } from '../types/index.js';

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

  return { characters, loading, error, reload: load, create, update, remove };
}
