-- Tighten phone format: digits (+ optional) with spacing; 9–15 digits after strip.
-- Drop invalid MVP/test rows that predate the rule.

delete from public.job_applications
where not (
  phone ~ '^\+?[0-9][0-9[:space:]()/-]{7,30}$'
  and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15
);

alter table public.job_applications
  drop constraint if exists job_applications_phone_format;

alter table public.job_applications
  add constraint job_applications_phone_format check (
    phone ~ '^\+?[0-9][0-9[:space:]()/-]{7,30}$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15
  );
