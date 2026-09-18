---
id: T-07
typ: zadanie
status: todo
priorytet: P1
obszar: [ci-cd, deploy]
projekt: Baza
szacunek: 45min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/ci-cd
---

# T-07 Deploy nie czeka na CI

## Problem

`.github/workflows/ci.yml` i `.github/workflows/deploy.yml` mają **ten sam trigger**:

```yaml
on:
  push:
    branches: [main]
```

Nie ma między nimi `needs` ani bramki na statusie. Lecą równolegle. Czerwone testy → deploy i tak wchodzi.

Build frontu by się wywalił (`npx nx build` jest w jobie deployu), ale **testy nie blokują niczego** — ani API, ani FE. Deploy API to `railway up`, który buduje po swojej stronie i w ogóle nie widzi wyników `npm run test`.

## Jak naprawić

Opcja A — bramka przez `workflow_run` (zostawia dwa pliki):

```yaml
# deploy.yml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  changes:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

> [!note] Haczyk
> Przy `workflow_run` joby dostają kontekst workflow, który je odpalił — `dorny/paths-filter` musi dostać jawny `base`/`ref`, bo domyślne porównanie przestaje działać.

Opcja B — jeden pipeline (prościej, polecam): przenieś joby deployu do `ci.yml` z `needs: verify` i `if: github.ref == 'refs/heads/main'`.

Opcja B jest mniej ruchomych części i nie ma problemu z kontekstem. Jedyny koszt: `npm ci` leci raz dla weryfikacji i raz dla deployu FE — do rozwiązania przez `actions/cache` albo artefakt.

## Definicja ukończenia

- [ ] Celowo zepsuty test na branchu → merge do `main` → deploy **nie** startuje
- [ ] Zielone CI → deploy startuje normalnie
- [ ] Filtrowanie po ścieżkach (`api` / `frontend`) nadal działa poprawnie

## Powiązane

- [[T-05 Healthcheck na Railway]]
- [[T-08 Migracje poza pipeline'em]]
- [[T-24 E2E nie działa w CI]]
- [[CI-CD i deploy]], [[Deploy na produkcję]]
