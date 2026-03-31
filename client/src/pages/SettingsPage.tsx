import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useSettings } from '../hooks/useSettings.js';
import type { ContentAssetSummary } from '../types/index.js';
import styles from './SettingsPage.module.css';

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  gemini: 'Google free-tier text models',
  groq: 'Fast hosted inference with generous free access',
  mistral: 'Mistral hosted API',
  openrouter: 'Free hosted model aggregator',
  lmstudio: 'Your local LM Studio endpoint',
};

const PROVIDER_DASHBOARD_LINKS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/',
  openrouter: 'https://openrouter.ai/keys',
  lmstudio: 'http://localhost:1234/',
};

export function SettingsPage() {
  const { settings, models, loading, error, reload, saveSettings, removeKey } = useSettings();
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [lmUrl, setLmUrl] = useState(settings?.lmstudio_base_url || 'http://localhost:1234/v1');
  const [saving, setSaving] = useState(false);
  const [contentAssets, setContentAssets] = useState<ContentAssetSummary[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [promptAssetKey, setPromptAssetKey] = useState('instructions-nicks-erotica.md');
  const [promptFile, setPromptFile] = useState<File | null>(null);
  const [characterFile, setCharacterFile] = useState<File | null>(null);
  const [scenarioFile, setScenarioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.lmstudio_base_url) {
      setLmUrl(settings.lmstudio_base_url);
    }
  }, [settings?.lmstudio_base_url]);

  useEffect(() => {
    const loadContentAssets = async () => {
      setContentLoading(true);
      setContentError(null);
      try {
        const data = await apiFetch<ContentAssetSummary[]>('/api/content/assets');
        setContentAssets(data);
      } catch (e) {
        setContentError((e as Error).message || 'Failed to load content assets.');
      } finally {
        setContentLoading(false);
      }
    };

    void loadContentAssets();
  }, []);

  const saveProvider = async (provider: string) => {
    setSaving(true);
    try {
      await saveSettings({ api_keys: { [provider]: draftKeys[provider] || '' }, lmstudio_base_url: lmUrl });
      setDraftKeys((prev) => ({ ...prev, [provider]: '' }));
    } finally {
      setSaving(false);
    }
  };

  const uploadMarkdown = async (kind: 'prompt_asset' | 'character' | 'scenario', file: File | null, assetKey?: string) => {
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const content = await file.text();
      const result = await apiFetch<{ success: boolean; action?: string; key?: string; name?: string }>('/api/content/import', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          fileName: file.name,
          content,
          assetKey,
        }),
      });

      if (kind === 'prompt_asset') {
        const refreshed = await apiFetch<ContentAssetSummary[]>('/api/content/assets');
        setContentAssets(refreshed);
      }

      setUploadMessage(
        kind === 'prompt_asset'
          ? `Uploaded ${file.name} to ${assetKey || result.key}.`
          : `Imported ${file.name} as ${result.name || file.name}.`,
      );

      if (kind === 'prompt_asset') setPromptFile(null);
      if (kind === 'character') setCharacterFile(null);
      if (kind === 'scenario') setScenarioFile(null);
    } catch (e) {
      setUploadMessage((e as Error).message || 'Upload failed.');
    } finally {
      setUploading(false);
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
      <>
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

                  <a
                    href={PROVIDER_DASHBOARD_LINKS[provider]}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.dashboardLink}
                  >
                    Open Dashboard ↗
                  </a>

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

        <section className={styles.section}>
          <div className={styles.sectionTitle}>Content Uploads</div>
          <div className={styles.uploadIntro}>
            <p>Upload raw markdown here to make it live without editing database rows by hand.</p>
            <p>Prompt assets are stored persistently in Supabase. Character and scenario uploads update the matching global entry using the file name.</p>
          </div>

          {uploadMessage && (
            <div className={styles.uploadStatus}>{uploadMessage}</div>
          )}

          <div className={styles.uploadGrid}>
            <div className={`card ${styles.card}`}>
              <div className={styles.cardTop}>
                <div>
                  <h3>Prompt Assets</h3>
                  <p>Instructions and skill markdown used by the live prompt builder.</p>
                </div>
              </div>
              <select className="input" value={promptAssetKey} onChange={(e) => setPromptAssetKey(e.target.value)}>
                <option value="instructions-nicks-erotica.md">instructions-nicks-erotica.md</option>
                <option value="skill-dirty-talk.md">skill-dirty-talk.md</option>
                <option value="skill-cumshot.md">skill-cumshot.md</option>
                <option value="prompt-skills-to-perplexity.md">prompt-skills-to-perplexity.md</option>
              </select>
              <input className="input" type="file" accept=".md,text/markdown" onChange={(e) => setPromptFile(e.target.files?.[0] || null)} />
              <button className="btn btn-primary" disabled={uploading || !promptFile} onClick={() => void uploadMarkdown('prompt_asset', promptFile, promptAssetKey)}>
                {uploading ? 'Uploading…' : 'Upload prompt file'}
              </button>

              {contentLoading ? (
                <p className={styles.smallNote}>Loading current prompt assets…</p>
              ) : contentError ? (
                <p className={styles.smallError}>Failed to load prompt assets: {contentError}</p>
              ) : (
                <div className={styles.assetList}>
                  {contentAssets.map((asset) => (
                    <div key={asset.key} className={styles.assetRow}>
                      <strong>{asset.key}</strong>
                      <span>{asset.source_filename || 'No upload yet'}</span>
                      <span>{new Date(asset.updated_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`card ${styles.card}`}>
              <div className={styles.cardTop}>
                <div>
                  <h3>Global Character</h3>
                  <p>Upload a `.md` file. The file name becomes the global character name.</p>
                </div>
              </div>
              <input className="input" type="file" accept=".md,text/markdown" onChange={(e) => setCharacterFile(e.target.files?.[0] || null)} />
              <button className="btn btn-primary" disabled={uploading || !characterFile} onClick={() => void uploadMarkdown('character', characterFile)}>
                {uploading ? 'Uploading…' : 'Upload character'}
              </button>
              <p className={styles.smallNote}>Example: uploading `Jessica.md` updates or creates the global character named Jessica.</p>
            </div>

            <div className={`card ${styles.card}`}>
              <div className={styles.cardTop}>
                <div>
                  <h3>Global Scenario</h3>
                  <p>Upload a `.md` file. The file name becomes the global scenario name.</p>
                </div>
              </div>
              <input className="input" type="file" accept=".md,text/markdown" onChange={(e) => setScenarioFile(e.target.files?.[0] || null)} />
              <button className="btn btn-primary" disabled={uploading || !scenarioFile} onClick={() => void uploadMarkdown('scenario', scenarioFile)}>
                {uploading ? 'Uploading…' : 'Upload scenario'}
              </button>
              <p className={styles.smallNote}>This updates the shared global library entry, not a private user copy.</p>
            </div>
          </div>
        </section>
      </>
      )}
    </div>
  );
}