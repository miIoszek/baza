---
id: ADR-0002
typ: decyzja
status: zaakceptowana
data: 2026-09-18
projekt: Baza
tags: [decyzja, proces]
---

# ADR-0002: Vault w repozytorium

## Status

zaakceptowana — **do rewizji**, gdy vault zacznie obejmować sprawy spoza Bazy

## Kontekst

Ustalenia z [[2026-09-17 Review techniczne pod produkcję|review technicznego]] żyły tylko w historii czatu. Potrzebne było miejsce na zadania, notatki i decyzje, które przetrwa sesję.

Repo ma już katalog `context/` (foundation / changes / archive), ale to tooling agentów i kursu, z własnymi konwencjami — `AGENTS.md` wprost mówi, żeby nie traktować go jak kodu aplikacji ani jak ogólnego miejsca na notatki.

## Decyzja

Vault Obsidian pod `vault/` w repozytorium Bazy.

## Konsekwencje

**Dobre:**
- Notatki wersjonowane razem z kodem, którego dotyczą — `git blame` na zadaniu działa
- Odniesienia `plik.ts:12` da się zweryfikować w tym samym checkoutcie
- Jeden `git clone` i masz kod plus kontekst
- Nic dodatkowego do utrzymania — żadnego zewnętrznego narzędzia ani konta

**Złe / koszt:**
- Vault przeznaczony na „wszystkie moje notatki" rozrośnie się poza Bazę, a wtedy mieszkanie w repo projektu przestanie mieć sens
- Notatki są publiczne, jeśli repo jest publiczne — **nie wpisuj tu nic wrażliwego** (dane klientów, sekrety, sprawy osobowe)
- Zmiany w notatkach zaśmiecają historię gita projektu

**Co to zamyka:** nic. Vault to zwykłe pliki markdown — przeniesienie to `git mv` albo skopiowanie katalogu.

## Rozważane alternatywy

| Opcja | Dlaczego odrzucona |
| ----- | ------------------ |
| Osobne repo na vault | Zrywa związek między notatką a commitem, którego dotyczy. Sensowne dopiero, gdy vault obejmie wiele projektów |
| Dopisać do `context/` | Konwencje `context/` należą do skilli agentów; mieszanie zaśmieca oba |
| Vault poza gitem (lokalnie / chmura) | Brak wersjonowania i brak powiązania z kodem |

## Kiedy to zrewidować

Gdy zaczniesz wrzucać do vaulta rzeczy niezwiązane z Bazą. Wtedy: osobne repo vaulta, a `vault/` w Bazie zostaje jako podzbiór projektowy albo znika.

## Powiązane

- [[00 Start tutaj]] · [[Baza]]
