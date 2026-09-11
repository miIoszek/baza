-- Align phone column with FE/BE: max 16 chars (9 digits + optional country code / spacing).

delete from public.job_applications
where not (
  char_length(phone) between 9 and 16
  and phone ~ '^\+?[0-9][0-9[:space:]()/-]{7,14}$'
  and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15
);

alter table public.job_applications
  drop constraint if exists job_applications_phone_format;

alter table public.job_applications
  drop constraint if exists job_applications_phone_len;

alter table public.job_applications
  alter column phone type varchar(16);

alter table public.job_applications
  add constraint job_applications_phone_len check (
    char_length(phone) >= 9 and char_length(phone) <= 16
  );

alter table public.job_applications
  add constraint job_applications_phone_format check (
    phone ~ '^\+?[0-9][0-9[:space:]()/-]{7,14}$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15
  );
