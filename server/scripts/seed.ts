import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Resolve the Characters/ and Scenarios/ dirs relative to the workspace root
const WORKSPACE = join(__dirname, '..', '..', '..'); // webapp/server/scripts -> workspace root
const CHARACTERS_DIR = join(WORKSPACE, 'Characters');
const SCENARIOS_DIR  = join(WORKSPACE, 'Scenarios');
const PROMPT_FILES = [
  'instructions-nicks-erotica.md',
  'skill-dirty-talk.md',
  'skill-cumshot.md',
  'prompt-skills-to-perplexity.md',
].map((fileName) => ({ fileName, path: join(WORKSPACE, fileName) }));

const STOCK_CHARACTER_KEYS = new Set(['kendra', 'tyson', 'nick', 'meganparker']);
const STOCK_SCENARIO_KEYS = new Set([
  'xxxpawn',
  'theconsolationprize',
  'theconfession',
  'freeuse',
  'suburbansecrets',
  'suburbansecretscom',
]);

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function seedDirectory(
  dir: string,
  table: 'characters' | 'scenarios',
  tags: string[],
) {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.warn(`Directory not found: ${dir} — skipping`);
    return;
  }

  const mdFiles = files.filter((f) => extname(f) === '.md');
  console.log(`\nSeeding ${table} from ${dir} (${mdFiles.length} files)...`);

  for (const file of mdFiles) {
    const name = basename(file, '.md');
    const content_md = await readFile(join(dir, file), 'utf-8');
    const normalizedName = normalizeKey(name);
    const isStock =
      table === 'characters'
        ? STOCK_CHARACTER_KEYS.has(normalizedName)
        : STOCK_SCENARIO_KEYS.has(normalizedName);

    const resolvedTags = Array.from(new Set([...(tags || []), ...(isStock ? ['stock'] : [])]));

    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('name', name)
      .is('user_id', null)
      .maybeSingle();

    const query = existing?.id
      ? supabase
          .from(table)
          .update({
            content_md,
            tags: resolvedTags,
            is_global: true,
            is_stock: isStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      : supabase
          .from(table)
          .insert({
            name,
            content_md,
            tags: resolvedTags,
            is_global: true,
            is_stock: isStock,
            user_id: null,
          });

    const { error } = await query;

    if (error) {
      console.error(`  ✗ ${name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${name}`);
    }
  }
}

async function main() {
  console.log('Starting seed...');
  for (const promptFile of PROMPT_FILES) {
    try {
      const content_md = await readFile(promptFile.path, 'utf-8');
      const { error } = await supabase
        .from('content_assets')
        .upsert({
          key: promptFile.fileName,
          content_md,
          source_filename: promptFile.fileName,
          updated_at: new Date().toISOString(),
        });

      if (error) console.error(`  ✗ prompt ${promptFile.fileName}: ${error.message}`);
      else console.log(`  ✓ prompt ${promptFile.fileName}`);
    } catch {
      console.warn(`  ! prompt ${promptFile.fileName} not found, skipping`);
    }
  }
  await seedDirectory(CHARACTERS_DIR, 'characters', ['global', 'character']);
  await seedDirectory(SCENARIOS_DIR, 'scenarios', ['global', 'scenario']);
  console.log('\nSeed complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
