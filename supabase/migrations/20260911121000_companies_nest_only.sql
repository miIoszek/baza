-- Nest (service_role) is the only path for companies — same model as job_offers.
-- Frontend must not read/write companies via PostgREST (anon key + JWT).

revoke all on table public.companies from anon, authenticated;

grant select, insert, update, delete on table public.companies to service_role;

drop policy if exists "Companies are publicly readable" on public.companies;
drop policy if exists "Users can select own company" on public.companies;
drop policy if exists "Users can insert own company" on public.companies;
drop policy if exists "Users can update own company" on public.companies;
