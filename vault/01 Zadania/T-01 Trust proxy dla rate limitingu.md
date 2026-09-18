---
id: T-01
typ: zadanie
status: todo
priorytet: P0
obszar: [bezpieczeństwo, infrastruktura, wydajność]
projekt: Baza
szacunek: 15min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P0
  - obszar/bezpieczeństwo
  - obszar/infrastruktura
---

# T-01 Trust proxy dla rate limitingu

> [!danger] Blokada launchu
> Cały serwis dzieli **jeden** kubełek rate limitu. Im lepiej pójdzie launch, tym szybciej API padnie.

## Problem

`@nestjs/throttler` domyślnie kluczuje limity po `req.ip`:

```js
// node_modules/@nestjs/throttler/dist/throttler.guard.js:141-143
async getTracker(req) {
    return req.ip;
}
```

Express bez `trust proxy` zwraca w `req.ip` adres gniazda TCP. Na Railway aplikacja stoi za edge proxy, więc **każdy odwiedzający ma to samo IP**. W repo nie ma nigdzie `trust proxy` (zweryfikowane grepem — zero trafień).

Efekt: limit 120 req/min z `app.module.ts` obowiązuje **globalnie dla całego serwisu**, a nie na użytkownika. Rejestracja i aplikowanie dzielą jeden globalny kubełek 10/min.

Boli mocniej niż wygląda, bo:
- `job-offers-page.ts:165-191` refetchuje `/api/offers` przy **każdej zmianie filtra** (debounce 200 ms),
- strona główna wali w `/api/health` przy każdym wejściu (`home.ts:21-22`).

Kilku kierowców jednocześnie klikających filtry wyczerpuje limit dla wszystkich. Wrzut na grupę FB → 100 osób w minutę → wszyscy dostają 429.

## Gdzie

- `libs/api/core/src/lib/configure-app.ts:5` — tu trafia fix
- `apps/baza-api/src/app/app.module.ts:22-28` — konfiguracja throttlera

## Jak naprawić

```ts
// libs/api/core/src/lib/configure-app.ts
export function configureApp(app: INestApplication): void {
  // Railway edge proxy — bez tego req.ip to IP proxy, wspólne dla wszystkich.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // ...reszta
}
```

> [!warning] Nie dawaj `true`
> `trust proxy: true` ufa całemu łańcuchowi `X-Forwarded-For`, który klient może spoofować — atakujący obchodzi limit, podstawiając losowe IP. Liczba = liczba hopów proxy przed aplikacją. Na Railway zacznij od `1` i zweryfikuj.

## Weryfikacja

Po deployu sprawdź, czy `req.ip` różni się między klientami — np. tymczasowy log albo nagłówki `X-RateLimit-Remaining` z dwóch różnych sieci (komórka vs. wifi). Limit powinien spadać niezależnie.

## Definicja ukończenia

- [ ] `trust proxy` ustawione na poprawną liczbę hopów
- [ ] Test jednostkowy: dwa requesty z różnymi `X-Forwarded-For` dostają osobne kubełki
- [ ] Zweryfikowane na realnym deployu, że limity są per-IP
- [ ] `npm run lint && npm run test` zielone

## Powiązane

- [[T-22 Cache-Control na publicznych GET]] — zmniejsza ruch, który zjada limit
- [[Bezpieczeństwo]], [[Wydajność i skalowanie]]

## Notatki

Osobna sprawa na później: storage throttlera jest **in-memory**, więc przy >1 replice Railway limity i tak się rozjadą (każda replika liczy swoje). Przy MVP na jednej replice OK — ale przy skalowaniu potrzebny wspólny storage (Redis).
