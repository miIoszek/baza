---
id: T-09
typ: zadanie
status: todo
priorytet: P1
obszar: [bezpieczeństwo, wydajność]
projekt: Baza
szacunek: 20min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/bezpieczeństwo
---

# T-09 Nieograniczona tablica routes

## Problem

`company/dto/job-offer.dto.ts:68-72` ma dolny limit, nie ma górnego:

```ts
@IsArray()
@ArrayMinSize(1)          // ← jest
@ValidateNested({ each: true })
@Type(() => RouteDirectionDto)
routes!: RouteDirectionDto[];   // ← brak @ArrayMaxSize
```

Zalogowana firma może wysłać 10 000 odcinków trasy. Skutki:
- puchnie kolumna `routes` (jsonb) w `job_offers`
- puchnie payload **publicznego** `/api/offers` — `OFFER_WITH_COMPANY_SELECT` zwraca `*`, więc trasy lecą do każdego odwiedzającego
- mapa Leaflet rysuje każdy odcinek osobno (`offer-route-map.ts`) — przeglądarka staje
- `matchesFilters` iteruje po wszystkich odcinkach przy każdym zapytaniu (`job-offer.service.ts:288-291`)

To endpoint za autoryzacją, więc nie jest to atak anonimowy — ale jedno zepsute konto psuje wydajność dla wszystkich czytających.

## Jak naprawić

```ts
import { ArrayMaxSize } from 'class-validator';

@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(20)
@ValidateNested({ each: true })
@Type(() => RouteDirectionDto)
routes!: RouteDirectionDto[];
```

Plus lustrzany constraint w bazie, spójnie z podejściem z `20260909121000_companies_field_length_limits.sql` (limity w DB na wypadek obejścia `ValidationPipe`):

```sql
alter table public.job_offers
  add constraint job_offers_routes_max
    check (jsonb_array_length(routes) between 1 and 20);
```

## Przy okazji

`requiredYearsExperience` ma `@Min(0)` bez `@Max` (`job-offer.dto.ts:59-62`) — ktoś wpisze 999999 lat doświadczenia. Kosmetyka, ale jedna linijka: `@Max(50)`.

## Definicja ukończenia

- [ ] `@ArrayMaxSize(20)` w DTO
- [ ] Constraint w bazie
- [ ] `@Max(50)` na lata doświadczenia
- [ ] Test DTO odrzucający 21 odcinków

## Powiązane

- [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci]]
- [[Bezpieczeństwo]]
