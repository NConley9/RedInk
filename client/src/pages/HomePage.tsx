import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChats } from '../hooks/useChats.js';
import { NewChatWizard } from '../components/setup/NewChatWizard.js';
import styles from './HomePage.module.css';

export function HomePage() {
  const { chats, loadChats, deleteChat } = useChats();
  const [searchParams, setSearchParams] = useSearchParams();

  const wizardOpen = searchParams.get('new') === '1';

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>Red Ink</h1>
          <p className={styles.subtitle}>Frictionless setup. Pick a mode, optional persona, love interest, scenario, and start writing.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setSearchParams({ new: '1' })}>New Chat</button>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Chats</h2>
          <span className={styles.count}>{chats.length}</span>
        </div>

        {chats.length === 0 ? (
          <div className={styles.empty}>
            <p>No chats yet.</p>
            <button className="btn btn-primary" onClick={() => setSearchParams({ new: '1' })}>Start your first one</button>
          </div>
        ) : (
          <div className={styles.chatList}>
            {chats.map((chat) => (
              <div key={chat.id} className={`card ${styles.chatCard}`}>
                <Link to={`/chat/${chat.id}`} className={styles.chatMain}>
                  <div className={styles.chatTop}>
                    <h3 className={styles.chatTitle}>{chat.title}</h3>
                    <span className={`mode-badge ${chat.mode}`}>{chat.mode.replace('_', ' ')}</span>
                  </div>
                  <p className={styles.chatMeta}>{chat.model_provider} / {chat.model_name}</p>
                  <p className={styles.preview}>{chat.last_message?.content || 'No messages yet.'}</p>
                </Link>
                <button className="btn-icon" onClick={() => void deleteChat(chat.id)} title="Delete chat">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {wizardOpen && <NewChatWizard onClose={() => setSearchParams({})} />}
    </div>
  );
}