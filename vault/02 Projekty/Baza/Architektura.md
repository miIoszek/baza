---
typ: dokumentacja
projekt: Baza
aktualizacja: 2026-09-18
tags: [dokumentacja, architektura]
---

# Architektura

Monorepo Nx: NestJS API + Angular SPA + biblioteki współdzielone.

## Mapa repo

| Ścieżka | Rola |
| ------- | ---- |
| `apps/baza-api` | API NestJS, globalny prefiks `/api` |
| `apps/baza-frontend` | SPA Angular 22 (Material, sygnały, standalone) |
| `libs/shared/types` | `@baza/shared-types` — DTO i kontrakty dzielone przez FE i BE |
| `libs/baza/ui` | `@baza/ui` — kit UI |
| `libs/api/core` | `@baza/api-core` — bootstrap Nesta (CORS, walidacja, filtr wyjątków) |
| `libs/api/data-access` | `@baza/api-data-access` — warstwa danych |

Aliasy w `tsconfig.base.json`, granice modułów pilnowane przez `@nx/enforce-module-boundaries`.

## Kluczowa decyzja: wszystko przez Nest

Frontend **nie rozmawia z PostgREST**. Supabase jest używane tylko jako:
- dostawca Auth (FE trzyma sesję, `supabase-client.ts`)
- baza danych, do której sięga wyłącznie Nest przez `service_role`

Wszystkie tabele mają `revoke all ... from anon, authenticated`. Szczegóły i uzasadnienie: [[Model danych i RLS]].

**Konsekwencja:** każda reguła biznesowa musi być w Neście, bo nie ma drugiej ścieżki do danych. Gate'y typu „nie opublikujesz oferty bez współrzędnych" (`job-offer.service.ts:447-460`) są egzekwowalne tylko dlatego, że nie da się ich obejść przez PostgREST. To dobra decyzja — była podjęta świadomie po tym, jak wcześniejsza wersja pozwalała na obejście (patrz komentarz w migracji `20260911120000`).

## Przepływ autoryzacji

```
Angular                          Nest                        Supabase
───────                          ────                        ────────
supabase.auth.signIn()  ────────────────────────────────────▶ Auth
      │
      │ access_token w pamięci klienta Supabase
      ▼
authInterceptor
  dokleja Bearer      ─────────▶ JwtAuthGuard
                                   │ getUserFromAccessToken()
                                   ├────────────────────────▶ Auth (weryfikacja)
                                   ▼
                                 req.user
                                   │
                                 serwis ──── service_role ──▶ Postgres (RLS pominięte)
```

Uwagi:
- `JwtAuthGuard` woła Supabase przy **każdym** żądaniu (`supabase-auth.service.ts:28-34`) — poprawne, ale to sieciowy round-trip na request. Gdy zacznie boleć, rozważ lokalną weryfikację podpisu JWT.
- Interceptor dopasowuje po `includes('/api/')` — mina na przyszłość, patrz [[T-21 Interceptor dokleja token po dopasowaniu podłańcucha|T-21]].

## Warstwy w API

```
Controller   walidacja (DTO + ValidationPipe), autoryzacja (guard), kształt HTTP
    ▼
Service      reguły biznesowe, własność zasobu (.eq('company_id', ...))
    ▼
Supabase     dostęp do danych przez service_role
```

Własność zasobu jest sprawdzana **w zapytaniu**, nie po pobraniu — np. `.eq('id', offerId).eq('company_id', company.id)`. To dobry wzorzec: nie da się przypadkiem pominąć sprawdzenia.

## Obsługa plików

Dwa osobne buckety R2:

| Bucket | Zawartość | Dostęp |
| ------ | --------- | ------ |
| publiczny | logo firm (oryginał + warianty 48/96/192/512 webp) | publiczny URL, `max-age=31536000, immutable` |
| prywatny | CV kierowców | **wyłącznie** streaming przez Nest po sprawdzeniu właściciela |

`R2StorageService` odmawia startu, gdy oba wskazują ten sam bucket. CV nigdy nie dostaje publicznego URL-a.

## Frontend

- Angular 22, komponenty standalone, sygnały zamiast RxJS w stanie
- Routing z guardami (`companyAuthGuard`, `guestAuthGuard`)
- Mapa: Leaflet + GeoJSON krajów (dziś z zewnętrznego CDN — [[T-17 GeoJSON z zewnętrznego CDN|T-17]])
- Stan filtrów żyje w query params — filtry są linkowalne, co dla tablicy ofert jest słuszne

## Powiązane

- [[Baza]] · [[Stack i infrastruktura]] · [[Model danych i RLS]]
