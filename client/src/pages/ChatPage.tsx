import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useChatSession } from '../hooks/useChats.js';
import { useCharacters } from '../hooks/useCharacters.js';
import { useScenarios } from '../hooks/useScenarios.js';
import { ChatHeader } from '../components/chat/ChatHeader.js';
import { ChatWindow } from '../components/chat/ChatWindow.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const { chatId } = useParams();
  const { chat, messages, streaming, streamBuffer, error, loadChat, sendMessage } = useChatSession(chatId || null);
  const { characters } = useCharacters();
  const { scenarios } = useScenarios();

  useEffect(() => {
    if (chatId) void loadChat(chatId);
  }, [chatId, loadChat]);

  const selectedCharacter = useMemo(
    () => characters.find((item) => item.id === chat?.character_id) || null,
    [characters, chat?.character_id],
  );

  const selectedScenario = useMemo(
    () => scenarios.find((item) => item.id === chat?.scenario_id) || null,
    [scenarios, chat?.scenario_id],
  );

  if (!chat) {
    return <div className={styles.center}>Loading chat…</div>;
  }

  return (
    <div className={styles.page}>
      <ChatHeader chat={chat} />
      <ChatWindow messages={messages} mode={chat.mode} streamingText={streamBuffer} />
      {error && <div className={styles.error}>{error}</div>}
      <ChatInput
        mode={chat.mode}
        disabled={streaming}
        onSend={(value) => sendMessage(value, selectedCharacter, selectedScenario)}
      />
    </div>
  );
}