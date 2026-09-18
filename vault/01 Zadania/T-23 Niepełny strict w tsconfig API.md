---
id: T-23
typ: zadanie
status: todo
priorytet: P2
obszar: [jakość, dx]
projekt: Baza
szacunek: 2h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/jakość]
---

# T-23 Niepełny strict w tsconfig API

## Problem

`tsconfig.base.json` ma `"strict": false`. Front to nadpisuje pełnym `"strict": true` + dodatkami (`apps/baza-frontend/tsconfig.json`). API włącza tylko część:

```json
// apps/baza-api/tsconfig.app.json
"strictNullChecks": true,
"noImplicitAny": true,
"strictBindCallApply": true,
"forceConsistentCasingInFileNames": true,
"noFallthroughCasesInSwitch": true
```

Brakuje `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `noImplicitThis`, `alwaysStrict`.

`AGENTS.md` deklaruje coś innego:

> Frontend already uses TypeScript `strict: true`. **Prefer the same discipline on Nest**

Uczciwie: największa wartość (`strictNullChecks` + `noImplicitAny`) już jest, więc to nie jest pilne. Ale `useUnknownInCatchVariables` realnie by się przydał — w kodzie jest sporo ręcznego zawężania w blokach catch (`err instanceof Error ? err.message : String(err)` powtórzone w `r2-storage.service.ts` kilka razy), co jest dokładnie tym, co ta flaga wymusza systemowo.

`strictPropertyInitialization` będzie najgłośniejszy — DTO używają `!` (`name!: string`), co jest poprawnym wzorcem dla class-validator i będzie wymagało zostawienia tych asercji.

## Jak naprawić

Stopniowo, flaga po fladze, każda w osobnym commicie:

1. `useUnknownInCatchVariables` — powinno przejść niemal bez zmian
2. `noImplicitThis`, `alwaysStrict` — zwykle bezbolesne
3. `strictFunctionTypes` — może ruszyć sygnatury callbacków (multer `fileFilter`)
4. `strictPropertyInitialization` — najwięcej szumu w DTO

Docelowo: `"strict": true` w `apps/baza-api/tsconfig.app.json` i usunięcie pojedynczych flag.

> [!tip] Rozważ podniesienie w bazie
> `"strict": false` w `tsconfig.base.json` dotyczy też `libs/`. Biblioteki współdzielone (`@baza/shared-types`) powinny być najbardziej rygorystyczne, bo używają ich obie strony.

## Definicja ukończenia

- [ ] Flagi włączane etapami, CI zielone po każdym kroku
- [ ] `AGENTS.md` zgodny ze stanem faktycznym
- [ ] Rozważony strict dla `libs/`

## Powiązane
- [[Jakość kodu i testy]]
