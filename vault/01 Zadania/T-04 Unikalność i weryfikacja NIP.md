---
id: T-04
typ: zadanie
status: todo
priorytet: P0
obszar: [bezpieczeństwo, dane, produkt]
projekt: Baza
szacunek: 2h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P0
  - obszar/bezpieczeństwo
  - obszar/dane
---

# T-04 Unikalność i weryfikacja NIP

> [!danger] Blokada launchu
> Druga połowa ryzyka z [[T-03 Weryfikacja adresu e-mail przy rejestracji]].

## Problem

`companies.nip` nie ma constraintu `UNIQUE` (`supabase/migrations/20260904120000_create_companies.sql`). Jedyna walidacja to regex 10 cyfr:

```ts
// auth/dto/register-company.dto.ts:17-19
@Matches(/^\d{10}$/, { message: 'NIP must be exactly 10 digits' })
nip!: string;
```

```sql
-- 20260909121000_companies_field_length_limits.sql
add constraint companies_nip_digits check (nip ~ '^\d{10}$');
```

Czyli: dowolne 10 cyfr, dowolna liczba firm na tym samym NIP-ie. Na tablicy ofert pracy, gdzie NIP jest **wyświetlany publicznie** jako dowód wiarygodności (`company-public.service.ts:76` zwraca `nip` w profilu publicznym), to zaproszenie do podszywania się.

## Jak naprawić

**Krok 1 — suma kontrolna NIP** (czysta funkcja, łatwa do przetestowania):

```ts
// libs/shared/types/src/lib/nip.ts
const WAGI = [6, 5, 7, 2, 3, 4, 5, 6, 7];

export function isValidNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false;
  const cyfry = [...nip].map(Number);
  const suma = WAGI.reduce((acc, waga, i) => acc + waga * cyfry[i], 0);
  const kontrolna = suma % 11;
  return kontrolna !== 10 && kontrolna === cyfry[9];
}
```

Odrzuca `0000000000` i losowe ciągi cyfr. Podziel się nią z frontem przez `@baza/shared-types` — walidacja po obu stronach.

**Krok 2 — UNIQUE w bazie:**

```sql
-- najpierw sprawdź, czy nie ma już duplikatów:
select nip, count(*) from public.companies group by nip having count(*) > 1;

alter table public.companies
  add constraint companies_nip_unique unique (nip);
```

Obsłuż kolizję w `AuthService.register` jako `ConflictException` z sensownym komunikatem (dziś `companyError` leci jako generyczny `BadRequestException('Failed to create company profile')` — `auth.service.ts:93-100`).

**Krok 3 (po launchu) — weryfikacja w rejestrze:** API Ministerstwa Finansów (biała lista podatników VAT) pozwala sprawdzić, czy NIP istnieje i do kogo należy. Pozwoliłoby to autouzupełnić nazwę firmy zamiast ufać wpisowi użytkownika. To osobne zadanie, nie blokuje launchu.

## Definicja ukończenia

- [ ] `isValidNip` w `@baza/shared-types` + testy jednostkowe (poprawne i niepoprawne NIP-y)
- [ ] Walidacja na FE i w DTO
- [ ] Migracja z `UNIQUE` (po sprawdzeniu duplikatów na produkcji)
- [ ] Kolizja NIP zwraca 409 z czytelnym komunikatem, nie generyczne 400
- [ ] Moderacja pierwszej oferty nowej firmy — choćby ręczna, choćby mail do Ciebie

## Powiązane

- [[T-03 Weryfikacja adresu e-mail przy rejestracji]]
- [[Model danych i RLS]], [[RODO i dane osobowe]]
