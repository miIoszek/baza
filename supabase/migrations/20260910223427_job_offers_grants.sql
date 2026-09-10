-- Nest uses service_role; PostgREST roles need DML grants on job_offers
-- (table was created without SELECT/INSERT/UPDATE/DELETE).

grant select, insert, update, delete on table public.job_offers to anon, authenticated, service_role;
