---
id: T-11
typ: zadanie
status: todo
priorytet: P1
obszar: [bezpieczeństwo, infrastruktura]
projekt: Baza
szacunek: 30min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/bezpieczeństwo
---

# T-11 CORS fail-open

## Problem

`libs/api/core/src/lib/configure-app.ts:6-12`:

```ts
const corsOrigin = process.env['CORS_ORIGIN']?.trim();
app.enableCors({
  origin: corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
    : true,          // ← brak zmiennej = odbij dowolny origin
  credentials: true,
});
```

Gdy `CORS_ORIGIN` nie jest ustawione na Railway (literówka w nazwie zmiennej, nowe środowisko, ktoś skasował), API odbija **dowolny** origin z `credentials: true`. Zachowanie fail-open: pomyłka w konfiguracji cicho rozluźnia bezpieczeństwo zamiast zatrzymać aplikację.

## Jak duże to ryzyko dzisiaj — uczciwie

**Małe.** Autoryzacja idzie przez Bearer token z `localStorage` (`auth.interceptor.ts:18-23`), nie przez ciasteczka. Złośliwa strona nie odczyta tokenu przez CORS, więc nie podszyje się pod zalogowaną firmę. Realny efekt to tyle, że dowolna strona może proxy'ować Twoje publiczne API.

**Ale:** `credentials: true` przy odbitym originie to mina rozbrojona tylko dzięki temu, że nie używasz ciasteczek. W dniu, w którym ktoś przejdzie na cookie auth (albo Supabase zmieni domyślne storage), robi się z tego krytyczna dziura — bez żadnej zmiany w tym pliku.

Naprawa jest tania, więc nie ma powodu tego zostawiać.

## Jak naprawić

```ts
const corsOrigin = process.env['CORS_ORIGIN']?.trim();
const origins = corsOrigin
  ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

if (!origins.length) {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('CORS_ORIGIN jest wymagane na produkcji');
  }
  origins.push('http://localhost:4200');   // sensowny default lokalnie
}

app.enableCors({ origin: origins, credentials: true });
```

Wzorzec jest już w repo — `assertRequiredSupabaseEnv` (`apps/baza-api/src/supabase-env.ts:25-35`) robi dokładnie to dla Supabase: nie startuj bez wymaganej konfiguracji. Rozszerz tę samą funkcję o `CORS_ORIGIN` zamiast dublować logikę.

## Definicja ukończenia

- [ ] Brak `CORS_ORIGIN` na produkcji = aplikacja nie startuje
- [ ] Lokalnie działa bez ustawiania zmiennej
- [ ] `CORS_ORIGIN` faktycznie ustawione na Railway (sprawdź!)
- [ ] Test jednostkowy jak dla `supabase-env.spec.ts`

## Powiązane

- [[T-18 Brak security headers]]
- [[Bezpieczeństwo]]
