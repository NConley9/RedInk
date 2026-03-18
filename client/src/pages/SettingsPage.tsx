import { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings.js';
import styles from './SettingsPage.module.css';

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  gemini: 'Google free-tier text models',
  groq: 'Fast hosted inference with generous free access',
  mistral: 'Mistral hosted API',
  openrouter: 'Free hosted model aggregator',
  lmstudio: 'Your local LM Studio endpoint',
};

export function SettingsPage() {
  const { settings, models, loading, error, reload, saveSettings, removeKey } = useSettings();
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [lmUrl, setLmUrl] = useState(settings?.lmstudio_base_url || 'http://localhost:1234/v1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.lmstudio_base_url) {
      setLmUrl(settings.lmstudio_base_url);
    }
  }, [settings?.lmstudio_base_url]);

  const saveProvider = async (provider: string) => {
    setSaving(true);
    try {
      await saveSettings({ api_keys: { [provider]: draftKeys[provider] || '' }, lmstudio_base_url: lmUrl });
      setDraftKeys((prev) => ({ ...prev, [provider]: '' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h1>Settings</h1>
          <p className={styles.subtitle}>One page for keys, models, and your local endpoint. No buried menus.</p>
        </div>
      </section>

      {loading && (
        <section className={styles.stateCard}>
          <div className="spinner" />
          <p>Loading provider settings...</p>
        </section>
      )}

      {!loading && error && (
        <section className={styles.stateCard}>
          <p>Could not load settings: {error}</p>
          <button className="btn btn-primary" onClick={() => void reload()}>Retry</button>
        </section>
      )}

      {!loading && !error && (
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Providers</div>
        <div className={styles.grid}>
          {Object.keys(models).map((provider) => {
            const configured = settings?.api_keys_configured?.includes(provider) || provider === 'lmstudio';
            return (
              <div key={provider} className={`card ${styles.card}`}>
                <div className={styles.cardTop}>
                  <div>
                    <h3>{provider}</h3>
                    <p>{PROVIDER_DESCRIPTIONS[provider] || 'Model provider'}</p>
                  </div>
                  <span className={configured ? styles.on : styles.off}>{configured ? 'Ready' : 'Missing key'}</span>
                </div>

                {provider === 'lmstudio' ? (
                  <>
                    <input className="input" value={lmUrl} onChange={(e) => setLmUrl(e.target.value)} placeholder="http://localhost:1234/v1" />
                    <button className="btn btn-primary" disabled={saving} onClick={() => void saveProvider('lmstudio')}>Save endpoint</button>
                  </>
                ) : (
                  <>
                    <input
                      className="input"
                      type="password"
                      value={draftKeys[provider] || ''}
                      onChange={(e) => setDraftKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                      placeholder={`Enter ${provider} API key`}
                    />
                    <div className={styles.cardActions}>
                      <button className="btn btn-primary" disabled={saving || !(draftKeys[provider] || '').trim()} onClick={() => void saveProvider(provider)}>
                        Save key
                      </button>
                      {settings?.api_keys_configured?.includes(provider) && (
                        <button className="btn btn-ghost" onClick={() => void removeKey(provider)}>Remove</button>
                      )}
                    </div>
                  </>
                )}

                <div className={styles.models}>
                  {(models[provider] || []).slice(0, 4).map((model) => (
                    <span key={model.id} className={styles.modelChip}>{model.label}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}
    </div>
  );
}