---
id: T-22
typ: zadanie
status: todo
priorytet: P2
obszar: [wydajność, koszty]
projekt: Baza
szacunek: 45min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/wydajność]
---

# T-22 Cache-Control na publicznych GET

## Problem

Publiczne endpointy nie ustawiają żadnych nagłówków cache:

- `GET /api/offers` (`offers-public.controller.ts:35-40`)
- `GET /api/offers/:id`
- `GET /api/companies` (`company-public.controller.ts:17-19`)
- `GET /api/companies/:id`
- `GET /api/geo/countries` — **dane całkowicie statyczne**, zwracane z tablicy w kodzie (`geo/country-centroids.ts`), a mimo to liczone przy każdym żądaniu

Każde wejście na listę ofert idzie prosto do Supabase. Do tego dochodzi refetch przy każdej zmianie filtra (`job-offers-page.ts:165-191`).

Trzy koszty naraz: rachunek za Supabase, opóźnienie dla kierowcy i zużycie globalnego limitu ([[T-01 Trust proxy dla rate limitingu]]).

## Jak naprawić

Zacznij od `/api/geo/countries` — zero ryzyka, dane się nie zmieniają:

```ts
@Get('countries')
@Header('Cache-Control', 'public, max-age=86400, immutable')
listCountries(): CountryCentroid[] { ... }
```

Dla list ofert krótki cache z rewalidacją — kierowca nie potrzebuje sekundowej świeżości:

```ts
@Get()
@Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
list(@Query() query: ListOffersQueryDto): Promise<JobOffer[]> { ... }
```

> [!warning] Nie dotykaj endpointów za autoryzacją
> `/api/company/*` i `/api/auth/me` muszą zostać bez cache. Pobieranie CV ma już poprawnie `private, no-store` (`company.controller.ts:115`) — zostaw.

Wzorzec `@Header` jest już w repo, więc to spójne z resztą.

## Dalej

Gdy ruch urośnie: Cloudflare przed API (cache na brzegu zamiast w przeglądarce). Ale najpierw nagłówki — bez nich żaden cache i tak nie zadziała.

## Definicja ukończenia

- [ ] `/api/geo/countries` z długim cache
- [ ] Publiczne listy z krótkim cache + SWR
- [ ] Endpointy autoryzowane bez zmian (zweryfikowane)
- [ ] Sprawdzone, że zmiana oferty pojawia się w akceptowalnym czasie

## Powiązane
- [[T-01 Trust proxy dla rate limitingu]]
- [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci]]
