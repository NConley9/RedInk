import type { ChatMessage } from '../providers/types.js';
import { getPromptAssets } from './assets.js';
import { selectRelevantSkills } from './skill-router.js';

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
};

export async function buildServerSystemPrompt(params: {
  mode?: string;
  personaContent?: string | null;
  loveInterestContent?: string | null;
  scenarioContent?: string | null;
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

  const parts: string[] = [assets.instructions];

  if (params.mode && MODE_INSTRUCTIONS[params.mode]) {
    parts.push('', MODE_INSTRUCTIONS[params.mode]);
  }

  if (params.personaContent) {
    parts.push('', `# User Persona\n${params.personaContent}`);
  }

  if (params.loveInterestContent) {
    parts.push('', `# Love Interest Character\n${params.loveInterestContent}`);
  }

  if (params.scenarioContent) {
    parts.push('', `# Scenario\n${params.scenarioContent}`);
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
