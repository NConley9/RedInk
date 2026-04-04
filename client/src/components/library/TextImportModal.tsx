import { useState } from 'react';
import styles from './EditorModal.module.css';

interface Props {
  onClose: () => void;
  onSubmit: (payload: { sourceText: string; generateLayers: boolean }) => Promise<void>;
}

export function TextImportModal({ onClose, onSubmit }: Props) {
  const [sourceText, setSourceText] = useState('');
  const [generateLayers, setGenerateLayers] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!sourceText.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ sourceText: sourceText.trim(), generateLayers });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Create Character From Text</h2>
            <p className="text-secondary">Paste a raw dossier, notes dump, or profile text. The system will extract a character and keep it private.</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className={styles.layout}>
          <div className={styles.form}>
            <label className={styles.label}>
              Source Text
              <textarea
                className="input"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste character text here..."
                style={{ minHeight: 360 }}
              />
            </label>

            <label className={styles.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={generateLayers} onChange={(e) => setGenerateLayers(e.target.checked)} />
              Generate layers immediately
            </label>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewHeader}>Output</div>
            <div className={styles.previewBody}>
              <p>The server extracts a canonical name, cleaned markdown profile, tags, and the new layered prompt data.</p>
              <p>Your pasted examples stay private unless you explicitly publish them later.</p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !sourceText.trim()} onClick={handleSubmit}>
            {saving ? 'Creating…' : 'Create Character'}
          </button>
        </div>
      </div>
    </div>
  );
}