export const GENERATION_SYSTEM_PROMPT = `You extract structured roleplay data from long-form character dossiers.

Return valid JSON only. Do not wrap it in markdown fences. Do not add commentary.

Requirements:
- Preserve the character's actual voice, not a generic assistant voice.
- Keep voice_card_yaml human-readable YAML.
- Keep reference_chunks compact and retrieval-friendly.
- Triggers must include names, nicknames, relationship labels, and likely topic words.
- Never invent major facts not supported by the source text.`;

export function buildGenerateLayersPrompt(content: string): string {
  return `Read the character dossier below and return a JSON object with this shape:
{
  "voice_card_yaml": "string",
  "reference_chunks": [{ "id": "string", "triggers": ["string"], "content": "string" }]
}

The voice_card_yaml must contain these sections:
- identity
- voice_rules (8-12 bullets)
- signature_phrases (5-10)
- tonal_modes (4-6)
- hard_boundaries (6-10)
- key_facts (10-15)
- example_texts (10)

The reference_chunks array should contain 8-15 chunks across major relationships, family, career, worldview, hobbies, backstory periods, and any especially reusable contextual material.

Character dossier:
${content}`;
}

export function buildCharacterFromTextPrompt(sourceText: string): string {
  return `Read the text below and create a character record from it.

Return a JSON object with this shape:
{
  "name": "string",
  "content_md": "string",
  "tags": ["string"],
  "voice_card_yaml": "string",
  "reference_chunks": [{ "id": "string", "triggers": ["string"], "content": "string" }]
}

Rules:
- Infer the best canonical character name from the text.
- content_md should be clean markdown, preserving the original useful detail.
- tags should be short and searchable.
- If the text is messy, normalize it into a clean character dossier rather than copying junk formatting blindly.
- Default to a single character record, not a cast list.

Source text:
${sourceText}`;
}

export function buildMemoryChunkPrompt(messagesText: string, existingMemoryText: string): string {
  return `Return valid JSON only with this shape:
{
  "memory_chunks": [{ "id": "string", "triggers": ["string"], "content": "string" }]
}

Extract only notable chat-specific memory chunks from the recent conversation.
- Capture: new facts, relationship shifts, promises, conflicts, running jokes, recurring preferences.
- Ignore routine small talk.
- Use trigger "*" only for always-relevant chat memory.
- Keep each chunk compact.
- Reuse or refine existing memory ids when clearly appropriate.

Existing memory chunks:
${existingMemoryText || '[]'}

Recent messages:
${messagesText}`;
}
