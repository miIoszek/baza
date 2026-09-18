---
typ: obszar
projekt: Baza
aktualizacja: 2026-09-18
tags: [obszar, obszar/ci-cd]
---

# CI-CD i deploy

## Otwarte zadania

```dataview
TABLE WITHOUT ID link(file.link, id) AS "ID", priorytet AS "Prio", status AS "Status"
FROM "01 Zadania"
WHERE contains(obszar, "ci-cd") OR contains(obszar, "deploy")
WHERE status != "zrobione"
SORT priorytet ASC, id ASC
```

- [ ] [[T-05 Healthcheck na Railway]] — 🔴
- [ ] [[T-07 Deploy nie czeka na CI]] — 🟠
- [ ] [[T-08 Migracje poza pipeline'em]] — 🟠
- [ ] [[T-19 Migracje kasujące dane]] — 🟡
- [ ] [[T-20 npm run test nie działa na świeżym klonie]] — 🟡
- [ ] [[T-24 E2E nie działa w CI]] — 🟡

## Stan obecny

**`ci.yml`** — na PR i push do `main`: `npm ci` → `ensure-fe-env` → lint → test → build. Jeden job, 30 min timeout, `cancel-in-progress`.

**`deploy.yml`** — na push do `main`, **niezależnie od CI**:
- `changes` → `dorny/paths-filter` decyduje, co się zmieniło
- `deploy-api` → `railway up --service=baza-api --ci`
- `deploy-frontend` → build + upload source map do Sentry + `wrangler pages deploy`

Oba workflow mają jawną walidację sekretów przed użyciem — dobry nawyk, błąd konfiguracji daje czytelny komunikat zamiast dziwnej awarii.

## Czego brakuje

1. **Bramki CI → deploy** ([[T-07 Deploy nie czeka na CI|T-07]]) — dziś czerwone testy nie blokują
2. **Migracji w pipeline** ([[T-08 Migracje poza pipeline'em|T-08]]) — schema idzie ręcznie
3. **Healthchecka** ([[T-05 Healthcheck na Railway|T-05]]) — zepsuty deploy wchodzi na żywo
4. **E2E** ([[T-24 E2E nie działa w CI|T-24]]) — testy istnieją, nikt ich nie odpala
5. **Ścieżki rollbacku** — nieudokumentowana, patrz [[Deploy na produkcję]]

## Zasady

1. **Żadna migracja nie kasuje danych** bez jawnej kopii do tabeli kwarantanny ([[T-19 Migracje kasujące dane|T-19]])
2. **Zmiany niekompatybilne = dwa deploye** — najpierw kod przestaje używać, potem migracja usuwa
3. **Migracje przed deployem kodu**, nie po
4. Lokalny odpowiednik CI: `npm run lint && npm run test && npm run build` — działa dopiero po [[T-20 npm run test nie działa na świeżym klonie|T-20]]

## Powiązane

- [[Deploy na produkcję]] · [[Stack i infrastruktura]]
