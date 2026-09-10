-- Public company reads go through Nest (GET /api/companies/:id).
-- Anon/PostgREST must not SELECT companies (avoids leaking user_id / photo_key).
-- Nest uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS.

drop policy if exists "Companies are publicly readable" on public.companies;

-- Owners may still read their own row via a user JWT (not required by FE today).
create policy "Users can select own company"
  on public.companies for select
  using (auth.uid() = user_id);
