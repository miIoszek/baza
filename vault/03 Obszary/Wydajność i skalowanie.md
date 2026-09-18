---
typ: obszar
projekt: Baza
aktualizacja: 2026-09-18
tags: [obszar, obszar/wydajność]
---

# Wydajność i skalowanie

## Otwarte zadania

```dataview
TABLE WITHOUT ID link(file.link, id) AS "ID", priorytet AS "Prio", status AS "Status"
FROM "01 Zadania"
WHERE contains(obszar, "wydajność") AND status != "zrobione"
SORT priorytet ASC, id ASC
```

- [ ] [[T-01 Trust proxy dla rate limitingu]] — 🔴 jeden kubełek na cały serwis
- [ ] [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci]] — 🟠 filtry zaczną kłamać
- [ ] [[T-09 Nieograniczona tablica routes]] — 🟠
- [ ] [[T-17 GeoJSON z zewnętrznego CDN]] — 🟡 ~200 KB z obcego hosta
- [ ] [[T-22 Cache-Control na publicznych GET]] — 🟡

## Progi, przy których coś pęknie

| Próg | Co się dzieje | Zadanie |
| ---- | ------------- | ------- |
| ~40 wyświetleń strony / min | wspólny kubełek 120 req/min się wyczerpuje, wszyscy dostają 429 | [[T-01 Trust proxy dla rate limitingu\|T-01]] |
| 1000 opublikowanych ofert | PostgREST ucina po cichu, filtry zwracają złe wyniki | [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci\|T-06]] |
| 1000 firm | to samo w katalogu pracodawców | [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci\|T-06]] |
| 1000 CV pod jedną ofertą | kasowanie oferty zostawia osierocone pliki | [[T-10 Paginacja kasowania prefiksów R2\|T-10]] |
| >1 replika Railway | limity throttlera liczone osobno per replika | [[T-01 Trust proxy dla rate limitingu\|T-01]] (notatka) |

Żaden z tych progów nie jest blisko przy dzisiejszym ruchu. Wszystkie łączy to, że **nie wywalą się z hukiem** — zaczną po cichu zwracać złe dane. Warto dodać logi ostrzegawcze przed progiem, nie po.

## Rzeczy, które kosztują przy każdym żądaniu

- `JwtAuthGuard` woła Supabase Auth per request (`supabase-auth.service.ts:28`) — round-trip sieciowy przy każdym wywołaniu endpointu za autoryzacją
- `/api/offers` refetchowane przy każdej zmianie filtra (debounce 200 ms)
- `/api/health` przy każdym wejściu na stronę główną
- `/api/companies` robi dwa pełne skany tabel

## Powiązane

- [[Architektura]] · [[2026-09-17 Review techniczne pod produkcję]]
