---
id: T-21
typ: zadanie
status: todo
priorytet: P2
obszar: [bezpieczeństwo, frontend]
projekt: Baza
szacunek: 20min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/bezpieczeństwo, obszar/frontend]
---

# T-21 Interceptor dokleja token po dopasowaniu podłańcucha

## Problem

`core/auth.interceptor.ts:6-9`:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) {     // ← includes, nie sprawdzenie origin
    return next(req);
  }
  ...
  setHeaders: { Authorization: `Bearer ${token}` }
```

Token Supabase kierowany jest do **każdego** URL-a zawierającego `/api/` gdziekolwiek w ciągu znaków. Nie ma weryfikacji, czy to Twoje API.

Dzisiaj nic nie wycieka — jedyne zewnętrzne żądanie to GeoJSON z GitHuba (`/geojson/`, nie `/api/`), a fonty idą przez `<link>`, nie `HttpClient`. **Ale to mina.** Pierwsze integracje, które się proszą: geokoder do autouzupełniania adresu bazy (dziś współrzędne wpisuje się ręcznie — `T-04`/profil firmy), API białej listy VAT do weryfikacji NIP ([[T-04 Unikalność i weryfikacja NIP]]), dostawca poczty ([[T-15 Brak powiadomień o nowej aplikacji]]). Każde z nich ma `/api/` w ścieżce. Wtedy token zalogowanej firmy poleci do obcego serwisu w nagłówku — bez żadnego ostrzeżenia.

## Jak naprawić

Dopasuj po origin, nie po podłańcuchu:

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = environment.apiBaseUrl || window.location.origin;
  const isOwnApi = req.url.startsWith(`${apiBase}/api/`) || req.url.startsWith('/api/');
  if (!isOwnApi) {
    return next(req);
  }
  // ...
};
```

Względne `/api/...` jest potrzebne, bo lokalnie `apiBaseUrl` jest puste i FE proxy'uje na `:3000` (`environment.ts:8`).

## Definicja ukończenia

- [ ] Dopasowanie po `apiBaseUrl`, nie `includes`
- [ ] Działa lokalnie (ścieżki względne) i na produkcji (pełny URL)
- [ ] Test: URL zewnętrzny z `/api/` w ścieżce **nie** dostaje nagłówka

## Powiązane
- [[T-11 CORS fail-open]]
