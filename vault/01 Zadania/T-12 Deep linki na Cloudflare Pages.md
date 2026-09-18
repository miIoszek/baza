---
id: T-12
typ: zadanie
status: todo
priorytet: P1
obszar: [frontend, infrastruktura, produkt]
projekt: Baza
szacunek: 30min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/frontend
  - obszar/infrastruktura
---

# T-12 Deep linki na Cloudflare Pages

> [!question] Do zweryfikowania, nie potwierdzone
> Proxy środowiska review blokowało ruch na Cloudflare, więc **nie sprawdziłem tego na żywo**. Możliwe, że działa — ale sprawdź, zanim ktoś wrzuci link na grupę.

## Problem

W `apps/baza-frontend/public/` nie ma pliku `_redirects` (są tylko `baza-logo.png` i `favicon.ico`). Aplikacja to SPA z routingiem po stronie klienta:

```
/offers/:id
/companies/:id
/company/offers/:id
```

Cloudflare Pages serwuje pliki statyczne. Żądanie `GET /offers/abc-123` nie ma odpowiadającego pliku — bez konfiguracji SPA fallback Pages zwróci 404 zamiast `index.html`.

## Dlaczego to jest ważne dla produktu, nie tylko technicznie

To jest **core flow** Bazy. Kierowca dostaje link do oferty na WhatsAppie / w grupie na Facebooku. Jeśli wejście z zewnątrz w `/offers/:id` daje 404, cała dystrybucja ofert nie działa — a działa u Ciebie lokalnie i po kliknięciu wewnątrz aplikacji, więc łatwo tego nie zauważyć.

## Jak sprawdzić

```sh
curl -I https://<domena-pages>/offers/jakis-uuid
# oczekiwane: 200 + text/html (index.html)
# złe: 404
```

Albo po prostu: otwórz link do oferty w trybie incognito.

## Jak naprawić (jeśli nie działa)

`apps/baza-frontend/public/_redirects`:

```
/*    /index.html   200
```

Plik z `public/` trafia do `dist/apps/baza-frontend/browser`, czyli dokładnie tam, skąd `wrangler pages deploy` publikuje (`.github/workflows/deploy.yml`).

## Przy okazji — SEO

Skoro i tak dotykasz tego katalogu, brakuje też:
- `robots.txt`
- `sitemap.xml` (dla ofert i profili firm)
- meta tagów OG na stronach ofert (podgląd linku na Facebooku/WhatsAppie)

Dla tablicy ofert pracy, która żyje z dystrybucji linków, OG tagi to nie kosmetyka — link bez podglądu klika się dużo gorzej. SPA bez SSR ich nie wygeneruje dynamicznie; to osobny temat (prerendering / Angular SSR), ale warto go mieć na radarze.

## Definicja ukończenia

- [ ] Sprawdzone `curl -I` na deep linku produkcyjnym
- [ ] `_redirects` dodany, jeśli potrzebny
- [ ] Ponownie zweryfikowane po deployu
- [ ] Osobne zadanie na SEO/OG, jeśli uznasz za istotne

## Powiązane

- [[T-17 GeoJSON z zewnętrznego CDN]]
- [[Stack i infrastruktura]]
