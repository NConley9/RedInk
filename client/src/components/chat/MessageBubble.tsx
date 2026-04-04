import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, Mode } from '../../types/index.js';
import styles from './MessageBubble.module.css';

export function MessageBubble({ message, mode }: { message: Message; mode: Mode }) {
  const cls = message.role === 'user' ? 'message-user' : 'message-assistant';

  return (
    <div className={`${styles.wrapper} ${mode === 'sexting' || mode === 'texting' ? 'mode-sexting' : ''}`}>
      <div className={cls}>
        <div className={styles.role}>{message.role === 'user' ? 'You' : 'AI'}</div>
        <div className={styles.content}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        {message.image_url && <img src={message.image_url} alt="generated" className={styles.image} />}
      </div>
    </div>
  );
}