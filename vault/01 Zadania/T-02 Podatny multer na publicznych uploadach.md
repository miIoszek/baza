---
id: T-02
typ: zadanie
status: todo
priorytet: P0
obszar: [bezpieczeństwo, zależności]
projekt: Baza
szacunek: 30min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P0
  - obszar/bezpieczeństwo
---

# T-02 Podatny multer na publicznych uploadach

> [!danger] Blokada launchu
> Cztery podatności HIGH osiągalne anonimowo, bez logowania.

## Problem

W `package.json` jest `"multer": "^2.3.0"` (załatane), ale to **atrapa**. `@nestjs/platform-express@11.2.3` pinuje własną zagnieżdżoną kopię:

```
node_modules/@nestjs/platform-express/node_modules/multer → 2.2.0
```

To właśnie ta kopia obsługuje `FileInterceptor`. Zweryfikowane:

```sh
node -p "require('@nestjs/platform-express/package.json').dependencies.multer"
# → 2.2.0
```

Advisory dotyczy `multer <= 2.2.0`:

| Advisory | Opis |
| -------- | ---- |
| [GHSA-wc9g-mqfw-jrwm](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm) | DoS przez spreparowane nazwy pól multipart |
| [GHSA-qfvm-cv95-jqjf](https://github.com/advisories/GHSA-qfvm-cv95-jqjf) | DoS przez wyciek deskryptorów przy przerwanych uploadach |
| [GHSA-qvfw-j98x-7q72](https://github.com/advisories/GHSA-qvfw-j98x-7q72) | **Obejście limitu rozmiaru pliku** (race w async `fileFilter`) |
| [GHSA-535w-7cp7-47q4](https://github.com/advisories/GHSA-535w-7cp7-47q4) | DoS przez przerośnięty indeks tablicy w nazwach pól |

Wszystkie osiągalne bez logowania przez:
- `POST /api/auth/register` (`auth.controller.ts:33-53`)
- `POST /api/offers/:id/applications` (`offers-public.controller.ts:47-67`)

Obejście limitu rozmiaru jest tu szczególnie kosztowne — limit 5 MB na CV chroni rachunek za R2.

## Jak naprawić

`npm audit fix --force` chce podbić `@nestjs/platform-express` do v12 (breaking change dla całego Nesta). Bezpieczniej wymusić samą zależność:

```json
// package.json
"overrides": {
  "multer": "2.3.0"
}
```

Potem:

```sh
rm -rf node_modules package-lock.json && npm install
node -p "require('./node_modules/@nestjs/platform-express/node_modules/multer/package.json').version"
# ma nie istnieć albo pokazać 2.3.0
npm audit --omit=dev
```

## Kontekst: pozostałe podatności

`npm audit` pokazuje 23 podatności (6 moderate, 17 high). **Poza multerem wszystkie są w devDependencies** (nx, webpack-dev-server, smol-toml) — nie trafiają na produkcję, mogą poczekać. Nie panikuj na widok liczby 23.

## Definicja ukończenia

- [ ] `overrides` w `package.json`, lockfile przebudowany
- [ ] `npm audit --omit=dev` czysty
- [ ] Upload logo i CV nadal działa (ręczny smoke test + `npm run test`)
- [ ] Limit 5 MB nadal egzekwowany

## Powiązane

- [[Bezpieczeństwo]]
- [[T-10 Paginacja kasowania prefiksów R2]]
