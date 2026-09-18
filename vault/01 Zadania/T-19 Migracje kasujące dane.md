---
id: T-19
typ: zadanie
status: todo
priorytet: P2
obszar: [dane, proces]
projekt: Baza
szacunek: 30min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/dane]
---

# T-19 Migracje kasujące dane

> [!danger] To już się wydarzyło
> Te migracje są w repo i zostały odpalone. Zadanie dotyczy tego, żeby się nie powtórzyło — i sprawdzenia, czy nic nie zginęło.

## Problem

Dwie migracje kasują wiersze, żeby nowy constraint się założył:

```sql
-- 20260911220000_job_applications_phone_format.sql
delete from public.job_applications
where not (
  phone ~ '^\+?[0-9][0-9[:space:]()/-]{7,30}$'
  and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 9 and 15
);
```

```sql
-- 20260911230000_job_applications_phone_len_16.sql
delete from public.job_applications
where not ( char_length(phone) between 9 and 16 and ... );
```

Odpalone na produkcji **po cichu kasują realne aplikacje kierowców** — czyli lead firmy i dane osobowe, na których przetwarzanie ktoś wyraził zgodę. Bez logu, bez kopii, bez informacji dla kogokolwiek.

Komentarz w pliku mówi „Drop invalid MVP/test rows that predate the rule", więc intencja była czysta. Ale migracja nie odróżnia wiersza testowego od prawdziwego — kasuje wszystko, co nie pasuje do nowego regexa. Numer zapisany jako `+48 12 345 67 89 wew. 3` nie jest śmieciem, tylko danymi, które właśnie zniknęły.

## Do zrobienia teraz

- [ ] Sprawdź, czy na produkcji faktycznie nic wartościowego nie zginęło (`created_at` vs. daty tych migracji)

## Zasada na przyszłość

Migracja nigdy nie kasuje danych, żeby założyć constraint. Zamiast tego:

```sql
-- 1. kwarantanna zamiast delete
create table if not exists public.job_applications_kwarantanna
  (like public.job_applications including all);

insert into public.job_applications_kwarantanna
select * from public.job_applications
where not (<nowy warunek>);

delete from public.job_applications
where id in (select id from public.job_applications_kwarantanna);

-- 2. dopiero teraz constraint
alter table public.job_applications add constraint ... ;
```

Dane da się odzyskać, a tabela kwarantanny sama mówi, ile i czego dotyczyło.

Alternatywa dla prawdziwie śmieciowych danych: `NOT VALID` constraint, który obowiązuje nowe wiersze i zostawia stare w spokoju:

```sql
alter table ... add constraint ... check (...) not valid;
```

> [!tip] Zapisz to jako zasadę
> Dodaj do [[CI-CD i deploy]] i do [[Deploy na produkcję]]: **żadna migracja nie zawiera `delete` ani `drop column` bez jawnej kopii danych**.

## Definicja ukończenia

- [ ] Produkcja sprawdzona pod kątem utraconych aplikacji
- [ ] Zasada zapisana w runbooku deployu
- [ ] Wzorzec kwarantanny opisany dla przyszłych migracji

## Powiązane
- [[T-08 Migracje poza pipeline'em]]
- [[Model danych i RLS]], [[RODO i dane osobowe]]
