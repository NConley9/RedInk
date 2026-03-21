import { useMemo, useState } from 'react';
import { CharacterCard } from '../components/library/CharacterCard.js';
import { ScenarioCard } from '../components/library/ScenarioCard.js';
import { EditorModal } from '../components/library/EditorModal.js';
import { useCharacters } from '../hooks/useCharacters.js';
import { useScenarios } from '../hooks/useScenarios.js';
import type { Character, Scenario } from '../types/index.js';
import styles from './LibraryPage.module.css';

type Tab = 'characters' | 'scenarios';

export function LibraryPage() {
  const [tab, setTab] = useState<Tab>('characters');
  const [query, setQuery] = useState('');
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const charactersState = useCharacters();
  const scenariosState = useScenarios();

  const filteredCharacters = useMemo(
    () => charactersState.characters.filter((item) => {
      const hay = `${item.name} ${item.content_md} ${(item.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    }),
    [charactersState.characters, query],
  );

  const filteredScenarios = useMemo(
    () => scenariosState.scenarios.filter((item) => {
      const hay = `${item.name} ${item.content_md} ${(item.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    }),
    [scenariosState.scenarios, query],
  );

  return (
    <div className={styles.page}>
      <section className={styles.top}>
        <div>
          <h1>Library</h1>
          <p className={styles.subtitle}>Seeded characters and scenarios from the workspace, plus your own private additions.</p>
        </div>
        <div className={styles.actions}>
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search library..." />
          <button className="btn btn-primary" onClick={() => tab === 'characters' ? setEditingCharacter({} as Character) : setEditingScenario({} as Scenario)}>
            Add {tab === 'characters' ? 'Character' : 'Scenario'}
          </button>
        </div>
      </section>

      <div className={styles.tabs}>
        <button className={`btn ${tab === 'characters' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('characters')}>Characters</button>
        <button className={`btn ${tab === 'scenarios' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('scenarios')}>Scenarios</button>
      </div>

      {charactersState.error && (
        <div className="card" style={{ padding: 12, marginBottom: 12, borderColor: 'rgba(230, 57, 70, 0.35)' }}>
          <p style={{ margin: 0, color: 'var(--danger)' }}>
            Failed to load characters: {charactersState.error}
          </p>
        </div>
      )}

      {scenariosState.error && (
        <div className="card" style={{ padding: 12, marginBottom: 12, borderColor: 'rgba(230, 57, 70, 0.35)' }}>
          <p style={{ margin: 0, color: 'var(--danger)' }}>
            Failed to load scenarios: {scenariosState.error}
          </p>
        </div>
      )}

      {tab === 'characters' && (
        <div className={styles.grid}>
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={!character.is_global ? () => setEditingCharacter(character) : undefined}
              onDelete={!character.is_global ? () => void charactersState.remove(character.id) : undefined}
            />
          ))}
        </div>
      )}

      {tab === 'scenarios' && (
        <div className={styles.grid}>
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onEdit={!scenario.is_global ? () => setEditingScenario(scenario) : undefined}
              onDelete={!scenario.is_global ? () => void scenariosState.remove(scenario.id) : undefined}
            />
          ))}
        </div>
      )}

      {editingCharacter && (
        <EditorModal
          type="character"
          initial={editingCharacter.id ? editingCharacter : null}
          onClose={() => setEditingCharacter(null)}
          onSave={async (payload) => {
            if (editingCharacter.id) await charactersState.update(editingCharacter.id, payload);
            else await charactersState.create(payload.name, payload.content_md, payload.tags);
          }}
        />
      )}

      {editingScenario && (
        <EditorModal
          type="scenario"
          initial={editingScenario.id ? editingScenario : null}
          onClose={() => setEditingScenario(null)}
          onSave={async (payload) => {
            if (editingScenario.id) await scenariosState.update(editingScenario.id, payload);
            else await scenariosState.create(payload.name, payload.content_md, payload.tags);
          }}
        />
      )}
    </div>
  );
}