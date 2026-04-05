import { useMemo, useState } from 'react';
import { CharacterCard } from '../components/library/CharacterCard.js';
import { ScenarioCard } from '../components/library/ScenarioCard.js';
import { EditorModal } from '../components/library/EditorModal.js';
import { TextImportModal } from '../components/library/TextImportModal.js';
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
  const [importingCharacter, setImportingCharacter] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
          {tab === 'characters' && <button className="btn btn-secondary" onClick={() => setImportingCharacter(true)}>Create From Text</button>}
          {tab === 'characters' && (
            <button
              className="btn btn-ghost"
              disabled={backfilling}
              onClick={async () => {
                setActionError(null);
                setActionMessage(null);
                setBackfilling(true);
                try {
                  const result = await charactersState.backfillLayers({ onlyMissing: true, limit: 25 });
                  if (result.failures.length > 0) {
                    setActionError(`Converted ${result.converted} of ${result.processed}. First failure: ${result.failures[0]?.error || 'Unknown error'}`);
                  } else {
                    setActionMessage(result.processed === 0 ? 'No characters needed layers.' : `Converted ${result.converted} character${result.converted === 1 ? '' : 's'}.`);
                  }
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setBackfilling(false);
                }
              }}
            >
              {backfilling ? 'Converting…' : 'Convert Existing'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => tab === 'characters' ? setEditingCharacter({} as Character) : setEditingScenario({} as Scenario)}>
            Add {tab === 'characters' ? 'Character' : 'Scenario'}
          </button>
        </div>
      </section>

      {actionError && (
        <div className="card" style={{ padding: 12, marginTop: 12, marginBottom: 12, borderColor: 'rgba(230, 57, 70, 0.35)' }}>
          <p style={{ margin: 0, color: 'var(--danger)' }}>{actionError}</p>
        </div>
      )}

      {actionMessage && !actionError && (
        <div className="card" style={{ padding: 12, marginTop: 12, marginBottom: 12, borderColor: 'rgba(120, 182, 122, 0.3)' }}>
          <p style={{ margin: 0, color: 'var(--success)' }}>{actionMessage}</p>
        </div>
      )}

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
              onGenerateLayers={!character.is_global ? async () => {
                setActionError(null);
                setActionMessage(null);
                setGeneratingCharacterId(character.id);
                try {
                  await charactersState.generateLayers(character.id);
                  setActionMessage(`Generated layers for ${character.name}.`);
                } catch (e) {
                  setActionError((e as Error).message);
                } finally {
                  setGeneratingCharacterId(null);
                }
              } : undefined}
              generatingLayers={generatingCharacterId === character.id}
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
            setActionError(null);
            setActionMessage(null);
            if (editingCharacter.id) {
              await charactersState.update(editingCharacter.id, payload, { generateLayers: true });
              setActionMessage(`Saved ${payload.name} and regenerated layers.`);
            } else {
              await charactersState.create(payload.name, payload.content_md, payload.tags, { generateLayers: true });
              setActionMessage(`Created ${payload.name} with fresh layers.`);
            }
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

      {importingCharacter && (
        <TextImportModal
          onClose={() => setImportingCharacter(false)}
          onSubmit={async ({ sourceText, generateLayers }) => {
            await charactersState.createFromText(sourceText, generateLayers);
          }}
        />
      )}
    </div>
  );
}