import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import type { Chat, Message, NewChatConfig } from '../types/index.js';
import { apiStream } from '../lib/api.js';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Chat[]>('/api/chats');
      setChats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = async (config: NewChatConfig): Promise<Chat> => {
    const chat = await apiFetch<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({
        title: config.loveInterestCharacter
          ? `${config.loveInterestCharacter.name} — ${config.mode.replace('_', ' ')}`
          : `${config.mode.replace('_', ' ')} — new`,
        mode: config.mode,
        persona_character_id: config.personaCharacter?.id || null,
        character_id: config.loveInterestCharacter.id,
        scenario_id: config.scenario?.id || null,
        model_provider: config.provider,
        model_name: config.model,
      }),
    });
    setChats((prev) => [chat, ...prev]);
    return chat;
  };

  const deleteChat = async (id: string) => {
    await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  const renameChat = async (id: string, title: string) => {
    const updated = await apiFetch<Chat>(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c)));
  };

  return { chats, loading, loadChats, createChat, deleteChat, renameChat };
}

export function useChatSession(chatId: string | null) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);

  type PromptContext = { content_md: string } | null;

  const loadChat = useCallback(async (id: string) => {
    const data = await apiFetch<Chat>(`/api/chats/${id}`);
    setChat(data);
    setMessages(data.messages || []);
  }, []);

  const sendMessage = async (
    content: string,
    personaContext: PromptContext,
    loveInterestContext: PromptContext,
    scenarioContext: PromptContext,
  ) => {
    if (!chat || streaming) return;

    setError(null);

    // Save user message
    const userMsg = await apiFetch<Message>(`/api/chats/${chat.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content }),
    });
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setStreaming(true);
    setStreamBuffer('');
    let accumulated = '';

    // Build message history (omit system messages from history array — system prompt is separate)
    const history = updatedMessages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    await apiStream(
      '/api/ai/chat',
      {
        provider: chat.model_provider,
        model: chat.model_name,
        messages: history,
        mode: chat.mode,
        personaContent: personaContext?.content_md || null,
        loveInterestContent: loveInterestContext?.content_md || null,
        scenarioContent: scenarioContext?.content_md || null,
      },
      (token) => {
        accumulated += token;
        setStreamBuffer(accumulated);
      },
      async () => {
        setStreaming(false);
        setStreamBuffer('');
        // Save assistant message
        const assistantMsg = await apiFetch<Message>(`/api/chats/${chat.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: accumulated }),
        });
        setMessages((prev) => [...prev, assistantMsg]);
      },
      (msg) => {
        setStreaming(false);
        setStreamBuffer('');
        setError(msg);
      },
    );
  };

  const updateChatModel = async (provider: string, model: string) => {
    if (!chat) return;
    const updated = await apiFetch<Chat>(`/api/chats/${chat.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ model_provider: provider, model_name: model }),
    });
    setChat((prev) => (prev ? { ...prev, model_provider: updated.model_provider, model_name: updated.model_name } : prev));
  };

  const rewriteLastPrompt = async (
    provider: string,
    model: string,
    personaContext: PromptContext,
    loveInterestContext: PromptContext,
    scenarioContext: PromptContext,
  ) => {
    if (!chat || streaming) return;

    const lastUserIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIndex === -1) {
      setError('No user prompt found to rewrite.');
      return;
    }

    const absoluteIndex = messages.length - 1 - lastUserIndex;
    const history = messages
      .slice(0, absoluteIndex + 1)
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    setError(null);
    setStreaming(true);
    setStreamBuffer('');
    let accumulated = '';

    // Remove any assistant messages that come after the last user prompt
    const messagesUpToLastUser = messages.slice(0, absoluteIndex + 1);

    await apiStream(
      '/api/ai/chat',
      {
        provider,
        model,
        messages: history,
        mode: chat.mode,
        personaContent: personaContext?.content_md || null,
        loveInterestContent: loveInterestContext?.content_md || null,
        scenarioContent: scenarioContext?.content_md || null,
      },
      (token) => {
        accumulated += token;
        setStreamBuffer(accumulated);
      },
      async () => {
        setStreaming(false);
        setStreamBuffer('');
        const assistantMsg = await apiFetch<Message>(`/api/chats/${chat.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: accumulated }),
        });
        // Replace messages to only include up to last user message, then add new response
        setMessages(messagesUpToLastUser.concat(assistantMsg));
      },
      (msg) => {
        setStreaming(false);
        setStreamBuffer('');
        setError(msg);
      },
    );
  };

  return { chat, messages, streaming, streamBuffer, error, loadChat, sendMessage, updateChatModel, rewriteLastPrompt };
}
