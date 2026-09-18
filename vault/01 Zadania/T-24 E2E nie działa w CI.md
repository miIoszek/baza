---
id: T-24
typ: zadanie
status: todo
priorytet: P2
obszar: [jakość, ci-cd]
projekt: Baza
szacunek: 3h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/jakość, obszar/ci-cd]
---

# T-24 E2E nie działa w CI

## Problem

Testy Playwright istnieją i pokrywają sensowne ścieżki:

```
e2e/auth.setup.ts
e2e/company-profile.authenticated.spec.ts
e2e/guest-company-routes.spec.ts
e2e/job-offers-filter-url.spec.ts
e2e/seed.spec.ts
```

Ale `.github/workflows/ci.yml` uruchamia tylko `lint`, `test`, `build`. `npm run test:e2e` nie jest wołane nigdzie. Testy istnieją i nikt ich nie odpala poza Tobą lokalnie — czyli w praktyce gnijąc.

Dodatkowe utrudnienie: `playwright.config.ts` używa Firefoksa z komentarzem „ManageEngine Browser Security Plus blocks automated Chrome" — to ograniczenie Twojej maszyny, nie CI. Na ubuntu-latest Chromium działa normalnie.

## Jak naprawić

```yaml
e2e:
  name: E2E
  needs: verify
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version-file: '.nvmrc', cache: npm }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
      env:
        E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
        E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

## Do przemyślenia przed wdrożeniem

- **Przeciwko czemu ma biec?** Lokalny `webServer` (jest w configu) potrzebuje działającego API i Supabase. Testy anonimowe (`guest-company-routes`, `job-offers-filter-url`) pójdą łatwiej niż te wymagające konta.
- **Dane testowe.** `auth.setup.ts` loguje się na realne konto z sekretów. Osobny projekt Supabase dla testów byłby czystszy niż testowanie na produkcyjnej bazie — ale to koszt i osobna decyzja ([[Rejestr decyzji]]).
- **Commit `0103255`** („skip auth specs on expired storageState") sugeruje, że sesje wygasają. W CI setup poleci od zera za każdym razem, więc ten problem zniknie.

Sugestia: zacznij od samych testów anonimowych na PR — szybkie, bezstanowe, bez sekretów. Autoryzowane dorzuć, gdy będzie osobne środowisko.

## Definicja ukończenia

- [ ] Job E2E w CI, przynajmniej dla testów anonimowych
- [ ] Chromium zamiast Firefoksa w CI (Firefox lokalnie może zostać)
- [ ] Raport jako artefakt przy niepowodzeniu
- [ ] Decyzja o środowisku testowym dla testów autoryzowanych

## Powiązane
- [[T-07 Deploy nie czeka na CI]]
- [[T-20 npm run test nie działa na świeżym klonie]]
- [[Jakość kodu i testy]]
