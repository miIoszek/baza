---
id: T-05
typ: zadanie
status: todo
priorytet: P0
obszar: [infrastruktura, deploy]
projekt: Baza
szacunek: 10min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P0
  - obszar/infrastruktura
---

# T-05 Healthcheck na Railway

## Problem

Endpoint istnieje:

```ts
// apps/baza-api/src/app/app.controller.ts:9-12
@Get('health')
getHealth(): HealthResponse {
  return this.appService.getHealth();
}
```

ale `railway.toml` go nie używa:

```toml
[deploy]
startCommand = "npm run start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

Bez `healthcheckPath` Railway uznaje deploy za udany, gdy proces wystartuje. Aplikacja, która wstała, ale nie obsługuje ruchu (np. `assertRequiredSupabaseEnv` przeszło, ale Supabase jest nieosiągalne), trafia na produkcję i zastępuje działającą wersję.

## Jak naprawić

```toml
[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Warto rozważyć przy okazji

Dzisiejszy `/api/health` jest płytki — zwraca statyczną odpowiedź, nie sprawdza zależności. Deploy z zepsutym połączeniem do Supabase nadal przejdzie healthcheck. Rozważ wariant sprawdzający realny `select 1` do bazy — ale **osobno** od endpointu dla Railway, żeby chwilowy lag Supabase nie wywalał całego deploymentu w pętlę restartów.

Sugestia: `/api/health` (płytki, dla Railway) + `/api/health/ready` (głęboki, do ręcznej diagnostyki i monitoringu).

## Definicja ukończenia

- [ ] `healthcheckPath` w `railway.toml`
- [ ] Zweryfikowane, że celowo zepsuty deploy **nie** wchodzi na produkcję
- [ ] Zdecydowane, czy robimy głęboki healthcheck (jeśli tak → osobne zadanie)

## Powiązane

- [[T-07 Deploy nie czeka na CI]]
- [[Deploy na produkcję]], [[CI-CD i deploy]]
