---
typ: moc
aktualizacja: 2026-09-18
tags: [moc]
---

# Start tutaj

Twój vault. Notatki, zadania i decyzje wokół [[Baza|Bazy]].

## Skróty

| Idź do | Po co |
| ------ | ----- |
| [[Tablica zadań]] | **Co robić teraz** — wszystko z checkboxami, posortowane po priorytecie |
| [[Baza]] | Punkt wejścia do projektu |
| [[2026-09-17 Review techniczne pod produkcję]] | Pełny przegląd przed launchem |
| [[Deploy na produkcję]] | Zanim wciśniesz merge |
| [[Incydent - API nie odpowiada]] | Gdy coś płonie |
| [[Rejestr decyzji]] | Dlaczego zrobiliśmy to tak, a nie inaczej |

## Stan na dziś

> [!danger] 5 blokerów przed wpuszczeniem ruchu
> [[T-01 Trust proxy dla rate limitingu|T-01]] · [[T-02 Podatny multer na publicznych uploadach|T-02]] · [[T-03 Weryfikacja adresu e-mail przy rejestracji|T-03]] · [[T-04 Unikalność i weryfikacja NIP|T-04]] · [[T-05 Healthcheck na Railway|T-05]]
>
> Poza T-03 i T-04 to razem mniej niż godzina pracy.

## Struktura

| Katalog | Co tam trafia |
| ------- | ------------- |
| `01 Zadania` | Jedno zadanie = jedna notatka. Pola `status` i `priorytet` we frontmatterze |
| `02 Projekty` | Dokumentacja projektu — architektura, stack, model danych |
| `03 Obszary` | Tematy przekrojowe, które nigdy się nie „kończą" (bezpieczeństwo, wydajność…) |
| `04 Przeglądy` | Przeglądy kodu i audyty, datowane |
| `05 Decyzje` | ADR-y — wybory, które trudno cofnąć |
| `06 Runbooki` | Procedury: deploy, incydenty |
| `07 Dziennik` | Notatki dzienne |
| `99 Szablony` | Szablony dla nowych notatek |

**Zadanie vs. obszar:** zadanie ma koniec i da się je odhaczyć. Obszar to temat, który trwa — agreguje zadania i zbiera zasady.

## Jak używać

**Nowe zadanie:** utwórz notatkę w `01 Zadania` z [[Szablon - zadanie]]. Nadaj kolejny numer `T-XX` (stabilny — nie zmieniaj go, nawet gdy zmieni się priorytet; linki by się popsuły).

**Praca nad zadaniem:** zmień `status` na `w-toku`. Po skończeniu → `zrobione` + data w `zamknięto`. Zadanie świadomie porzucone → `odrzucone` i **dopisz dlaczego** — to bywa cenniejsze niż notatki o zrobionych rzeczach.

**Nowa decyzja:** jeśli za pół roku ktoś zapyta „czemu tak?" — spisz ADR. Jeśli nie zapyta, nie spisuj.

**Codziennie:** `Ctrl+P` → *Open today's daily note* (używa [[Szablon - notatka dzienna]]).

**Szablony:** [[Szablon - zadanie]] · [[Szablon - decyzja (ADR)]] · [[Szablon - przegląd]] · [[Szablon - runbook]] · [[Szablon - notatka dzienna]]

## Wtyczki

Vault działa bez żadnej wtyczki — wszystkie zapytania Dataview mają pod sobą listy statyczne.

Warto doinstalować (Ustawienia → Community plugins):

- **Dataview** — ożywia tabele w [[Tablica zadań]] i notatkach obszarów. Największy zysk, zainstaluj jako pierwszą
- **Tasks** — zapytania po checkboxach w wielu plikach
- **Templater** — mocniejszy niż wbudowane szablony (automatyczne daty, numery)

Po instalacji Dataview usuń statyczne listy, żeby nie utrzymywać dwóch źródeł prawdy.

## Konwencje

- **Po polsku** — tak jak produkt i kod (komunikaty błędów w Bazie są polskie)
- **Linkuj, nie kopiuj** — notatka mówiąca to samo co druga to notatka do usunięcia
- **Odniesienia do kodu jako `plik.ts:12-34`** — vault leży w repo, więc numery linii da się sprawdzić
- **Bez sekretów** — repo może być publiczne. Nazwy zmiennych tak, wartości nie

## Powiązane

- Kod: `apps/`, `libs/` · Tooling agentów: `context/`, `skills/` (osobna konwencja, patrz [[Baza]])
