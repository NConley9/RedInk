import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatSession } from '../hooks/useChats.js';
import { useCharacters } from '../hooks/useCharacters.js';
import { useScenarios } from '../hooks/useScenarios.js';
import { useSettings } from '../hooks/useSettings.js';
import { ChatHeader } from '../components/chat/ChatHeader.js';
import { ChatWindow } from '../components/chat/ChatWindow.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import styles from './ChatPage.module.css';

const BASE_SYSTEM_PROMPT_CHARS = 6000;
const TOKEN_ESTIMATE_DIVISOR = 4;

export function ChatPage() {
  const { chatId } = useParams();
  const { chat, messages, streaming, streamBuffer, error, loadChat, sendMessage, updateChatModel, rewriteLastPrompt } = useChatSession(chatId || null);
  const { characters, loading: charactersLoading } = useCharacters();
  const { scenarios, loading: scenariosLoading } = useScenarios();
  const { models, settings } = useSettings();
  const [activeProvider, setActiveProvider] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [rewriteChoice, setRewriteChoice] = useState('');
  const [updatingModel, setUpdatingModel] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const autoStartedChatIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (chatId) void loadChat(chatId);
  }, [chatId, loadChat]);

  const selectedLoveInterest = useMemo(
    () => characters.find((item) => item.id === chat?.character_id) || null,
    [characters, chat?.character_id],
  );

  const selectedPersona = useMemo(
    () => characters.find((item) => item.id === chat?.persona_character_id) || null,
    [characters, chat?.persona_character_id],
  );

  const selectedScenario = useMemo(
    () => scenarios.find((item) => item.id === chat?.scenario_id) || null,
    [scenarios, chat?.scenario_id],
  );

  const personaContext = useMemo(
    () => selectedPersona || (chat?.persona?.content_md ? { content_md: chat.persona.content_md } : null),
    [selectedPersona, chat?.persona?.content_md],
  );

  const loveInterestContext = useMemo(
    () => selectedLoveInterest || (chat?.love_interest?.content_md ? { content_md: chat.love_interest.content_md } : null),
    [selectedLoveInterest, chat?.love_interest?.content_md],
  );

  const scenarioContext = useMemo(
    () => selectedScenario || (chat?.scenario?.content_md ? { content_md: chat.scenario.content_md } : null),
    [selectedScenario, chat?.scenario?.content_md],
  );

  const contextReady = useMemo(() => {
    if (!chat) return false;
    const personaResolved = !chat.persona_character_id || Boolean(personaContext?.content_md);
    const loveInterestResolved = !chat.character_id || Boolean(loveInterestContext?.content_md);
    const scenarioResolved = !chat.scenario_id || Boolean(scenarioContext?.content_md);

    if (charactersLoading || scenariosLoading) {
      return personaResolved && loveInterestResolved && scenarioResolved;
    }

    return personaResolved && loveInterestResolved && scenarioResolved;
  }, [chat, personaContext?.content_md, loveInterestContext?.content_md, scenarioContext?.content_md, charactersLoading, scenariosLoading]);

  useEffect(() => {
    if (!chat || messages.length > 0 || streaming || !contextReady) return;
    if (autoStartedChatIds.current.has(chat.id)) return;

    const modeLabel = chat.mode.replace('_', ' ');
    const personaName = selectedPersona?.name || chat.persona?.name;
    const loveInterestName = selectedLoveInterest?.name || chat.love_interest?.name;
    const scenarioName = selectedScenario?.name || chat.scenario?.name;
    const personaClause = personaName ? ` and persona ${personaName}` : '';
    const loveInterestClause = loveInterestName
      ? ` with love interest ${loveInterestName}`
      : '';
    const scenarioClause = scenarioName ? ` in scenario ${scenarioName}` : '';
    const starterPrompt = `Let's start a ${modeLabel} story${personaClause}${loveInterestClause}${scenarioClause}.`;

    autoStartedChatIds.current.add(chat.id);
    void sendMessage(starterPrompt, personaContext, loveInterestContext, scenarioContext);
  }, [chat, messages.length, streaming, selectedPersona, selectedLoveInterest, selectedScenario, sendMessage, contextReady, personaContext, loveInterestContext, scenarioContext]);

  const availableProviders = useMemo(() => {
    const configured = settings?.api_keys_configured || [];
    return Object.keys(models).filter((provider) => provider === 'lmstudio' || configured.includes(provider));
  }, [models, settings?.api_keys_configured]);

  const providerModels = useMemo(
    () => {
      if (!activeProvider) return [];
      const list = models[activeProvider] || [];
      if (!chat) return list;
      return [...list].sort((a, b) => {
        const aRec = (a.recommended_modes || []).includes(chat.mode) ? 1 : 0;
        const bRec = (b.recommended_modes || []).includes(chat.mode) ? 1 : 0;
        return bRec - aRec;
      });
    },
    [models, activeProvider, chat],
  );

  const rewriteOptions = useMemo(
    () =>
      availableProviders.flatMap((provider) =>
        [...(models[provider] || [])]
          .sort((a, b) => {
            if (!chat) return 0;
            const aRec = (a.recommended_modes || []).includes(chat.mode) ? 1 : 0;
            const bRec = (b.recommended_modes || []).includes(chat.mode) ? 1 : 0;
            return bRec - aRec;
          })
          .map((model) => ({
          value: `${provider}::${model.id}`,
          label: `${provider} / ${model.label}${chat && (model.recommended_modes || []).includes(chat.mode) ? ' • Recommended' : ''}`,
          provider,
          model,
          })),
      ),
    [availableProviders, models, chat],
  );

  const activeProviderRecommendations = useMemo(
    () => {
      if (!chat || !activeProvider) return [];
      return (models[activeProvider] || []).filter((m) => (m.recommended_modes || []).includes(chat.mode));
    },
    [chat, activeProvider, models],
  );

  const estimatedPromptTokens = useMemo(() => {
    const historyChars = messages.reduce((acc, msg) => acc + msg.content.length, 0);
    const contextChars =
      (personaContext?.content_md.length || 0) +
      (loveInterestContext?.content_md.length || 0) +
      (scenarioContext?.content_md.length || 0);
    return Math.ceil((BASE_SYSTEM_PROMPT_CHARS + contextChars + historyChars) / TOKEN_ESTIMATE_DIVISOR);
  }, [messages, personaContext?.content_md, loveInterestContext?.content_md, scenarioContext?.content_md]);

  const activeModelMeta = useMemo(
    () => (models[activeProvider] || []).find((m) => m.id === activeModel) || null,
    [models, activeProvider, activeModel],
  );

  const rewriteModelMeta = useMemo(() => {
    const [provider, modelId] = rewriteChoice.split('::');
    if (!provider || !modelId) return null;
    return (models[provider] || []).find((m) => m.id === modelId) || null;
  }, [models, rewriteChoice]);

  const activeNearLimit = useMemo(() => {
    if (!activeModelMeta?.input_token_soft_limit) return false;
    return estimatedPromptTokens > Math.floor(activeModelMeta.input_token_soft_limit * 0.85);
  }, [activeModelMeta?.input_token_soft_limit, estimatedPromptTokens]);

  const rewriteNearLimit = useMemo(() => {
    if (!rewriteModelMeta?.input_token_soft_limit) return false;
    return estimatedPromptTokens > Math.floor(rewriteModelMeta.input_token_soft_limit * 0.85);
  }, [rewriteModelMeta?.input_token_soft_limit, estimatedPromptTokens]);

  useEffect(() => {
    if (!chat) return;
    setActiveProvider(chat.model_provider);
    setActiveModel(chat.model_name);
    setRewriteChoice(`${chat.model_provider}::${chat.model_name}`);
  }, [chat?.id, chat?.model_provider, chat?.model_name]);

  useEffect(() => {
    if (!activeProvider) return;
    const list = models[activeProvider] || [];
    if (list.length === 0) return;
    if (!list.some((m) => m.id === activeModel)) {
      setActiveModel(list[0].id);
    }
  }, [activeProvider, activeModel, models]);

  const applyChatModel = async () => {
    if (!chat || !activeProvider || !activeModel) return;
    setUpdatingModel(true);
    try {
      await updateChatModel(activeProvider, activeModel);
    } finally {
      setUpdatingModel(false);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteChoice) return;
    const [provider, model] = rewriteChoice.split('::');
    if (!provider || !model) return;
    setRewriting(true);
    try {
      await rewriteLastPrompt(provider, model, personaContext, loveInterestContext, scenarioContext);
    } finally {
      setRewriting(false);
    }
  };

  if (!chat) {
    return <div className={styles.center}>Loading chat…</div>;
  }

  return (
    <div className={styles.page}>
      <ChatHeader chat={chat} />
      <ChatWindow messages={messages} mode={chat.mode} streamingText={streamBuffer} />
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.toolsLauncherWrap}>
        <button className={`btn btn-ghost ${styles.toolsLauncher}`} onClick={() => setToolsOpen(true)}>
          <span className={styles.toolsLauncherLabel}>Model Tools</span>
        </button>
      </div>

      {toolsOpen && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setToolsOpen(false)}>
          <div className={`${styles.toolsModal} modal`}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className="text-display">Model Controls</h2>
                <p className="text-muted">Switch active model or rewrite the latest prompt with another model.</p>
              </div>
              <button className="btn-icon" onClick={() => setToolsOpen(false)} aria-label="Close model tools">✕</button>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.modalSectionTitle}>Live model</div>
              <div className={styles.modalControls}>
                <select
                  className={`input ${styles.select}`}
                  value={activeProvider}
                  onChange={(e) => setActiveProvider(e.target.value)}
                  disabled={streaming || updatingModel}
                >
                  {availableProviders.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
                <select
                  className={`input ${styles.select}`}
                  value={activeModel}
                  onChange={(e) => setActiveModel(e.target.value)}
                  disabled={streaming || updatingModel || providerModels.length === 0}
                >
                  {providerModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}{chat && (model.recommended_modes || []).includes(chat.mode) ? ' • Recommended' : ''}
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost" onClick={() => void applyChatModel()} disabled={streaming || updatingModel || !activeProvider || !activeModel}>
                  {updatingModel ? 'Applying…' : 'Apply'}
                </button>
              </div>
              {chat && activeProviderRecommendations.length > 0 && (
                <div className={styles.recommendationRow}>
                  <span className={styles.recommendationLabel}>Recommended for {chat.mode.replace('_', ' ')}:</span>
                  <div className={styles.recommendationChips}>
                    {activeProviderRecommendations.map((model) => (
                      <button
                        key={model.id}
                        className={styles.recommendationChip}
                        onClick={() => setActiveModel(model.id)}
                        type="button"
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chat && activeModelMeta && (activeModelMeta.recommended_modes || []).includes(chat.mode) && (
                <p className={styles.infoText}>Recommended for {chat.mode.replace('_', ' ')}. {activeModelMeta.notes || ''}</p>
              )}
              {activeNearLimit && (
                <div className={styles.warningBox}>
                  Estimated prompt size is ~{estimatedPromptTokens} tokens, near or above this model's safe budget ({activeModelMeta?.input_token_soft_limit}).
                </div>
              )}
            </div>

            <div className={styles.modalSection}>
              <div className={styles.modalSectionTitle}>Rewrite with...</div>
              <div className={styles.modalControls}>
                <select
                  className={`input ${styles.rewriteSelect}`}
                  value={rewriteChoice}
                  onChange={(e) => setRewriteChoice(e.target.value)}
                  disabled={streaming || rewriting || rewriteOptions.length === 0}
                >
                  {rewriteOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={() => void handleRewrite()} disabled={streaming || rewriting || !rewriteChoice || !contextReady}>
                  {rewriting ? 'Rewriting…' : 'Rewrite last prompt'}
                </button>
              </div>
              {chat && rewriteModelMeta && (rewriteModelMeta.recommended_modes || []).includes(chat.mode) && (
                <p className={styles.infoText}>Recommended for {chat.mode.replace('_', ' ')}. {rewriteModelMeta.notes || ''}</p>
              )}
              {rewriteNearLimit && (
                <div className={styles.warningBox}>
                  Rewrite may exceed this model's context budget (~{estimatedPromptTokens} estimated vs {rewriteModelMeta?.input_token_soft_limit} target).
                </div>
              )}
              {!contextReady && <p className="text-muted">Waiting for character/scenario context to load before rewriting.</p>}
            </div>
          </div>
        </div>
      )}
      <ChatInput
        mode={chat.mode}
        disabled={streaming || !contextReady}
        onSend={(value) => sendMessage(value, personaContext, loveInterestContext, scenarioContext)}
      />
    </div>
  );
}