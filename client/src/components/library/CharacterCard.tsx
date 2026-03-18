import styles from './CharacterCard.module.css';
import type { Character } from '../../types/index.js';

interface Props {
  character: Character;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CharacterCard({ character, selected, onClick, onEdit, onDelete }: Props) {
  const excerpt = character.content_md.slice(0, 150).replace(/\s+/g, ' ').trim();
  return (
    <div className={`card ${selected ? 'selected' : ''} ${styles.card}`} onClick={onClick}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{character.name}</h3>
          <div className={styles.meta}>
            {character.is_global ? <span className={styles.global}>Seeded</span> : <span className={styles.custom}>Custom</span>}
          </div>
        </div>
        {!character.is_global && (onEdit || onDelete) && (
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {onEdit && <button className="btn-icon" onClick={onEdit}>✎</button>}
            {onDelete && <button className="btn-icon" onClick={onDelete}>✕</button>}
          </div>
        )}
      </div>
      <p className={styles.excerpt}>{excerpt}{character.content_md.length > 150 ? '…' : ''}</p>
      {character.tags?.length > 0 && (
        <div className={styles.tags}>
          {character.tags.slice(0, 4).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
        </div>
      )}
    </div>
  );
}
