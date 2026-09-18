---
typ: projekt
status: przed-launchem
projekt: Baza
repo: https://github.com/miIoszek/baza
aktualizacja: 2026-09-18
tags: [projekt, moc]
---

# Baza

Tablica ofert pracy dla branży transportowej. Kierowcy szukają ofert dopasowanych do tras i rytmu powrotów do domu; firmy transportowe publikują oferty i odbierają aplikacje.

W MVP: bez płatności, bez konta po stronie kierowcy.

## Wedge produktowy

> Dopasowanie po **trasie** i **kadencji powrotu do domu**, z wizualizacją na mapie — dla przeglądania i dla aplikowania.

To jest cecha, po której usunięciu Baza staje się kolejną zwykłą tablicą ofert. Każda decyzja techniczna, która ją osłabia (np. wolna mapa, zepsute filtry), jest droższa niż wygląda.

## Stan

Wszystkie wycinki z roadmapy (F-01 → S-06) są oznaczone jako `done`. Pętla marketplace działa end-to-end: firma się rejestruje → publikuje ofertę → kierowca filtruje i aplikuje → firma widzi aplikację w skrzynce.

**Czego brakuje do launchu:** 5 blokerów z [[2026-09-17 Review techniczne pod produkcję]]. Zobacz [[Tablica zadań]].

> [!warning] Największa luka nie jest techniczna
> Pętla „firma dostaje aplikację" domyka się tylko, gdy firma sama wróci na serwis — brak powiadomień ([[T-15 Brak powiadomień o nowej aplikacji|T-15]]). A rejestracja nie weryfikuje, kto zbiera CV kierowców ([[T-03 Weryfikacja adresu e-mail przy rejestracji|T-03]], [[T-04 Unikalność i weryfikacja NIP|T-04]]).

## Nawigacja

- [[Architektura]] — jak to jest poskładane
- [[Stack i infrastruktura]] — gdzie to stoi i skąd bierze konfigurację
- [[Model danych i RLS]] — tabele, polityki, dlaczego wszystko idzie przez Nest
- [[Tablica zadań]] — co do zrobienia
- [[2026-09-17 Review techniczne pod produkcję]] — pełny przegląd

## Obszary

[[Bezpieczeństwo]] · [[Wydajność i skalowanie]] · [[CI-CD i deploy]] · [[RODO i dane osobowe]] · [[Jakość kodu i testy]]

## Uwaga o `context/`

Katalog `context/` w repo (foundation / changes / archive) to tooling kursu i agentów, z własnymi konwencjami. **Ten vault go nie zastępuje i nie duplikuje** — `context/` opisuje proces prowadzenia zmian, vault trzyma Twoje notatki, zadania i decyzje. Gdy coś z `context/foundation` jest istotne dla zadania, linkuj ścieżkę, nie kopiuj treści.
