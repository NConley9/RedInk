import styles from './ScenarioCard.module.css';
import type { Scenario } from '../../types/index.js';

interface Props {
  scenario: Scenario;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ScenarioCard({ scenario, selected, onClick, onEdit, onDelete }: Props) {
  const excerpt = scenario.content_md.slice(0, 150).replace(/\s+/g, ' ').trim();
  return (
    <div className={`card ${selected ? 'selected' : ''} ${styles.card}`} onClick={onClick}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{scenario.name}</h3>
          <div className={styles.meta}>
            {scenario.is_stock ? <span className={styles.stock}>Stock</span> : (scenario.is_global ? <span className={styles.global}>Seeded</span> : <span className={styles.custom}>Custom</span>)}
          </div>
        </div>
        {!scenario.is_global && (onEdit || onDelete) && (
          <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {onEdit && <button className="btn-icon" onClick={onEdit}>✎</button>}
            {onDelete && <button className="btn-icon" onClick={onDelete}>✕</button>}
          </div>
        )}
      </div>
      <p className={styles.excerpt}>{excerpt}{scenario.content_md.length > 150 ? '…' : ''}</p>
      {scenario.tags?.length > 0 && (
        <div className={styles.tags}>
          {scenario.tags.slice(0, 4).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
        </div>
      )}
    </div>
  );
}
