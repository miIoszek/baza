# Karta „szukam pracy” — Plan Brief

> Full plan: `context/changes/driver-looking-for-work/plan.md`
> Identity: `context/changes/driver-looking-for-work/change.md`

## What & Why

Kierowca ma nie polować na oferty, tylko raz powiedzieć „szukam” i czekać. To odwraca pętlę Bazy. **Nie robimy tego teraz w całości.** Hipoteza jest intuicją; pierwsza pętla (oferta → aplikacja → skrzynka) nie jest zmierzona. Idziemy powoli: najpierw forma zatrudnienia na ofertach firm.

## Starting Point

Jedna pętla, anonimowy kierowca, matching bez UoP/B2B. Brak roli driver, KYC i kanału firma→kierowca.

## Desired End State (faza 1)

Oferta wymaga multi-select `uop | b2b | zlecenie`. Job Offers filtruje przecięciem. UI pokazuje polskie labele.

## Key Decisions Made

- Tempo: faza 1 teraz; fazy 2–4 zaparkowane aż pierwsza pętla żyje
- CV / paywall / „zweryfikowana firma” / chat: poza v1
- Employment: wymagany multi-select po obu stronach (karta później); stare wiersze = backfill z allowlist (mocki)
- Kontakt (później): zainteresowanie mailem, PII nie na liście
- Jedna karta = profil; TTL 30 dni bez crona

## Scope

**In scope teraz:** faza 1 — employment na ofertach.

**Out of scope teraz:** konto kierowcy, karta, zainteresowanie, CV, paywall.

## Architecture / Approach

Nowa oś w `@baza/shared-types`. Kolumna `text[]` + CHECK + GIN. Wire filtra: `employment` CSV. Matching: przecięcie tablic w `matchesFilters`.

## Phases at a Glance

- 1. Forma zatrudnienia na ofertach — jedyny kawałek z ROI w obecnym produkcie
- 2–4. Tożsamość, karta, zainteresowanie — zaparkowane

**Prerequisites:** nic poza obecnym API ofert
**Estimated effort (faza 1):** jedna sesja (typy, migracja, DTO, formularz, filtry, testy)

## Open Risks & Assumptions

- Backfill na produkcji kłamie, jeśli oferty nie są mockami
- „Nie chcą polować” może być tarciem CV, nie brakiem tablicy

## Success Criteria (Summary)

Firma nie opublikuje oferty bez formy zatrudnienia. Kierowca odfiltruje oferty po UoP/B2B/zleceniu z URL.
