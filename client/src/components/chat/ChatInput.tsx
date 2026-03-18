import { useState } from 'react';
import type { Mode } from '../../types/index.js';
import styles from './ChatInput.module.css';

interface Props {
  mode: Mode;
  disabled?: boolean;
  onSend: (value: string) => Promise<void>;
}

export function ChatInput({ mode, disabled, onSend }: Props) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <textarea
          className={`input ${styles.input}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'sexting' ? 'Text back...' : 'Write your next message...'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={disabled || sending}
        />
        <button className="btn btn-primary" onClick={() => void submit()} disabled={disabled || sending || !value.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <div className={styles.hint}>
        {mode === 'sexting' ? 'Short, text-style prompts work best.' : 'Press Enter to send. Shift+Enter for a new line.'}
      </div>
    </div>
  );
}