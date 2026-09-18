---
typ: dokumentacja
projekt: Baza
aktualizacja: 2026-09-18
tags: [dokumentacja, dane, obszar/bezpieczeństwo]
---

# Model danych i RLS

## Tabele

### `companies`

Profil firmy. `user_id` → `auth.users` z `on delete cascade`, `unique`.

Pola: `name` varchar(120), `nip` varchar(10), `description` varchar(2000), `base_location` varchar(200), `base_lat`/`base_lng` double, `photo_key`, `photo_urls` jsonb.

Constrainty: długości lustrzane do walidacji w DTO, `name >= 2 znaki`, `nip ~ '^\d{10}$'`, współrzędne parami i w zakresie.

> [!warning] Brakuje `UNIQUE (nip)` → [[T-04 Unikalność i weryfikacja NIP]]

### `job_offers`

`company_id` → `companies` cascade. Trasy w `routes` (jsonb, domyślnie `[]`). Widełki płac jako trójka min/max/currency z constraintem spójności. `license_category` in `('B','C','CE','C_E')` — kod `C_E` zamiast `C+E`, bo plus psuje dekodowanie query stringa.

Indeksy: `company_id`, partial na `published = true`.

> [!warning] Brakuje limitu na `routes` → [[T-09 Nieograniczona tablica routes]]

### `job_applications`

`job_offer_id` i `company_id` → cascade. `email` varchar(254), `phone` varchar(16), `message` varchar(2000), `cv_file_key` text, `consent_accepted_at` timestamptz.

Telefon ma podwójny constraint: format regexem **i** liczba cyfr po odfiltrowaniu (9–15).

> [!warning] Brak retencji → [[T-16 Retencja danych aplikacji i CV]]
> Brak ochrony przed duplikatami → [[T-14 Brak ochrony przed duplikatami aplikacji]]

## Model dostępu — dlaczego wszystko przez Nest

To najlepiej przemyślana część projektu. Warto rozumieć, jak do tego doszło.

**Etap 1** (`20260904120000`): klasyczne polityki RLS — publiczny SELECT na `companies`, właściciel może INSERT/UPDATE.

**Etap 2** (`20260909120000`): publiczny SELECT zdjęty, bo wyciekał `user_id` i `photo_key`. Odczyt publiczny przeniesiony do Nesta, który zwraca tylko wybrane pola.

**Etap 3** (`20260911120000`, `20260911121000`): pełne odcięcie PostgREST.

```sql
revoke all on table public.job_offers from anon, authenticated;
grant select, insert, update, delete on table public.job_offers to service_role;
drop policy if exists "Users can select own company offers" on public.job_offers;
-- ...
```

Komentarz w migracji podaje powód wprost:

> anon JWT + RLS owner policies previously allowed bypassing Nest publish-coords gate

Czyli: RLS pozwalało właścicielowi pisać bezpośrednio przez PostgREST, omijając regułę „nie opublikujesz bez współrzędnych". Zamiast dublować regułę w politykach SQL, zamknięto drugą ścieżkę.

**To jest właściwa decyzja** i warto ją świadomie utrzymywać: jedna ścieżka do danych oznacza jedno miejsce na reguły biznesowe.

> [!note] RLS nadal włączone — celowo
> `enable row level security` zostaje na wszystkich tabelach, mimo że nie ma polityk. To druga warstwa: gdyby ktoś kiedyś przypadkiem przywrócił grant dla `anon`, brak polityk oznacza brak dostępu (deny by default) zamiast pełnego dostępu.

## Historia migracji

| Data | Plik | Co robi |
| ---- | ---- | ------- |
| 2026-09-04 | `create_companies` | tabela + początkowe RLS |
| 2026-09-09 | `companies_drop_public_select` | odcięcie publicznego SELECT |
| 2026-09-09 | `companies_field_length_limits` | limity długości + constrainty |
| 2026-09-10 | `job_offers_and_company_coords` | współrzędne + tabela ofert |
| 2026-09-10 | `job_offers_grants` | poprawka grantów |
| 2026-09-11 | `job_offers_nest_only` | odcięcie PostgREST |
| 2026-09-11 | `companies_nest_only` | odcięcie PostgREST |
| 2026-09-11 | `job_offers_license_category` | kategoria prawa jazdy |
| 2026-09-11 | `job_applications` | aplikacje kierowców |
| 2026-09-11 | `job_applications_phone_format` | ⚠️ **kasuje wiersze** |
| 2026-09-11 | `job_applications_phone_len_16` | ⚠️ **kasuje wiersze** |

Dwie ostatnie: [[T-19 Migracje kasujące dane]].

## Powiązane

- [[Architektura]] · [[Bezpieczeństwo]] · [[RODO i dane osobowe]]
