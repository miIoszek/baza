---
typ: obszar
projekt: Baza
aktualizacja: 2026-09-18
tags: [obszar, obszar/jakość]
---

# Jakość kodu i testy

## Otwarte zadania

- [ ] [[T-20 npm run test nie działa na świeżym klonie]] — 🟡 15min, wysoki zwrot
- [ ] [[T-23 Niepełny strict w tsconfig API]] — 🟡
- [ ] [[T-24 E2E nie działa w CI]] — 🟡
- [ ] [[T-25 Martwy kod w kontrolerach]] — 🟡 10min

## Stan

**39 plików testowych**, lint i testy zielone (po dogenerowaniu `environment.local.ts`).

Rozkład jest zdrowy — testowane są rzeczy, które faktycznie mogą się zepsuć:
- DTO i walidacja (5 speców) — w tym parsowanie query stringa filtrów
- serwisy z mockiem Supabase (`stateful-supabase.mock.ts` ma własny spec — testowanie narzędzia testowego to dobry znak)
- obsługa błędów Multera, mismatch prefiksu klucza CV
- guardy i interceptory na froncie
- czysta logika geometrii mapy (`route-map-geometry`, `route-map-arrow`)

**E2E**: 5 speców Playwright, nieuruchamiane w CI ([[T-24 E2E nie działa w CI|T-24]]).

## Narzędzia

| Narzędzie | Konfiguracja |
| --------- | ------------ |
| ESLint | flat config, `@nx/enforce-module-boundaries` |
| Jest | API |
| Angular test target | frontend |
| Playwright | E2E, Firefox (ograniczenie lokalnej maszyny) |
| lefthook | pre-commit: eslint --fix, typecheck obu appów, testy powiązane z plikami |

`lefthook.yml` jest dobrze pomyślany — typecheck osobno dla API i FE, testy tylko powiązane ze zmienionymi plikami. Szybki commit, sensowna ochrona.

## Typowanie

| Projekt | Ustawienie |
| ------- | ---------- |
| `tsconfig.base.json` | `strict: false` |
| frontend | `strict: true` + `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `strictTemplates` |
| API | częściowy — `strictNullChecks`, `noImplicitAny`, `strictBindCallApply` |

Rozjazd między deklaracją w `AGENTS.md` a stanem faktycznym: [[T-23 Niepełny strict w tsconfig API|T-23]].

## Konwencje z repo

- Commity: Conventional Commits (`feat:`, `fix:`, `chore:`)
- DTO współdzielone przez `@baza/shared-types` **zanim** zdublujesz typ
- Nowe funkcje Nesta pod `apps/baza-api/src`, Angulara pod `apps/baza-frontend/src/app` albo `@baza/ui` — bez równoległych drzew w rootcie
- `context/`, `skills/`, `prompts/`, `.cursor/` to tooling, nie kod runtime

## Powiązane

- [[Architektura]] · [[CI-CD i deploy]]
