create table if not exists content_assets (
  key text primary key,
  content_md text not null,
  source_filename text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table content_assets enable row level security;

create policy "Authenticated users can read content assets"
  on content_assets for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can manage content assets"
  on content_assets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');