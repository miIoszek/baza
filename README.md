<div align="center">

<img src="apps/baza-frontend/public/baza-logo.png" alt="Baza" width="120" />

# Baza

**Baza** to tablica ofert pracy dla branży transportu.

Kierowcy szukają tu ofert dopasowanych do tras i rytmu powrotów do domu. Firmy transportowe publikują oferty (kraje/kierunki, kadencja powrotu, wymagane doświadczenie) i odbierają aplikacje — w MVP bez płatności i bez konta po stronie kierowcy.

## Co robi produkt

**Dla firm** — rejestracja, publiczny profil, publikacja darmowych ofert pracy z lokalizacją bazy i mapą tras.

**Dla kierowców** — przeglądanie ofert (lista + mapa), filtry po krajach trasy i powrocie do domu, aplikacja z CV bez zakładania konta.

Szczegóły produktu: [`context/foundation/prd.md`](context/foundation/prd.md)

</div>

## Stack (Nx monorepo)

| Path | Role |
|------|------|
| `apps/baza-api` | NestJS API |
| `apps/baza-frontend` | Angular SPA |
| `libs/shared/types` | `@baza/shared-types` — wspólne DTOs/interfejsy |
| `libs/baza/ui` | `@baza/ui` — Angular UI kit |
| `libs/api/core` | `@baza/api-core` — bootstrap Nest (CORS, validation, filters) |
| `libs/api/data-access` | `@baza/api-data-access` — warstwa danych |

Auth (własny moduł w Nest) + DB (Postgres) + API → Railway · FE → Cloudflare Pages · pliki → Cloudflare R2 (`context/foundation/tech-stack.md`).

## Commands

```sh
npm install

# API  → http://localhost:3000/api
npm run serve:api

# Frontend → http://localhost:4200  (proxies /api → :3000)
npm run serve:frontend

npm run lint
npm run test
npm run build
npm run graph
```

## Lokalne środowisko (cała aplikacja z danymi)

Postgres w Dockerze, API i front z repo, pliki (logo, CV) w Cloudflare R2.

1. **`.env`** w katalogu głównym (w `.gitignore`; nazwy zmiennych w `.env.example`). Lokalnie potrzebne:
   - `DATABASE_URL=postgresql://baza:baza@localhost:5432/baza` i `TEST_DATABASE_URL=…/baza_test`,
   - `MAIL_TRANSPORT=log` — maile (weryfikacja konta, reset hasła) trafiają do logu API zamiast do skrzynek,
   - `R2_*` — bez nich nie działa aplikowanie z CV ani logo. Skopiuj je z Railway (`railway variables --service baza-api --kv`). To te same kubełki co produkcja: póki nie ma produkcji, to OK, potem warto założyć osobne kubełki dev,
   - `E2E_EMAIL` / `E2E_PASSWORD` — konto testowej firmy (hasło: min. 10 znaków),
   - opcjonalnie `AUTH_JWT_SIGNING_KEYS` — bez niego sesje nie przeżywają restartu API.
2. `npm run dev:db` — Postgres 17 z bazami `baza` i `baza_test`.
3. `npm run serve:api` — migracje wykonują się przy starcie.
4. `npm run dev:seed` — firma testowa (`E2E_EMAIL`) z logo, pinem bazy, 3 ofertami (w tym szkic) i 3 aplikacjami z CV. Przez prawdziwe API, więc przy okazji sprawdza logowanie i R2. Drugie uruchomienie niczego nie dodaje.
5. `npm run serve:frontend` → http://localhost:4200, logowanie danymi `E2E_EMAIL` / `E2E_PASSWORD`.

Testy:

```sh
npm run test            # jednostkowe (API + front)
npm run test:api:db     # API razem z testami integracyjnymi na baza_test
npm run test:e2e        # Playwright (Firefox), ścieżki gościa
npm run test:e2e:auth   # Playwright z zalogowaną firmą (E2E_EMAIL / E2E_PASSWORD)
```

## Course toolkit

`context/`, `skills/`, `prompts/`, `.cursor/` to tooling kursu / agentów — nie traktuj ich jako kodu runtime aplikacji.
