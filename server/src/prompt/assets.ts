import { readFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase-admin.js';

const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');

const FALLBACK_INSTRUCTIONS = `# Identity
Expert fiction assistant for long-form writing, role-play, and sexting.

# Non-negotiable behavior
- Keep responses immersive and in-character.
- Respect selected mode, character, and scenario context.
- Never summarize when active scene continuation is requested.
`;

const FALLBACK_DIRTY_TALK = `# Dirty Talk Skill
Use dialogue to escalate scene tension naturally when verbal dynamics are central.
`;

const FALLBACK_CUMSHOT = `# Cumshot Skill
When climax-focused context appears, write detailed edge, eruption, and aftermath beats.
`;

type PromptAssetCache = {
  instructions: string;
  dirtyTalkSkill: string;
  cumshotSkill: string;
};

let cache: Promise<PromptAssetCache> | null = null;

type PromptAssetKey = 'instructions-nicks-erotica.md' | 'skill-dirty-talk.md' | 'skill-cumshot.md';

async function readPromptAssetFromDb(fileName: PromptAssetKey): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('content_md')
    .eq('key', fileName)
    .maybeSingle();

  if (error || !data?.content_md) return null;
  return data.content_md;
}

async function readOrFallback(fileName: string, fallback: string): Promise<string> {
  const dbValue = await readPromptAssetFromDb(fileName as PromptAssetKey);
  if (dbValue) return dbValue;

  try {
    return await readFile(path.join(PROMPTS_DIR, fileName), 'utf-8');
  } catch {
    return fallback;
  }
}

export function invalidatePromptAssetsCache() {
  cache = null;
}

export async function getPromptAssets(): Promise<PromptAssetCache> {
  if (!cache) {
    cache = (async () => {
      const [instructions, dirtyTalkSkill, cumshotSkill] = await Promise.all([
        readOrFallback('instructions-nicks-erotica.md', FALLBACK_INSTRUCTIONS),
        readOrFallback('skill-dirty-talk.md', FALLBACK_DIRTY_TALK),
        readOrFallback('skill-cumshot.md', FALLBACK_CUMSHOT),
      ]);

      return { instructions, dirtyTalkSkill, cumshotSkill };
    })();
  }

  return cache;
}
