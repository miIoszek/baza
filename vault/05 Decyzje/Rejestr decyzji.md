---
typ: indeks
projekt: Baza
aktualizacja: 2026-09-18
tags: [decyzja, indeks]
---

# Rejestr decyzji

Krótkie notatki o wyborach, które trudno cofnąć. Cel: żeby za pół roku wiedzieć **dlaczego**, a nie tylko **co**.

Nowa decyzja → [[Szablon - decyzja (ADR)]].

## Podjęte

| ID | Decyzja | Status | Data |
| -- | ------- | ------ | ---- |
| [[ADR-0001 Nest jedyną ścieżką do danych\|0001]] | Frontend nie rozmawia z PostgREST | zaakceptowana | 2026-09-11 |
| [[ADR-0002 Vault w repozytorium\|0002]] | Vault Obsidian mieszka w repo Bazy | zaakceptowana | 2026-09-18 |

## Do podjęcia

Wyszły z [[2026-09-17 Review techniczne pod produkcję]] — to rozwidlenia, gdzie trzeba wybrać, a nie oczywiste poprawki.

| Pytanie | Kontekst | Kto czeka |
| ------- | -------- | --------- |
| Duplikaty aplikacji: blokować czy nadpisywać? | Nadpisanie jest ładniejsze produktowo, blokada prostsza | [[T-14 Brak ochrony przed duplikatami aplikacji\|T-14]] |
| Okres retencji CV — 6 czy 12 miesięcy? | Trzeba podać w klauzuli zgody, więc decyzja jest publiczna | [[T-16 Retencja danych aplikacji i CV\|T-16]] |
| Enumeracja kont: ujednolicona odpowiedź czy czytelny UX? | Świadomy kompromis, nie oczywistość | [[T-13 Enumeracja kont przy rejestracji\|T-13]] |
| Osobne środowisko Supabase na testy? | Potrzebne do E2E z logowaniem; koszt i utrzymanie | [[T-24 E2E nie działa w CI\|T-24]] |
| Weryfikacja NIP w białej liście VAT? | Mocno podnosi zaufanie, dokłada zewnętrzną zależność | [[T-04 Unikalność i weryfikacja NIP\|T-04]] |
