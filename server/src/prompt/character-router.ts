import type { ChatMessage } from '../providers/types.js';
import type { ReferenceChunk } from './types.js';

type ChunkSource = 'character' | 'memory';

export interface ActivatedChunk extends ReferenceChunk {
  source: ChunkSource;
  score: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTriggerRegex(trigger: string): RegExp {
  const normalized = trigger.trim();
  if (!normalized || normalized === '*') {
    return /.^/;
  }

  if (/\s/.test(normalized)) {
    return new RegExp(escapeRegExp(normalized), 'i');
  }

  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');
}

function scoreChunk(text: string, chunk: ReferenceChunk): number {
  return chunk.triggers.reduce((score, trigger) => {
    if (trigger === '*') return score;
    return buildTriggerRegex(trigger).test(text) ? score + 1 : score;
  }, 0);
}

function normalizeChunks(chunks: ReferenceChunk[] | null | undefined): ReferenceChunk[] {
  return Array.isArray(chunks)
    ? chunks.filter((chunk) => chunk && typeof chunk.id === 'string' && Array.isArray(chunk.triggers) && typeof chunk.content === 'string')
    : [];
}

export function selectRelevantChunks(params: {
  characterChunks?: ReferenceChunk[] | null;
  memoryChunks?: ReferenceChunk[] | null;
  messages: ChatMessage[];
  scenarioContent?: string;
  limit?: number;
  alwaysLimit?: number;
}): ActivatedChunk[] {
  const combinedText = `${params.messages.slice(-6).map((message) => message.content).join('\n')}\n${params.scenarioContent || ''}`;
  const limit = params.limit ?? 4;
  const alwaysLimit = params.alwaysLimit ?? 2;

  const candidates: ActivatedChunk[] = [
    ...normalizeChunks(params.characterChunks).map((chunk) => ({ ...chunk, source: 'character' as const, score: scoreChunk(combinedText, chunk) })),
    ...normalizeChunks(params.memoryChunks).map((chunk) => ({ ...chunk, source: 'memory' as const, score: scoreChunk(combinedText, chunk) })),
  ];

  const alwaysInclude = candidates
    .filter((chunk) => chunk.triggers.includes('*'))
    .slice(0, alwaysLimit);

  const matched = candidates
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  const deduped = new Map<string, ActivatedChunk>();
  for (const chunk of [...alwaysInclude, ...matched]) {
    if (!deduped.has(chunk.id)) {
      deduped.set(chunk.id, chunk);
    }
  }

  return Array.from(deduped.values());
}
