import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import type { Scenario } from '../types/index.js';

export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Scenario[]>('/api/scenarios');
      setScenarios(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, content_md: string, tags: string[] = []) => {
    const s = await apiFetch<Scenario>('/api/scenarios', {
      method: 'POST',
      body: JSON.stringify({ name, content_md, tags }),
    });
    setScenarios((prev) => [...prev, s]);
    return s;
  };

  const update = async (id: string, patch: Partial<Pick<Scenario, 'name' | 'content_md' | 'tags'>>) => {
    const s = await apiFetch<Scenario>(`/api/scenarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setScenarios((prev) => prev.map((x) => (x.id === id ? s : x)));
    return s;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    setScenarios((prev) => prev.filter((x) => x.id !== id));
  };

  return { scenarios, loading, error, reload: load, create, update, remove };
}
