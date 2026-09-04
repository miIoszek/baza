-- companies profile for Baza company accounts (FR-001)
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  nip text not null,
  description text not null default '',
  base_location text not null default '',
  photo_key text null,
  photo_urls jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_user_id_idx on public.companies (user_id);

alter table public.companies enable row level security;

create policy "Companies are publicly readable"
  on public.companies for select
  using (true);

create policy "Users can insert own company"
  on public.companies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own company"
  on public.companies for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
