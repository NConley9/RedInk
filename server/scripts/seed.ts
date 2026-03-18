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

    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('name', name)
      .is('user_id', null)
      .maybeSingle();

    const query = existing?.id
      ? supabase
          .from(table)
          .update({ content_md, tags, is_global: true, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      : supabase
          .from(table)
          .insert({ name, content_md, tags, is_global: true, user_id: null });

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
  await seedDirectory(CHARACTERS_DIR, 'characters', ['global', 'character']);
  await seedDirectory(SCENARIOS_DIR, 'scenarios', ['global', 'scenario']);
  console.log('\nSeed complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
