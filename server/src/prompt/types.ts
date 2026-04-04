export interface ReferenceChunk {
  id: string;
  triggers: string[];
  content: string;
}

export interface PromptCharacterContext {
  id?: string;
  name: string;
  content_md?: string | null;
  voice_card_yaml?: string | null;
  reference_chunks?: ReferenceChunk[] | null;
}
