-- Driver applications (S-04). Nest service_role is the only access path.

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_offer_id uuid not null references public.job_offers (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  email varchar(254) not null,
  phone varchar(32) not null,
  message varchar(2000) null,
  cv_file_key text not null,
  consent_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint job_applications_email_len check (
    char_length(email) >= 3 and char_length(email) <= 254
  ),
  constraint job_applications_phone_len check (
    char_length(phone) >= 3 and char_length(phone) <= 32
  ),
  constraint job_applications_message_len check (
    message is null or char_length(message) <= 2000
  ),
  constraint job_applications_cv_key_len check (char_length(cv_file_key) >= 1)
);

create index if not exists job_applications_company_id_idx
  on public.job_applications (company_id);

create index if not exists job_applications_job_offer_id_idx
  on public.job_applications (job_offer_id);

alter table public.job_applications enable row level security;

revoke all on table public.job_applications from anon, authenticated;

grant select, insert, update, delete on table public.job_applications to service_role;
