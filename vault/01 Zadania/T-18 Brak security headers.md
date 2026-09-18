---
id: T-18
typ: zadanie
status: todo
priorytet: P2
obszar: [bezpieczeństwo]
projekt: Baza
szacunek: 1h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/bezpieczeństwo]
---

# T-18 Brak security headers

## Problem

`configure-app.ts` ustawia CORS, `ValidationPipe` i filtr wyjątków — ale żadnych nagłówków bezpieczeństwa. `helmet` nie jest w zależnościach.

Brakuje m.in.:
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `X-Frame-Options` / `frame-ancestors`
- `Referrer-Policy`

Dla czystego API JSON to hardening, nie dziura — ale jest jeden konkretny powód, żeby to zrobić: endpoint pobierania CV serwuje pliki z bucketa użytkowników.

```ts
// company.controller.ts:114-129
@Get('applications/:id/cv')
@Header('Cache-Control', 'private, no-store')
async downloadApplicationCv(...): Promise<StreamableFile> {
  return new StreamableFile(file.body, {
    type: file.contentType || 'application/pdf',
    disposition: 'attachment; filename="cv.pdf"',
    ...
  });
}
```

`disposition: attachment` i weryfikacja magic bytes przy uploadzie (`r2-storage.service.ts:264`) już chronią — ale `nosniff` to trzecia warstwa za darmo.

## Jak naprawić

```sh
npm i helmet
```

```ts
import helmet from 'helmet';

app.use(helmet({
  // API nie serwuje HTML — CSP dla dokumentów jest tu zbędne,
  // ale crossOriginResourcePolicy może kolidować z pobieraniem CV.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
```

> [!warning] Sprawdź pobieranie CV po włączeniu
> `helmet` domyślnie ustawia `Cross-Origin-Resource-Policy: same-origin`, a FE (Pages) i API (Railway) są na **różnych domenach**. Bez `same-site`/`cross-origin` pobieranie CV może przestać działać. Przetestuj tę ścieżkę end-to-end.

## Osobno: nagłówki dla frontu

Cloudflare Pages ma własny plik `_headers` — tam warto dodać CSP dla aplikacji Angulara. To osobna robota niż helmet na API; zrób razem z [[T-12 Deep linki na Cloudflare Pages]], bo dotyczy tego samego katalogu `public/`.

## Definicja ukończenia

- [ ] `helmet` na API
- [ ] Pobieranie CV przetestowane cross-origin
- [ ] Rozważony `_headers` z CSP dla Pages

## Powiązane
- [[T-11 CORS fail-open]]
- [[T-12 Deep linki na Cloudflare Pages]]
