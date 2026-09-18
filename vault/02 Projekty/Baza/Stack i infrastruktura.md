---
typ: dokumentacja
projekt: Baza
aktualizacja: 2026-09-18
tags: [dokumentacja, infrastruktura]
---

# Stack i infrastruktura

> [!note] Stack jest zablokowany
> `AGENTS.md` traktuje te wybory jako wiążące: zmiana wymaga aktualizacji `context/foundation/tech-stack.md`, nie tylko kodu.

## Gdzie co stoi

| Warstwa | Dostawca | Uwagi |
| ------- | -------- | ----- |
| Auth + DB | Supabase | Postgres + Auth; `max_rows = 1000` — patrz [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci\|T-06]] |
| API | Railway | `railway.toml`, builder RAILPACK, restart ON_FAILURE ×10 |
| Frontend | Cloudflare Pages | projekt `baza-app`, deploy przez `wrangler` |
| Pliki | Cloudflare R2 | dwa buckety: publiczny (logo) i prywatny (CV) |
| Błędy | Sentry | `tracesSampleRate: 0`, source mapy z CI |

Node: `>=22 <23` (`.nvmrc`).

## Zmienne środowiskowe

### Wymagane — API nie wstanie bez nich

`assertRequiredSupabaseEnv` (`apps/baza-api/src/supabase-env.ts`) blokuje start:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

To dobry wzorzec fail-closed. Warto rozszerzyć go o `CORS_ORIGIN` — [[T-11 CORS fail-open|T-11]].

### Pozostałe API

| Zmienna | Rola |
| ------- | ---- |
| `CORS_ORIGIN` | lista origin po przecinku; **brak = odbij dowolny** ([[T-11 CORS fail-open\|T-11]]) |
| `PORT` | wstrzykiwane przez Railway; lokalnie **nie ustawiaj** (Angular CLI też je czyta) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | bucket publiczny |
| `R2_PUBLIC_URL` | baza URL-i publicznych; **nie** host S3 API |
| `R2_PRIVATE_BUCKET` | bucket na CV; musi być inny niż `R2_BUCKET` |
| `R2_PRIVATE_*` | opcjonalne; przy braku dziedziczą z `R2_*` |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | opcjonalne; puste = SDK no-op |

> [!danger] Nigdy na froncie ani w repo
> `SUPABASE_SERVICE_ROLE_KEY` omija RLS — to klucz do wszystkiego.
> `SENTRY_AUTH_TOKEN` tylko w GitHub Actions, nigdy w Pages ani w `.env`.

### Frontend

Front nie czyta `process.env` — konfiguracja jest wypalana w build:

- lokalnie: `environment.local.ts` (gitignored), tworzony przez `scripts/ensure-fe-env.mjs`
- produkcja: `scripts/write-fe-production-env.mjs` nadpisuje `environment.production.ts` w CI z sekretów

Wersja w repo jest celowo pusta (placeholder-safe).

> [!warning] Zaszyty fallback
> `write-fe-production-env.mjs:5-6` ma na sztywno `https://baza-api-production-4306.up.railway.app` jako domyślny `API_BASE_URL`. Przy zmianie domeny API trzeba pamiętać o tym pliku albo ustawić `API_BASE_URL` w Actions.

## Sekrety GitHub Actions

`RAILWAY_TOKEN` · `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SENTRY_DSN` · `SENTRY_AUTH_TOKEN` · `SENTRY_ORG` · `SENTRY_PROJECT`

Dojdą przy [[T-08 Migracje poza pipeline'em|T-08]]: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

## Powiązane

- [[Deploy na produkcję]] · [[CI-CD i deploy]] · [[Architektura]]
