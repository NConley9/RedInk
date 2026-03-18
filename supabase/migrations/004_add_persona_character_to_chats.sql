alter table if exists public.chats
add column if not exists persona_character_id uuid references public.characters(id) on delete set null;

create index if not exists idx_chats_persona_character on public.chats(persona_character_id);
