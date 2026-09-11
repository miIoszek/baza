-- Company map pin (manual lat/lng for S-02; Places later) + job_offers table.

alter table public.companies
  add column if not exists base_lat double precision null,
  add column if not exists base_lng double precision null;

alter table public.companies
  drop constraint if exists companies_base_coords_pair,
  drop constraint if exists companies_base_lat_range,
  drop constraint if exists companies_base_lng_range;

alter table public.companies
  add constraint companies_base_coords_pair
    check (
      (base_lat is null and base_lng is null)
      or (base_lat is not null and base_lng is not null)
    ),
  add constraint companies_base_lat_range
    check (base_lat is null or (base_lat >= -90 and base_lat <= 90)),
  add constraint companies_base_lng_range
    check (base_lng is null or (base_lng >= -180 and base_lng <= 180));

create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title varchar(120) not null,
  description varchar(2000) not null,
  home_return_cadence varchar(32) not null,
  required_years_experience integer not null
    check (required_years_experience >= 0),
  required_transport_type varchar(32) not null,
  routes jsonb not null default '[]'::jsonb,
  salary_min numeric(12, 2) null,
  salary_max numeric(12, 2) null,
  salary_currency varchar(3) null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_offers_title_len check (char_length(title) >= 2),
  constraint job_offers_description_len check (char_length(description) >= 1),
  constraint job_offers_salary_pair check (
    (salary_min is null and salary_max is null and salary_currency is null)
    or (
      salary_currency is not null
      and char_length(salary_currency) = 3
      and (salary_min is null or salary_max is null or salary_min <= salary_max)
    )
  )
);

create index if not exists job_offers_company_id_idx on public.job_offers (company_id);
create index if not exists job_offers_published_idx on public.job_offers (published)
  where published = true;

alter table public.job_offers enable row level security;

-- Match companies: Nest service_role + PostgREST roles need DML (RLS still applies to anon/authenticated).
grant select, insert, update, delete on table public.job_offers to anon, authenticated, service_role;

drop policy if exists "Users can select own company offers" on public.job_offers;
drop policy if exists "Users can insert own company offers" on public.job_offers;
drop policy if exists "Users can update own company offers" on public.job_offers;

create policy "Users can select own company offers"
  on public.job_offers for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own company offers"
  on public.job_offers for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.user_id = auth.uid()
    )
  );

create policy "Users can update own company offers"
  on public.job_offers for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.user_id = auth.uid()
    )
  );
