import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatSession } from '../hooks/useChats.js';
import { useCharacters } from '../hooks/useCharacters.js';
import { useScenarios } from '../hooks/useScenarios.js';
import { useSettings } from '../hooks/useSettings.js';
import { ChatHeader } from '../components/chat/ChatHeader.js';
import { ChatWindow } from '../components/chat/ChatWindow.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const { chatId } = useParams();
  const { chat, messages, streaming, streamBuffer, error, loadChat, sendMessage, updateChatModel, rewriteLastPrompt } = useChatSession(chatId || null);
  const { characters } = useCharacters();
  const { scenarios } = useScenarios();
  const { models, settings } = useSettings();
  const [activeProvider, setActiveProvider] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [rewriteChoice, setRewriteChoice] = useState('');
  const [updatingModel, setUpdatingModel] = useState(false);
  const [rewriting, setRewriting] = useState(false);

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

  const availableProviders = useMemo(() => {
    const configured = settings?.api_keys_configured || [];
    return Object.keys(models).filter((provider) => provider === 'lmstudio' || configured.includes(provider));
  }, [models, settings?.api_keys_configured]);

  const providerModels = useMemo(
    () => (activeProvider ? models[activeProvider] || [] : []),
    [models, activeProvider],
  );

  const rewriteOptions = useMemo(
    () =>
      availableProviders.flatMap((provider) =>
        (models[provider] || []).map((model) => ({
          value: `${provider}::${model.id}`,
          label: `${provider} / ${model.label}`,
        })),
      ),
    [availableProviders, models],
  );

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
      await rewriteLastPrompt(provider, model, selectedPersona, selectedLoveInterest, selectedScenario);
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
      <div className={styles.toolsBar}>
        <div className={styles.toolGroup}>
          <span className={styles.toolLabel}>Live model</span>
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
              <option key={model.id} value={model.id}>{model.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={() => void applyChatModel()} disabled={streaming || updatingModel || !activeProvider || !activeModel}>
            {updatingModel ? 'Applying…' : 'Apply'}
          </button>
        </div>

        <div className={styles.toolGroup}>
          <span className={styles.toolLabel}>Rewrite with…</span>
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
          <button className="btn btn-primary" onClick={() => void handleRewrite()} disabled={streaming || rewriting || !rewriteChoice}>
            {rewriting ? 'Rewriting…' : 'Rewrite last prompt'}
          </button>
        </div>
      </div>
      <ChatInput
        mode={chat.mode}
        disabled={streaming}
        onSend={(value) => sendMessage(value, selectedPersona, selectedLoveInterest, selectedScenario)}
      />
    </div>
  );
}