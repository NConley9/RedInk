import { Link } from 'react-router-dom';
import type { Chat } from '../../types/index.js';
import styles from './ChatHeader.module.css';

export function ChatHeader({ chat }: { chat: Chat | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link to="/" className={styles.backLink}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span>Chats</span>
        </Link>
        <div>
          <h1 className={styles.title}>{chat?.title || 'Chat'}</h1>
          <div className={styles.meta}>
            {chat && <span className={`mode-badge ${chat.mode}`}>{chat.mode.replace('_', ' ')}</span>}
            {chat?.persona?.name && <span className={styles.pill}>Persona: {chat.persona.name}</span>}
            {chat?.love_interest?.name && <span className={styles.pill}>Love Interest: {chat.love_interest.name}</span>}
            {chat?.scenario?.name && <span className={styles.pill}>{chat.scenario.name}</span>}
          </div>
        </div>
      </div>
      <div className={styles.model}>{chat ? `${chat.model_provider} / ${chat.model_name}` : ''}</div>
    </header>
  );
}