---
id: T-13
typ: zadanie
status: todo
priorytet: P2
obszar: [bezpieczeństwo]
projekt: Baza
szacunek: 30min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/bezpieczeństwo]
---

# T-13 Enumeracja kont przy rejestracji

## Problem

`auth.service.ts:221-228`:

```ts
private mapSignUpError(message: string): Error {
  const msg = message.toLowerCase();
  if (msg.includes('already') || msg.includes('registered')) {
    return new ConflictException('Email already registered');   // ← 409 = "to konto istnieje"
  }
  ...
}
```

Atakujący przepuszcza listę adresów i po kodzie odpowiedzi wie, które firmy mają konto w Bazie. Przy limicie 10/min (dziś globalnym — [[T-01 Trust proxy dla rate limitingu]]) to wolne, ale wykonalne.

Sam w sobie drobiazg. W połączeniu z listą firm z publicznego `/api/companies` daje mapę "kto już jest" — użyteczną dla konkurencji albo do phishingu ("Twoje konto w Bazie wygasa...").

## Jak naprawić

Standardowe podejście: rejestracja zawsze zwraca 202 z komunikatem „jeśli ten adres nie był użyty, wysłaliśmy link aktywacyjny". Informacja o istniejącym koncie idzie **mailem**, nie w odpowiedzi HTTP.

Wymaga [[T-03 Weryfikacja adresu e-mail przy rejestracji]] — bez maili nie ma gdzie przenieść tej informacji. Zrób razem z T-03.

> [!note] Kompromis UX
> Czytelny komunikat „ten e-mail jest już zajęty" jest wygodniejszy dla uczciwego użytkownika. Przy tablicy ofert pracy dla firm (nie dla konsumentów) ryzyko jest umiarkowane — to jest świadoma decyzja, nie oczywistość. Jeśli uznasz, że UX wygrywa, zapisz to jako ADR ([[Rejestr decyzji]]) i zamknij zadanie jako `odrzucone`.

## Definicja ukończenia

- [ ] Decyzja: ujednolicona odpowiedź czy świadomie zostawiamy 409
- [ ] Jeśli ujednolicamy: 202 + informacja mailem
- [ ] Decyzja zapisana (ADR), jeśli odrzucamy

## Powiązane
- [[T-03 Weryfikacja adresu e-mail przy rejestracji]]
