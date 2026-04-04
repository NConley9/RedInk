import type { ChatMessage } from '../providers/types.js';
import { getPromptAssets } from './assets.js';
import { selectRelevantChunks } from './character-router.js';
import { selectRelevantSkills } from './skill-router.js';
import type { PromptCharacterContext, ReferenceChunk } from './types.js';

const TEXTING_BASE_INSTRUCTIONS = `You are roleplaying as a real person in an ongoing text conversation.

Stay strictly in character based on the voice card and activated context below.
Your job is to reply like a real person texting, not like an assistant writing prose.

Rules:
- Match the character's cadence, vocabulary, humor, punctuation, and emotional habits.
- Prefer short, natural text-message responses unless the situation clearly calls for more.
- Do not summarize the profile.
- Do not sound generic, polished, therapeutic, or AI-like unless the character would.
- Do not invent major life facts that contradict the provided context.
- If context is missing, infer in the most in-character way possible.
- Stay conversational and immediate.`;

const MODE_INSTRUCTIONS: Record<string, string> = {
  long_form: `## Current Mode: Long Form
Extended narrative — full chapters. Write immersive, novelistic prose.
- Chapter 1 arc: resistance to escalation through climax.
- Respect [BREAK] markers in scenarios as pause points.
- Continue story progression without recaps when resumed.`,

  role_play: `## Current Mode: Role Play
Collaborative back-and-forth in short to medium turns.
- Keep responses direct, character-authentic, and continuous.
- Avoid summaries and out-of-scene narration unless requested.`,

  sexting: `## Current Mode: Sexting
First-person text-style roleplay.
- Keep responses concise and message-like.
- If explicit image intent is present, you may emit [📷 ATTACHMENT: ...] blocks.`,

  texting: `## Current Mode: Texting
Casual text-message conversation.
- Keep responses concise and message-like.
- Non-sexual by default, but follow the user's lead naturally.
- Use the voice card as the primary guide for behavior and tone.
- No assistant framing, no scene-setting, no summaries.`,
};

function pushCharacterContext(parts: string[], heading: string, character?: PromptCharacterContext | null) {
  if (!character) return;

  if (character.voice_card_yaml) {
    parts.push('', `${heading}\nname: ${character.name}\n${character.voice_card_yaml}`);
    return;
  }

  if (character.content_md) {
    parts.push('', `${heading}\n${character.content_md}`);
  }
}

export async function buildServerSystemPrompt(params: {
  mode?: string;
  personaCharacter?: PromptCharacterContext | null;
  loveInterestCharacter?: PromptCharacterContext | null;
  scenarioContent?: string | null;
  memoryChunks?: ReferenceChunk[] | null;
  messages: ChatMessage[];
  fallbackSystemPrompt?: string;
}): Promise<{ prompt: string; appliedSkills: Array<'dirty-talk' | 'cumshot'> }> {
  const assets = await getPromptAssets();

  const selectedSkills = selectRelevantSkills({
    mode: params.mode,
    scenarioContent: params.scenarioContent || undefined,
    messages: params.messages,
    dirtyTalkSkill: assets.dirtyTalkSkill,
    cumshotSkill: assets.cumshotSkill,
  });

  const selectedChunks = selectRelevantChunks({
    characterChunks: [
      ...(params.personaCharacter?.reference_chunks || []),
      ...(params.loveInterestCharacter?.reference_chunks || []),
    ],
    memoryChunks: params.memoryChunks,
    messages: params.messages,
    scenarioContent: params.scenarioContent || undefined,
  });

  const parts: string[] = [params.mode === 'texting' ? TEXTING_BASE_INSTRUCTIONS : assets.instructions];

  if (params.mode && MODE_INSTRUCTIONS[params.mode]) {
    parts.push('', MODE_INSTRUCTIONS[params.mode]);
  }

  pushCharacterContext(parts, '# User Persona', params.personaCharacter);
  pushCharacterContext(parts, '# Love Interest Character', params.loveInterestCharacter);

  if (params.scenarioContent) {
    parts.push('', `# Scenario\n${params.scenarioContent}`);
  }

  if (selectedChunks.length > 0) {
    parts.push('', '## Activated Context');
    for (const chunk of selectedChunks) {
      parts.push('', `### ${chunk.source}:${chunk.id}\n${chunk.content}`);
    }
  }

  if (selectedSkills.length > 0) {
    parts.push('', '## Auto-Activated Skills');
    for (const skill of selectedSkills) {
      parts.push('', `### Skill: ${skill.key}\n${skill.content}`);
    }
  }

  if (params.fallbackSystemPrompt) {
    parts.push('', '## Client Prompt Context', params.fallbackSystemPrompt);
  }

  return {
    prompt: parts.join('\n'),
    appliedSkills: selectedSkills.map((s) => s.key),
  };
}
