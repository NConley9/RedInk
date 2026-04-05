import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './EditorModal.module.css';

interface Props {
  type: 'character' | 'scenario';
  initial?: { name: string; content_md: string; tags: string[] } | null;
  onClose: () => void;
  onSave: (payload: { name: string; content_md: string; tags: string[] }) => Promise<void>;
}

export function EditorModal({ type, initial, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [content, setContent] = useState(initial?.content_md || '');
  const [tags, setTags] = useState(initial?.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        content_md: content.trim(),
        tags: tags.split(',').map((x) => x.trim()).filter(Boolean),
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>{initial ? `Edit ${type}` : `New ${type}`}</h2>
            <p className="text-secondary">Markdown supported. Preview updates live.</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className={styles.layout}>
          <div className={styles.form}>
            {error && <p className="text-danger" style={{ margin: 0 }}>{error}</p>}

            <label className={styles.label}>
              Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${type} name`} />
            </label>

            <label className={styles.label}>
              Tags
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" />
            </label>

            <label className={styles.label}>
              Markdown
              <textarea className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder={`Write ${type} notes in markdown...`} />
            </label>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewHeader}>Preview</div>
            <div className={styles.previewBody}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Nothing yet*'}</ReactMarkdown>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !name.trim() || !content.trim()} onClick={handleSubmit}>
            {saving ? 'Saving…' : initial ? 'Save changes' : `Create ${type}`}
          </button>
        </div>
      </div>
    </div>
  );
}
