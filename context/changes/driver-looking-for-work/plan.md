# Karta „szukam pracy” — plan

> Tempo: **powoli**. Faza 1 teraz. Fazy 2–4 wstrzymane, aż pierwsza pętla (oferta → aplikacja → skrzynka) pokaże realny ruch.
> Frame / ocena biznesowa: poniżej i w `change.md`.

## Overview

Najmniejsza pętla odwrotna: kierowca zakłada konto, wypełnia jedną kartę matchingową i czeka; zalogowana firma przegląda karty (bez PII) i wysyła zainteresowanie. Bez CV, paywalla i udawanej weryfikacji firm. Najpierw forma zatrudnienia na istniejących ofertach (faza 1).

## Current State Analysis

Baza ma jedną pętlę: firma publikuje ofertę → kierowca bez konta filtruje i aplikuje z PDF CV → skrzynka firmy. Nie ma roli `driver`, KYC firmy ani kanału firma→kierowca. Matching na ofertach: trasy, zjazd, prawko, typ transportu, lata doświadczenia. Brak formy zatrudnienia.

## Desired End State

Po fazie 1: każda oferta ma wymagany multi-select `uop | b2b | zlecenie`, filtr Job Offers przecina zbiory, UI formularza / karty / detailu pokazuje pole. Po pełnym v1 (później): kierowca ma konto i jedną kartę; firma klika zainteresowanie; mail + lista w panelu kierowcy; zero PII na liście kart.

## Ocena biznesowa (surowa)

Plan techniczny v1 jest poprawny. Jako zakład biznesowy jest **warunkowo słaby** — nie jest „następnym growth engine”. Hipoteza „kierowca nie chce polować” jest nieodróżnialna od tarcia CV albo pustego marketplace. Fazy 2–4 to nowy produkt. Faza 1 ma sens niezależnie.

Zdrowie pierwszej pętli: **nieznane** (intuicja, nie dane). Default: nie otwieraj fazy 2, dopóki nie ma realnych aplikacji.

Kryterium śmierci (gdy karty wylądują na produkcji, 30 dni): mało kart albo zero zainteresowań → pauza, bez CV/paywalla/czatu.

## What We're NOT Doing (v1 karty i teraz)

- CV na karcie / ofercie standing
- Paywall, Stripe, „premium listing”
- Weryfikacja firmy (KRS / ręczna). Widoczność kart = zalogowana rola `company`
- Chat
- Publiczny URL karty, wiele kart na konto
- Zmiana pętli oferta → aplikacja bez konta
- Fazy 2–4 w tym slajsie implementacyjnym

## Zablokowane decyzje

- Kontakt (faza 4): zainteresowanie mailem; email/telefon kierowcy nigdy w API listy
- Jedna karta = profil
- TTL 30 dni przez `lookingUntil` (bez crona)
- Forma zatrudnienia: wymagany multi-select `uop | b2b | zlecenie` na ofercie i (później) karcie; filtr = przecięcie. Stare oferty: backfill z allowlist (założenie: mocki)
- FR-009 apply bez konta zostaje

## Phase 1: Forma zatrudnienia na ofertach

### Overview

Wymagana oś UoP / B2B / zlecenie na create/update oferty, w API, DB (CHECK + GIN), filtrze Job Offers i UI.

### Changes Required

- Shared type `EmploymentForm` + labele PL
- Kolumna `job_offers.employment_forms text[]` NOT NULL, min 1, subset allowlist
- Backfill istniejących wierszy wariacjami z allowlist
- DTO create/update: `employmentForms` ArrayMinSize(1)
- Query publiczna: `employment` CSV (jak `countries`), product name `employmentForms` nie idzie na wire
- `matchesFilters`: przecięcie tablic
- Formularz firmy: mat-select multiple
- Filter bar + URL query
- Karta oferty, detail, lista firmy

### Success Criteria

#### Automated Verification

- Migracja w `ALL_MIGRATIONS`; schema test odrzuca pustą / nieznaną tablicę
- Unit: DTO, matchesFilters overlap, query helpers FE
- `npx nx test baza-api` oraz `npx nx test baza-frontend` (wycinek fazy 1)
- Lint czysty na ruszonych plikach

#### Manual Verification

- Nowa oferta nie zapisze się bez formy zatrudnienia
- Filtr Job Offers `employment=uop` zostaje w URL i odcina oferty bez UoP
- Detail i karta pokazują polskie labele

**Implementation Note:** Po fazie 1 stop. Nie startować fazy 2 bez sygnału z pierwszej pętli.

## Phase 2: Tożsamość kierowcy

(Zaparkowane.) `DRIVER_ROLE`, register-driver, `/me.roles`, zacieśnienie `companyAuthGuard`, shell `/driver/*`.

## Phase 3: Karta + 30 dni

(Zaparkowane.) Jedna karta, `lookingUntil`, pauza, walidacja FE+BE+DB.

## Phase 4: Firma przegląda i klika zainteresowanie

(Zaparkowane.) Lista bez PII, POST interest + mail + lista u kierowcy.

## Testing Strategy

- Schema: empty array, unknown code, happy path `'{uop}'`
- Matching: overlap true/false; pusty filtr nie odcina
- FE: required na formularzu; parse/serialize `employment` w query

## Migration Notes

Nowa klasa TypeORM, nigdy edycja `DomainSchema`. Backfill jest deterministyczny po `id` (hash), nie prawdziwy RNG. Jeśli w produkcji są prawdziwe oferty — stop i ręczny przegląd.

## References

- Cursor plan: `.cursor/plans/driver_looking_card_cf551f9e.plan.md`
- PRD: parked driver accounts — `context/foundation/prd.md`
- Lesson: walidacja FE + BE + DB — `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Forma zatrudnienia na ofertach

#### Automated

- [x] 1.1 Shared EmploymentForm + JobOffer.employmentForms
- [x] 1.2 Migracja employment_forms + entity + schema tests
- [x] 1.3 API DTO, parseListQuery, matchesFilters, mapOffer
- [x] 1.4 FE formularz, filtry, karta, detail
- [x] 1.5 nx test baza-api + baza-frontend (faza 1)

#### Manual

- [ ] 1.6 Nowa oferta wymaga formy; filtr URL; labele PL na detailu

### Phase 2: Tożsamość kierowcy

#### Automated

- [ ] 2.1 DRIVER_ROLE + register-driver + /me.roles + guardy FE

### Phase 3: Karta + 30 dni

#### Automated

- [ ] 3.1 driver_cards CRUD + lookingUntil

### Phase 4: Firma przegląda i klika zainteresowanie

#### Automated

- [ ] 4.1 Lista kart bez PII + POST interest + mail + lista kierowcy
