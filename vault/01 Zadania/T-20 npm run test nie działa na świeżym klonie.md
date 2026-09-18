---
id: T-20
typ: zadanie
status: todo
priorytet: P2
obszar: [dx, ci-cd]
projekt: Baza
szacunek: 15min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/dx]
---

# T-20 npm run test nie działa na świeżym klonie

## Problem

Zweryfikowane eksperymentalnie — świeży klon, `npm ci`, `npm run test`:

```
✘ [ERROR] Could not resolve "./environment.local"
    apps/baza-frontend/src/environments/environment.ts:2:33

NX   Running target test for 2 projects failed
- baza-frontend:test
```

`environment.local.ts` jest w `.gitignore` i tworzy go `scripts/ensure-fe-env.mjs`. CI ma osobny krok „Ensure FE local env placeholders", ale skrypty `test` i `lint` w `package.json` go nie wołają:

```json
"lint": "nx run-many -t lint -p baza-api,baza-frontend",
"test": "nx run-many -t test -p baza-api,baza-frontend",
```

Tymczasem `AGENTS.md` twierdzi:

> `npm run lint && npm run test && npm run build` locally mirrors `.github/workflows/ci.yml`

**Nie mirroruje.** `build` i `serve:*` wołają `ensure-fe-env`, `test` i `lint` nie.

Koszt: każdy nowy klon (nowa maszyna, CI innego typu, agent, współpracownik) wywala się na starcie w sposób, który wygląda na zepsuty kod, a nie brakującą konfigurację.

## Jak naprawić

```json
"pretest": "node scripts/ensure-fe-env.mjs",
"prelint": "node scripts/ensure-fe-env.mjs",
```

npm odpala `pre*` automatycznie. Zero zmian w nawykach, `npm run test` zaczyna działać wszędzie.

Alternatywnie dopisz do samych skryptów jak w `build`. `pre*` jest czystsze — nie dubluje polecenia.

## Definicja ukończenia

- [ ] `pretest` / `prelint` w `package.json`
- [ ] Zweryfikowane na świeżym klonie: `npm ci && npm run test` przechodzi
- [ ] `AGENTS.md` mówi prawdę (albo poprawiony opis)

## Powiązane
- [[T-24 E2E nie działa w CI]]
- [[Jakość kodu i testy]]
