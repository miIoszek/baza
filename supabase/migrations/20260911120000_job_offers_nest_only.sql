-- Nest (service_role) is the only write/read path for job_offers.
-- Frontend must not talk to PostgREST for this table (anon JWT + RLS owner policies
-- previously allowed bypassing Nest publish-coords gate).

revoke all on table public.job_offers from anon, authenticated;

grant select, insert, update, delete on table public.job_offers to service_role;

drop policy if exists "Users can select own company offers" on public.job_offers;
drop policy if exists "Users can insert own company offers" on public.job_offers;
drop policy if exists "Users can update own company offers" on public.job_offers;
