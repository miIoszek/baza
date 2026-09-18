---
id: T-17
typ: zadanie
status: todo
priorytet: P2
obszar: [frontend, infrastruktura, wydajność]
projekt: Baza
szacunek: 1h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/frontend]
---

# T-17 GeoJSON z zewnętrznego CDN

## Problem

`pages/job-offers/country-basemap.ts:3-5`:

```ts
/** Pinned SHA so the file cannot drift with `master`. */
const COUNTRIES_GEOJSON =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca83db5f9aef52d5e762765100745f84b27/geojson/ne_110m_admin_0_countries.geojson';
```

Przypięcie do SHA jest przemyślane — plik nie zmieni się pod Tobą. Problem jest gdzie indziej: **`raw.githubusercontent.com` to nie CDN produkcyjny**.

- brak SLA — GitHub nie gwarantuje dostępności raw content
- rate limity po IP
- bywa blokowany w sieciach firmowych i przez niektórych operatorów
- każde wejście na listę ofert ściąga ~200 KB z zewnętrznego hosta

Mapa to rdzeń produktu (wedge z roadmapy: „route + home-cadence matching **z wizualizacją na mapie**"). Uzależnianie jej od cudzego hostingu plików to niepotrzebne ryzyko.

Kod degraduje się elegancko (`catch` zostawia granatowy panel — `country-basemap.ts:52-54`), więc awaria nie wywala aplikacji. Ale kierowca zobaczy pustą mapę i uzna, że serwis jest zepsuty.

## Jak naprawić

Pobierz plik raz i wrzuć do `apps/baza-frontend/public/geo/`:

```sh
curl -o apps/baza-frontend/public/geo/ne_110m_admin_0_countries.geojson \
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/9380cca.../geojson/ne_110m_admin_0_countries.geojson"
```

```ts
const COUNTRIES_GEOJSON = '/geo/ne_110m_admin_0_countries.geojson';
```

Leci wtedy z Cloudflare Pages — ten sam origin, CDN, cache, zero zewnętrznych zależności.

**Przy okazji zmniejsz plik.** Pełny `ne_110m` ma wszystkie kraje świata z pełną geometrią. Baza pokazuje trasy europejskie. Filtrowanie do Europy + uproszczenie geometrii (`mapshaper -simplify 10%`) zbije to z ~200 KB do kilkudziesięciu. Zauważalne na komórce, a kierowcy wchodzą z komórek.

> [!note] Licencja
> Natural Earth jest public domain — możesz kopiować bez ograniczeń. Zostaw atrybucję w komentarzu, jak jest teraz.

## Definicja ukończenia

- [ ] Plik w `public/geo/`, URL względny
- [ ] Rozważone przycięcie do Europy + uproszczenie geometrii
- [ ] Mapa działa przy zablokowanym `raw.githubusercontent.com`
- [ ] Komentarz o pochodzeniu i licencji zachowany

## Powiązane
- [[T-12 Deep linki na Cloudflare Pages]]
- [[Wydajność i skalowanie]]
