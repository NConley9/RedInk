import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mode, Character, Scenario, NewChatConfig } from '../../types/index.js';
import { useCharacters } from '../../hooks/useCharacters.js';
import { useScenarios } from '../../hooks/useScenarios.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useChats } from '../../hooks/useChats.js';
import styles from './NewChatWizard.module.css';

type Step = 'mode' | 'persona' | 'loveInterest' | 'scenario' | 'model';

const MODE_OPTIONS: Array<{ id: Mode; label: string; description: string; icon: string }> = [
  { id: 'long_form', label: 'Long Form', description: 'Full chapters, extended narrative, cinematic storytelling', icon: '📖' },
  { id: 'role_play', label: 'Role Play', description: 'Collaborative back-and-forth, immersive scenes', icon: '🎭' },
  { id: 'sexting', label: 'Sexting', description: 'First-person text-style with image generation', icon: '💬' },
  { id: 'texting', label: 'Texting', description: 'In-character text conversation, natural voice', icon: '📱' },
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

  const steps: Step[] = ['mode', 'persona', 'loveInterest', 'scenario', 'model'];
  const stepIndex = steps.indexOf(step);

  const estimatedInitialPromptTokens = Math.ceil((
    6000 +
    (config.personaCharacter?.voice_card_yaml?.length || config.personaCharacter?.content_md.length || 0) +
    (config.loveInterestCharacter?.voice_card_yaml?.length || config.loveInterestCharacter?.content_md.length || 0) +
    (config.scenario?.content_md.length || 0) +
    600
  ) / 4);

  const sortByRecommendation = <T extends { recommended_modes?: Mode[] }>(list: T[]) => {
    if (!config.mode) return list;
    return [...list].sort((a, b) => {
      const aRec = (a.recommended_modes || []).includes(config.mode as Mode) ? 1 : 0;
      const bRec = (b.recommended_modes || []).includes(config.mode as Mode) ? 1 : 0;
      return bRec - aRec;
    });
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  };

  const handleModeSelect = (mode: Mode) => {
    setConfig((c) => ({ ...c, mode }));
    setStep('persona');
  };

  const handlePersonaSelect = (personaCharacter: Character | null) => {
    setConfig((c) => ({ ...c, personaCharacter }));
    setStep('loveInterest');
  };

  const handleLoveInterestSelect = (loveInterestCharacter: Character) => {
    setConfig((c) => ({ ...c, loveInterestCharacter }));
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

  // Auto-select DeepSeek v3.2 if available and user reaches model step
  useEffect(() => {
    if (step === 'model' && !creating) {
      const openrouterModels = models.openrouter || [];
      const deepseekV32 = openrouterModels.find((m) => m.id === 'deepseek/deepseek-v3.2');
      // Automatically select DeepSeek v3.2 if available
      if (deepseekV32 && availableProviders.includes('openrouter')) {
        // Small delay to ensure user sees the option briefly before auto-selecting
        const timer = setTimeout(() => {
          void handleModelSelect('openrouter', 'deepseek/deepseek-v3.2');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [step, models, availableProviders, creating]);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${styles.modal}`}>
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

        {/* Step: Persona */}
        {step === 'persona' && (
          <div className={styles.stepContent}>
            <div className={styles.stepNav}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={goBack}>← Back</button>
            </div>
            <h2 className="text-display">Choose your persona</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>Optional — who you are in this chat</p>
            {charsLoading ? (
              <div className={styles.loading}><div className="spinner" /></div>
            ) : (
              <div className={styles.itemGrid}>
                <button className={`card ${styles.skipCard}`} onClick={() => handlePersonaSelect(null)}>
                  <span>No persona</span>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Write as yourself with no persona profile</p>
                </button>
                {characters.map((c) => (
                  <button key={c.id} className={`card ${styles.itemCard}`} onClick={() => handlePersonaSelect(c)}>
                    <div className={styles.itemCardInner}>
                      <div className={styles.itemAvatar}>{c.name[0].toUpperCase()}</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                        {c.is_global && <span className={styles.globalBadge}>Global</span>}
                        <p className="text-muted truncate" style={{ fontSize: '0.78rem', marginTop: 2, maxWidth: 220 }}>
                          {c.content_md.slice(0, 80)}...
                        </p>
                        {!c.voice_card_yaml && <span className={styles.riskBadge}>No layers</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Love Interest */}
        {step === 'loveInterest' && (
          <div className={styles.stepContent}>
            <div className={styles.stepNav}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={goBack}>← Back</button>
            </div>
            <h2 className="text-display">Choose a love interest</h2>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 4 }}>Required — this character is who the assistant will play</p>
            {charsLoading ? (
              <div className={styles.loading}><div className="spinner" /></div>
            ) : (
              <div className={styles.itemGrid}>
                {characters.map((c) => (
                  <button key={c.id} className={`card ${styles.itemCard}`} onClick={() => handleLoveInterestSelect(c)}>
                    <div className={styles.itemCardInner}>
                      <div className={styles.itemAvatar}>{c.name[0].toUpperCase()}</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                        {c.is_global && <span className={styles.globalBadge}>Global</span>}
                        <p className="text-muted truncate" style={{ fontSize: '0.78rem', marginTop: 2, maxWidth: 220 }}>
                          {c.content_md.slice(0, 80)}...
                        </p>
                        {!c.voice_card_yaml && <span className={styles.riskBadge}>No layers</span>}
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
            {config.mode && (
              <div className={styles.modeRecommendationHint}>
                <span className={styles.recommendedBadge}>Recommended</span>
                <span>Suggestions are tuned for {config.mode.replace('_', ' ')} mode and shown first.</span>
              </div>
            )}

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
                      {sortByRecommendation(models[provider] || []).map((m) => {
                        const recommended = !!config.mode && (m.recommended_modes || []).includes(config.mode);
                        const nearLimit = !!m.input_token_soft_limit && estimatedInitialPromptTokens > Math.floor(m.input_token_soft_limit * 0.85);
                        return (
                        <button
                          key={m.id}
                          className={`card ${styles.modelCard}`}
                          onClick={() => handleModelSelect(provider, m.id)}
                          disabled={creating}
                        >
                          <span style={{ fontSize: '0.875rem' }}>{m.label}</span>
                          {m.free && <span className={styles.freeBadge}>Free</span>}
                          {recommended && <span className={styles.recommendedBadge}>Recommended</span>}
                          {nearLimit && <span className={styles.riskBadge}>High context risk</span>}
                          {recommended && m.notes && (
                            <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: 8 }}>{m.notes}</p>
                          )}
                        </button>
                        );
                      })}
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
