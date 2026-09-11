-- Required driving-license category on job offers (S-03 filters).
-- Wire/DB code C_E (not C+E) — plus breaks query-string decoding.

alter table public.job_offers
  add column if not exists license_category varchar(8) not null default 'C';

alter table public.job_offers
  drop constraint if exists job_offers_license_category_check;

alter table public.job_offers
  add constraint job_offers_license_category_check
    check (license_category in ('B', 'C', 'CE', 'C_E'));
