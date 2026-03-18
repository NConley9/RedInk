-- ============================================================
-- Red Ink — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CHARACTERS
-- ============================================================
create table if not exists characters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- null = global seed
  name        text not null,
  content_md  text not null,
  tags        text[] default '{}',
  is_global   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table characters enable row level security;

-- Read: own characters OR global seeded (user_id is null)
create policy "Read own or global characters"
  on characters for select
  using (user_id = auth.uid() or user_id is null);

-- Insert own
create policy "Insert own characters"
  on characters for insert
  with check (user_id = auth.uid());

-- Update own (cannot touch global)
create policy "Update own characters"
  on characters for update
  using (user_id = auth.uid());

-- Delete own
create policy "Delete own characters"
  on characters for delete
  using (user_id = auth.uid());

-- ============================================================
-- SCENARIOS
-- ============================================================
create table if not exists scenarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  content_md  text not null,
  tags        text[] default '{}',
  is_global   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table scenarios enable row level security;

create policy "Read own or global scenarios"
  on scenarios for select
  using (user_id = auth.uid() or user_id is null);

create policy "Insert own scenarios"
  on scenarios for insert
  with check (user_id = auth.uid());

create policy "Update own scenarios"
  on scenarios for update
  using (user_id = auth.uid());

create policy "Delete own scenarios"
  on scenarios for delete
  using (user_id = auth.uid());

-- ============================================================
-- CHATS
-- ============================================================
create table if not exists chats (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null default 'New Chat',
  mode            text not null check (mode in ('long_form', 'role_play', 'sexting')),
  character_id    uuid references characters(id) on delete set null,
  scenario_id     uuid references scenarios(id) on delete set null,
  model_provider  text not null,
  model_name      text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table chats enable row level security;

create policy "Users manage own chats"
  on chats for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references chats(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  image_url   text,
  created_at  timestamptz default now()
);

alter table messages enable row level security;

create policy "Users access own chat messages"
  on messages for all
  using (
    exists (
      select 1 from chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from chats
      where chats.id = messages.chat_id
        and chats.user_id = auth.uid()
    )
  );

-- ============================================================
-- USER SETTINGS
-- ============================================================
create table if not exists user_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  api_keys              jsonb default '{}',   -- { gemini: "key", groq: "key", ... }
  api_keys_configured   text[] default '{}',  -- ['gemini', 'groq'] — safe to expose
  model_configs         jsonb default '{}',   -- { gemini: { model: '...', temp: 1 }, ... }
  lmstudio_base_url     text default 'http://localhost:1234/v1',
  updated_at            timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users manage own settings"
  on user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_characters_user on characters(user_id);
create index if not exists idx_scenarios_user  on scenarios(user_id);
create index if not exists idx_chats_user      on chats(user_id);
create index if not exists idx_messages_chat   on messages(chat_id);
create index if not exists idx_messages_created on messages(created_at);
create unique index if not exists idx_global_character_name on characters(lower(name)) where user_id is null;
create unique index if not exists idx_global_scenario_name on scenarios(lower(name)) where user_id is null;
