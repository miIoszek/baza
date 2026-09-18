---
id: T-14
typ: zadanie
status: todo
priorytet: P2
obszar: [produkt, bezpieczeństwo]
projekt: Baza
szacunek: 1h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/produkt]
---

# T-14 Brak ochrony przed duplikatami aplikacji

## Problem

Ten sam kierowca może aplikować na tę samą ofertę dowolną liczbę razy. Nie ma constraintu, nie ma sprawdzenia w `applyToPublishedOffer` (`job-application.service.ts:48-122`). Jest nawet test, który to utrwala jako zamierzone:

```ts
// job-application.service.spec.ts:118
it('allows a second application for the same email (no unique constraint)', ...)
```

Skutki:
- skrzynka firmy zapycha się duplikatami — psuje to główną wartość produktu ([[Baza]] sprzedaje „firma dostaje aplikacje", nie „firma przekopuje się przez śmieci")
- każda aplikacja to plik do 5 MB w prywatnym R2, którego nikt nie skasuje ([[T-16 Retencja danych aplikacji i CV]])
- limit 10/min jest dziś globalny ([[T-01 Trust proxy dla rate limitingu]]), więc nie chroni pojedynczej oferty

## Jak naprawić

Nie idź od razu w twardy `UNIQUE (job_offer_id, email)` — kierowca może mieć uzasadniony powód, żeby wysłać poprawione CV. Lepiej:

```sql
-- miękkie okno: jedna aplikacja na ofertę na e-mail na dobę
create unique index job_applications_offer_email_day_idx
  on public.job_applications (job_offer_id, lower(email), (created_at::date));
```

i obsłuż kolizję jako czytelny komunikat („już aplikowałeś na tę ofertę dzisiaj"), a nie 500.

Alternatywa: zezwól na duplikat, ale **nadpisz** poprzednią aplikację (skasuj stare CV z R2). Wtedy firma widzi zawsze najnowszą wersję. Ładniejsze produktowo, więcej pracy.

## Decyzja do podjęcia

- [ ] Blokada czy nadpisanie? → zapisz jako ADR ([[Rejestr decyzji]])

## Definicja ukończenia

- [ ] Wybrane podejście wdrożone
- [ ] Stare CV usuwane z R2 przy nadpisaniu (jeśli ta ścieżka)
- [ ] Test zaktualizowany — obecny asercją utrwala stary stan
- [ ] Czytelny komunikat dla kierowcy

## Powiązane
- [[T-15 Brak powiadomień o nowej aplikacji]]
- [[T-16 Retencja danych aplikacji i CV]]
