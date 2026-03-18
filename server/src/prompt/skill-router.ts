import type { ChatMessage } from '../providers/types.js';

type SelectedSkill = {
  key: 'dirty-talk' | 'cumshot';
  content: string;
};

const DIRTY_TALK_PATTERNS = [
  /dirty\s*talk/i,
  /degrad/i,
  /taunt/i,
  /dialog/i,
  /verbal/i,
  /talk\s+filthy/i,
  /humiliat/i,
  /command me/i,
];

const CUMSHOT_PATTERNS = [
  /cumshot/i,
  /creampie/i,
  /facial/i,
  /orgasm/i,
  /climax/i,
  /finish\s+inside/i,
  /where\s+do\s+you\s+want\s+it/i,
  /ejaculat/i,
  /cum\s+inside/i,
  /cum\s+on/i,
];

function hasMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((rx) => rx.test(text));
}

export function selectRelevantSkills(params: {
  mode?: string;
  scenarioContent?: string;
  messages: ChatMessage[];
  dirtyTalkSkill: string;
  cumshotSkill: string;
}): SelectedSkill[] {
  const mode = params.mode || '';
  const lastMessages = params.messages.slice(-6).map((m) => m.content).join('\n');
  const scenario = params.scenarioContent || '';
  const combined = `${lastMessages}\n${scenario}`;

  const skills: SelectedSkill[] = [];

  const dirtyTalkRelevant =
    hasMatch(combined, DIRTY_TALK_PATTERNS) ||
    mode === 'role_play' ||
    mode === 'sexting';

  const cumshotRelevant =
    hasMatch(combined, CUMSHOT_PATTERNS) ||
    /\/cumshot/i.test(scenario);

  if (dirtyTalkRelevant) {
    skills.push({ key: 'dirty-talk', content: params.dirtyTalkSkill });
  }

  if (cumshotRelevant) {
    skills.push({ key: 'cumshot', content: params.cumshotSkill });
  }

  return skills;
}
