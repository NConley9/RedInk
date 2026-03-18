import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import type { UserSettings, ProviderModels } from '../types/index.js';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [models, setModels] = useState<ProviderModels>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, modelsData] = await Promise.all([
        apiFetch<UserSettings>('/api/settings'),
        apiFetch<ProviderModels>('/api/ai/models'),
      ]);
      setSettings(settingsData);
      setModels(modelsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (patch: {
    api_keys?: Record<string, string>;
    model_configs?: Record<string, { model: string; temperature?: number }>;
    lmstudio_base_url?: string;
  }) => {
    const result = await apiFetch<{ success: boolean; api_keys_configured: string[] }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            api_keys_configured: result.api_keys_configured,
            model_configs: patch.model_configs ?? prev.model_configs,
            lmstudio_base_url: patch.lmstudio_base_url ?? prev.lmstudio_base_url,
          }
        : null,
    );
  };

  const removeKey = async (provider: string) => {
    await apiFetch(`/api/settings/key/${provider}`, { method: 'DELETE' });
    setSettings((prev) =>
      prev
        ? { ...prev, api_keys_configured: prev.api_keys_configured.filter((p) => p !== provider) }
        : null,
    );
  };

  return { settings, models, loading, reload: load, saveSettings, removeKey };
}
