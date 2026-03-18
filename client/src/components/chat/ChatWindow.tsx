import { useEffect, useRef } from 'react';
import type { Message, Mode } from '../../types/index.js';
import { MessageBubble } from './MessageBubble.js';
import styles from './ChatWindow.module.css';

interface Props {
  messages: Message[];
  mode: Mode;
  streamingText?: string;
}

export function ChatWindow({ messages, mode, streamingText }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingText]);

  return (
    <div className={`${styles.window} ${mode === 'sexting' ? styles.sexting : ''}`}>
      <div className={styles.inner}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} mode={mode} />
        ))}

        {streamingText && (
          <div className={styles.streaming}>
            <div className="message-assistant">
              <div className={styles.streamingLabel}>AI</div>
              <div>{streamingText}</div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}