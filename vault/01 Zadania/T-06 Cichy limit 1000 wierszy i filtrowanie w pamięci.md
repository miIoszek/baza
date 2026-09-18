---
id: T-06
typ: zadanie
status: todo
priorytet: P1
obszar: [wydajność, dane, architektura]
projekt: Baza
szacunek: 1d
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/wydajność
  - obszar/architektura
---

# T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci

> [!warning] Dług architektoniczny
> Nie wywali się z hukiem — zacznie po cichu zwracać złe wyniki. To najgorszy rodzaj awarii.

## Problem

`job-offer.service.ts:233-252` pobiera **wszystkie** opublikowane oferty bez `.limit()`, a filtruje i sortuje dopiero w JS:

```ts
async listPublished(filters: JobOfferFilters = {}): Promise<JobOffer[]> {
  const { data, error } = await this.supabaseAuth.getClient()
    .from('job_offers')
    .select(OFFER_WITH_COMPANY_SELECT)
    .eq('published', true)
    .order('created_at', { ascending: false });   // ← brak .range() / .limit()

  let offers = ((data ?? []) as OfferRow[]).map((r) => this.mapOffer(r));
  offers = offers.filter((o) => this.matchesFilters(o, filters));   // ← filtr w Node
  if (filters.near) offers = this.sortByNear(offers, filters.near); // ← sort w Node
  return offers;
}
```

Supabase ma twardy sufit:

```toml
# supabase/config.toml:18
max_rows = 1000
```

**Po przekroczeniu 1000 opublikowanych ofert:**
- PostgREST ucina wynik po cichu — żadnego błędu, żadnego ostrzeżenia
- filtry po krajach / kategorii prawa jazdy / typie transportu działają tylko wewnątrz pierwszego tysiąca (najnowszych)
- starsze oferty stają się **niewidoczne i niefiltrowalne**
- firma, która zapłaciła (kiedyś) za ogłoszenie, przestaje je widzieć w wynikach

To samo w `company-public.service.ts:20-70` — dwa pełne skany (`companies` + wszystkie opublikowane `job_offers`) i liczenie ofert w mapie w pamięci. Po 1000 ofertach liczniki przy firmach zaczynają kłamać.

## Jak naprawić

Filtrowanie należy do bazy. Docelowo:

```ts
let q = client.from('job_offers')
  .select(OFFER_WITH_COMPANY_SELECT, { count: 'exact' })
  .eq('published', true);

if (filters.licenseCategory)     q = q.eq('license_category', filters.licenseCategory);
if (filters.requiredTransportType) q = q.eq('required_transport_type', filters.requiredTransportType);
if (filters.homeReturnCadence)   q = q.in('home_return_cadence', [filters.homeReturnCadence, 'flexible']);

q = q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
```

**Trudne kawałki — nie da się przenieść 1:1:**

1. **Filtr po krajach** działa na `routes` (jsonb) — sprawdza `leg.from.code` / `leg.to.code` (`job-offer.service.ts:286-293`). W Postgresie potrzebny indeks GIN na `routes` i operator zawierania, albo denormalizacja do tabeli `job_offer_countries` (czystsze i szybsze).
2. **Sortowanie `near`** liczy haversine w JS (`job-offer.service.ts:336-347`). W bazie to `earthdistance`/PostGIS albo prosta formuła w `order` po wyliczonej kolumnie. Alternatywa na teraz: sortuj po odległości dopiero **po** stronicowaniu (gorsze wyniki, ale spójne).
3. Kontrakt API się zmienia — FE (`job-offers-page.ts`) dostaje dziś gołą tablicę. Paginacja to `{ items, total, page }`. Trzeba ruszyć oba końce naraz.

## Etapowo

Nie musi być zrobione w całości przed launchem — MVP ma daleko do 1000 ofert. Ale:

- [ ] **Teraz (30 min):** twardy `.limit(200)` + log ostrzegawczy, gdy wynik dobija do limitu. Dzięki temu dowiesz się, **zanim** zacznie kłamać.
- [ ] **Potem:** filtry proste (`license`, `transport`, `cadence`) do bazy
- [ ] **Potem:** denormalizacja krajów tras + indeks
- [ ] **Potem:** paginacja w API i na FE
- [ ] **Potem:** sortowanie po odległości w bazie

## Definicja ukończenia

- [ ] Żaden publiczny endpoint nie polega na ucięciu przez `max_rows`
- [ ] Test z >1000 ofertami w bazie zwraca poprawnie przefiltrowane wyniki
- [ ] `/api/companies` nie robi pełnego skanu `job_offers`

## Powiązane

- [[T-22 Cache-Control na publicznych GET]]
- [[Wydajność i skalowanie]], [[Architektura]]
