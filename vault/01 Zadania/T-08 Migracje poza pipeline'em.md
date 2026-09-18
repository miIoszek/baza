---
id: T-08
typ: zadanie
status: todo
priorytet: P1
obszar: [ci-cd, dane, deploy]
projekt: Baza
szacunek: 2h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P1
  - obszar/ci-cd
  - obszar/dane
---

# T-08 Migracje poza pipeline'em

## Problem

W `.github/workflows/deploy.yml` nie ma kroku `supabase db push`. Schema idzie ręcznie, kod automatycznie.

Klasyczny sposób na 500-tki po deployu: kod odwołujący się do nowej kolumny trafia na produkcję, zanim ktoś pamiętał o odpaleniu migracji. Przy 11 migracjach w `supabase/migrations/` i tempie zmian w tym repo to kwestia czasu.

## Jak naprawić

```yaml
migrate:
  name: Migracje Supabase
  needs: changes
  if: needs.changes.outputs.migrations == 'true'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: supabase/setup-cli@v1
      with: { version: latest }
    - run: supabase link --project-ref "$SUPABASE_PROJECT_REF"
      env:
        SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
        SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    - run: supabase db push
      env:
        SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

deploy-api:
  needs: [changes, migrate]   # ← API czeka na schemat
```

Dodaj `migrations: - 'supabase/migrations/**'` do filtra ścieżek w jobie `changes`.

> [!warning] Kolejność ma znaczenie
> Migracje **przed** deployem kodu działają tylko dla zmian wstecznie kompatybilnych (dodanie kolumny, nowa tabela). Usunięcie/zmiana nazwy kolumny wymaga dwóch deployów: najpierw kod przestaje używać, potem migracja usuwa. Wpisz to sobie jako zasadę w [[Deploy na produkcję]].

## Wymagane sekrety

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

## Definicja ukończenia

- [ ] Job migracji w pipeline, przed deployem API
- [ ] Sekrety dodane w GitHub Actions
- [ ] Test na środowisku testowym: nowa migracja aplikuje się automatycznie
- [ ] Zasada dwóch deployów dla zmian niekompatybilnych zapisana w runbooku

## Powiązane

- [[T-07 Deploy nie czeka na CI]]
- [[T-19 Migracje kasujące dane]]
- [[Deploy na produkcję]]
