---
id: T-16
typ: zadanie
status: todo
priorytet: P2
obszar: [rodo, dane, produkt]
projekt: Baza
szacunek: 1d
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/rodo, obszar/dane]
---

# T-16 Retencja danych aplikacji i CV

> [!warning] Zobowiązanie prawne, nie „nice to have"
> Przy zbieraniu CV od osób fizycznych w Polsce to nie jest opcjonalne.

## Problem

Tabela `job_applications` przechowuje e-mail, telefon, wiadomość i klucz do CV (`20260911210000_job_applications.sql`). Plus sam plik CV w prywatnym R2. Aplikacja zapisuje `consent_accepted_at`, czyli **zgoda jest odbierana i datowana** — co jest dobre. Ale poza tym nie ma nic:

- brak TTL / automatycznego czyszczenia
- brak endpointu „usuń moje dane" dla kierowcy
- brak informacji, jak długo dane są trzymane
- kasowanie danych następuje **tylko** przy usunięciu oferty przez firmę (`job-offer.service.ts:193-215`) — i to z bugiem przy >1000 plików ([[T-10 Paginacja kasowania prefiksów R2]])

Zebranie zgody bez określenia okresu retencji i bez ścieżki realizacji prawa do usunięcia to połowa obowiązku.

## Co trzeba zrobić

**1. Określ okres retencji.** Dla rekrutacji typowo 6–12 miesięcy od aplikacji. Zapisz decyzję jako ADR ([[Rejestr decyzji]]), podaj ją w klauzuli zgody.

**2. Automatyczne czyszczenie.** Cron (Supabase `pg_cron` albo zaplanowany job), który usuwa aplikacje starsze niż ustalony okres — **razem z plikami w R2**. Kolejność ma znaczenie: najpierw R2, potem wiersz (inaczej tracisz `cv_file_key` i plik zostaje osierocony).

**3. Ścieżka usunięcia na żądanie.** Minimum: adres kontaktowy + Twoja procedura ręczna, spisana jako runbook ([[Szablon - runbook]]). Docelowo: link w mailu potwierdzającym z tokenem.

**4. Klauzula informacyjna.** Kto jest administratorem, po co dane, jak długo, jakie prawa, do kogo pisać. Powinna być widoczna przy formularzu aplikacji, nie tylko w regulaminie.

## Jak to się łączy z resztą

To zadanie jest skutkiem tego samego problemu, co [[T-03 Weryfikacja adresu e-mail przy rejestracji]] i [[T-04 Unikalność i weryfikacja NIP]]: **przyjmujesz dane osobowe kierowców i przekazujesz je podmiotom, których nie weryfikujesz**. Retencja bez weryfikacji odbiorcy to porządkowanie danych, które nie powinny były trafić tam, gdzie trafiły.

Kolejność: najpierw weryfikacja firm (P0), potem retencja.

## Definicja ukończenia

- [ ] Okres retencji ustalony i zapisany w ADR ([[Rejestr decyzji]])
- [ ] Klauzula informacyjna przy formularzu aplikacji
- [ ] Cron czyszczący (R2 przed wierszem w bazie)
- [ ] Udokumentowana procedura usunięcia na żądanie
- [ ] Runbook: „kierowca prosi o usunięcie danych"

## Powiązane
- [[T-10 Paginacja kasowania prefiksów R2]]
- [[T-03 Weryfikacja adresu e-mail przy rejestracji]]
- [[RODO i dane osobowe]]
