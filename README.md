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

## Course toolkit

`context/`, `skills/`, `prompts/`, `.cursor/` to tooling kursu / agentów — nie traktuj ich jako kodu runtime aplikacji.
