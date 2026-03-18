import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mode, Character, Scenario, NewChatConfig } from '../../types/index.js';
import { useCharacters } from '../../hooks/useCharacters.js';
import { useScenarios } from '../../hooks/useScenarios.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useChats } from '../../hooks/useChats.js';
import styles from './NewChatWizard.module.css';

type Step = 'mode' | 'character' | 'scenario' | 'model';

const MODE_OPTIONS: Array<{ id: Mode; label: string; description: string; icon: string }> = [
  { id: 'long_form', label: 'Long Form', description: 'Full chapters, extended narrative, cinematic storytelling', icon: '📖' },
  { id: 'role_play', label: 'Role Play', description: 'Collaborative back-and-forth, immersive scenes', icon: '🎭' },
  { id: 'sexting', label: 'Sexting', description: 'First-person text-style with image generation', icon: '💬' },
];

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
  mistral: 'Mistral',
  lmstudio: 'LM Studio (Local)',
  openrouter: 'OpenRouter',
};

interface Props {
  onClose: () => void;
}

export function NewChatWizard({ onClose }: Props) {
  const navigate = useNavigate();
  const { characters, loading: charsLoading } = useCharacters();
  const { scenarios, loading: scenLoading } = useScenarios();
  const { models, settings } = useSettings();
  const { createChat } = useChats();

  const [step, setStep] = useState<Step>('mode');
  const [config, setConfig] = useState<Partial<NewChatConfig>>({});
  const [creating, setCreating] = useState(false);

  const configuredProviders = settings?.api_keys_configured || [];

  const allProviders = Object.keys(models);
  const availableProviders = allProviders.filter(
    (p) => p === 'lmstudio' || configuredProviders.includes(p),
  );

  const steps: Step[] = ['mode', 'character', 'scenario', 'model'];
  const stepIndex = steps.indexOf(step);

  const goBack = () => {
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  };

  const handleModeSelect = (mode: Mode) => {
    setConfig((c) => ({ ...c, mode }));
    setStep('character');
  };

  const handleCharacterSelect = (character: Character | null) => {
    setConfig((c) => ({ ...c, character }));
    setStep('scenario');
  };

  const handleScenarioSelect = (scenario: Scenario | null) => {
    setConfig((c) => ({ ...c, scenario }));
    setStep('model');
  };

  const handleModelSelect = async (provider: string, model: string) => {
    const finalConfig = { ...config, provider, model } as NewChatConfig;
    setCreating(true);
    try {
      const chat = await createChat(finalConfig);
      onClose();
      navigate(`/chat/${chat.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.stepIndicator}>
            {steps.map((s, i) => (
              <div
                key={s}
                className={`${styles.stepDot} ${i === stepIndex ? styles.stepDotActive : ''} ${i < stepIndex ? styles.stepDotDone : ''}`}
              />
            ))}
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Step: Mode */}
        {step === 'mode' && (
          <div className={styles.stepContent}>
            <h2 className="text-display">Choose a mode</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>How do you want to write today?</p>
            <div className={styles.modeGrid}>
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  className={`card ${styles.modeCard}`}
                  onClick={() => handleModeSelect(m.id)}
                >
                  <span className={styles.modeIcon}>{m.icon}</span>
                  <strong className={styles.modeLabel}>{m.label}</strong>
                  <p className={styles.modeDesc}>{m.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Character */}
        {step === 'character' && (
          <div className={styles.stepContent}>
            <div className={styles.stepNav}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={goBack}>← Back</button>
            </div>
            <h2 className="text-display">Choose a character</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>Optional — skip to use a free-form character</p>
            {charsLoading ? (
              <div className={styles.loading}><div className="spinner" /></div>
            ) : (
              <div className={styles.itemGrid}>
                <button className={`card ${styles.skipCard}`} onClick={() => handleCharacterSelect(null)}>
                  <span>No character</span>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Free-form, no character context</p>
                </button>
                {characters.map((c) => (
                  <button key={c.id} className={`card ${styles.itemCard}`} onClick={() => handleCharacterSelect(c)}>
                    <div className={styles.itemCardInner}>
                      <div className={styles.itemAvatar}>{c.name[0].toUpperCase()}</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                        {c.is_global && <span className={styles.globalBadge}>Global</span>}
                        <p className="text-muted truncate" style={{ fontSize: '0.78rem', marginTop: 2, maxWidth: 220 }}>
                          {c.content_md.slice(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Scenario */}
        {step === 'scenario' && (
          <div className={styles.stepContent}>
            <div className={styles.stepNav}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={goBack}>← Back</button>
            </div>
            <h2 className="text-display">Choose a scenario</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>Optional — sets the story context</p>
            {scenLoading ? (
              <div className={styles.loading}><div className="spinner" /></div>
            ) : (
              <div className={styles.itemGrid}>
                <button className={`card ${styles.skipCard}`} onClick={() => handleScenarioSelect(null)}>
                  <span>No scenario</span>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Open-ended, no preset context</p>
                </button>
                {scenarios.map((s) => (
                  <button key={s.id} className={`card ${styles.itemCard}`} onClick={() => handleScenarioSelect(s)}>
                    <div className={styles.itemCardInner}>
                      <div className={styles.itemAvatar} style={{ background: 'rgba(124,111,160,0.2)', color: 'var(--mode-longform)' }}>✦</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{s.name}</strong>
                        {s.is_global && <span className={styles.globalBadge}>Global</span>}
                        <p className="text-muted truncate" style={{ fontSize: '0.78rem', marginTop: 2, maxWidth: 220 }}>
                          {s.content_md.slice(0, 80)}...
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Model */}
        {step === 'model' && (
          <div className={styles.stepContent}>
            <div className={styles.stepNav}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={goBack}>← Back</button>
            </div>
            <h2 className="text-display">Choose a model</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>
              {availableProviders.length === 0
                ? 'No API keys configured. Add them in Settings first.'
                : 'Select the AI model for this chat'}
            </p>

            {availableProviders.length === 0 ? (
              <div className={styles.noProviders}>
                <button className="btn btn-primary" onClick={() => { onClose(); navigate('/settings'); }}>
                  Go to Settings
                </button>
              </div>
            ) : (
              <div className={styles.providerList}>
                {availableProviders.map((provider) => (
                  <div key={provider} className={styles.providerGroup}>
                    <div className={styles.providerLabel}>{PROVIDER_LABELS[provider] || provider}</div>
                    <div className={styles.modelGrid}>
                      {(models[provider] || []).map((m) => (
                        <button
                          key={m.id}
                          className={`card ${styles.modelCard}`}
                          onClick={() => handleModelSelect(provider, m.id)}
                          disabled={creating}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{m.label}</span>
                          {m.free && <span className={styles.freeBadge}>Free</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
