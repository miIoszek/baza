-- Cap company profile fields at FE/BE validation maxima so large strings
-- cannot land in Postgres even if ValidationPipe is bypassed.
-- description / base_location stay nullable-empty at DB (defaults '');
-- MinLength(1) remains enforced by Nest + FE on write paths.

alter table public.companies
  alter column name type varchar(120),
  alter column nip type varchar(10),
  alter column description type varchar(2000),
  alter column base_location type varchar(200);

alter table public.companies
  drop constraint if exists companies_name_min_len,
  drop constraint if exists companies_nip_digits;

alter table public.companies
  add constraint companies_name_min_len check (char_length(name) >= 2),
  add constraint companies_nip_digits check (nip ~ '^\d{10}$');
