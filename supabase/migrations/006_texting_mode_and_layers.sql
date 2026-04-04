alter table public.chats drop constraint if exists chats_mode_check;

alter table public.chats
  add constraint chats_mode_check check (mode in ('long_form', 'role_play', 'sexting', 'texting'));

alter table public.characters
  add column if not exists voice_card_yaml text,
  add column if not exists reference_chunks jsonb not null default '[]'::jsonb;

alter table public.chats
  add column if not exists memory_chunks jsonb not null default '[]'::jsonb,
  add column if not exists memory_cursor_message_count integer not null default 0;
