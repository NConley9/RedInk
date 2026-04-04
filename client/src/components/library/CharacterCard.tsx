import styles from './CharacterCard.module.css';
import type { Character } from '../../types/index.js';

interface Props {
  character: Character;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateLayers?: () => void;
  generatingLayers?: boolean;
}

export function CharacterCard({ character, selected, onClick, onEdit, onDelete, onGenerateLayers, generatingLayers }: Props) {
  const excerpt = character.content_md.slice(0, 150).replace(/\s+/g, ' ').trim();
  const hasLayers = Boolean(character.voice_card_yaml) && (character.reference_chunks || []).length > 0;
  return (
    <div className={`card ${selected ? 'selected' : ''} ${styles.card}`} onClick={onClick}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{character.name}</h3>
          <div className={styles.meta}>
            {character.is_stock ? <span className={styles.stock}>Stock</span> : (character.is_global ? <span className={styles.global}>Seeded</span> : <span className={styles.custom}>Custom</span>)}
            <span className={hasLayers ? styles.layered : styles.unlayered}>{hasLayers ? 'Layered' : 'Needs layers'}</span>
          </div>
        </div>
        {!character.is_global && (onEdit || onDelete) && (
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {onGenerateLayers && <button className="btn-icon" onClick={onGenerateLayers} disabled={generatingLayers} title="Generate layers">{generatingLayers ? '…' : '⚡'}</button>}
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
