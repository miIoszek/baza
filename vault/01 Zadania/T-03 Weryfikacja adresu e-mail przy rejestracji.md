---
id: T-03
typ: zadanie
status: todo
priorytet: P0
obszar: [bezpieczeństwo, rodo, produkt]
projekt: Baza
szacunek: 3h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
zamknięto: 
tags:
  - zadanie
  - priorytet/P0
  - obszar/bezpieczeństwo
  - obszar/rodo
---

# T-03 Weryfikacja adresu e-mail przy rejestracji

> [!danger] Blokada launchu — najpoważniejsze ryzyko w obecnym designie
> Razem z [[T-04 Unikalność i weryfikacja NIP]] tworzy gotową ścieżkę do zbierania CV kierowców przez podszywającego się.

## Problem

`auth.service.ts:65-69` tworzy konto z `email_confirm: true`:

```ts
const { data, error } = await adminClient.auth.admin.createUser({
  email: dto.email,
  password: dto.password,
  email_confirm: true,   // ← konto od razu potwierdzone, żaden mail nie wychodzi
});
```

Nikt nie musi udowodnić, że ma dostęp do podanej skrzynki.

## Dlaczego to jest gorsze niż zwykły spam

Pełna ścieżka ataku, **nic jej nie blokuje**:

1. Rejestracja na jednorazówkę (`mailinator` itp.)
2. Podanie nazwy i NIP-u realnej firmy transportowej — brak UNIQUE i brak weryfikacji ([[T-04 Unikalność i weryfikacja NIP]])
3. Ustawienie współrzędnych bazy (wymagane do publikacji — `job-offer.service.ts:447-460`)
4. Publikacja atrakcyjnej oferty
5. Zbieranie CV kierowców: imię, telefon, e-mail, **pełne CV w PDF**

To nie jest problem techniczny, tylko produktowy i prawny. Zbierasz dane osobowe w imieniu niezweryfikowanych podmiotów. Pod RODO jesteś administratorem tych danych i przy pierwszej skardze nie masz czym się bronić — nie wykazałeś żadnych środków weryfikacji odbiorcy.

## Jak naprawić

**Minimum przed launchem:**

```ts
email_confirm: false,   // Supabase wyśle mail potwierdzający
```

plus:
- flow potwierdzenia na froncie (`detectSessionInUrl: true` już jest w `supabase-client.ts:23`)
- blokada publikacji oferty dopóki `email_confirmed_at` jest puste
- konfiguracja szablonu maila w Supabase (PL, branding Baza)

**Uwaga na regresję:** `AuthService.register` po utworzeniu usera wstawia wiersz w `companies` i robi kompensację przy błędzie (`auth.service.ts:130-139`). Przy `email_confirm: false` ścieżka się nie zmienia, ale trzeba przetestować, czy `getCompanyForUser` nie wywala się dla niepotwierdzonego konta.

## Definicja ukończenia

- [ ] `email_confirm: false` + działający mail potwierdzający
- [ ] Niepotwierdzone konto nie może opublikować oferty
- [ ] Szablon maila po polsku
- [ ] Test: rejestracja → brak publikacji → potwierdzenie → publikacja działa
- [ ] Kompensacja przy błędzie rejestracji nadal sprząta osierocone konta

## Powiązane

- [[T-04 Unikalność i weryfikacja NIP]] — druga połowa tego samego ryzyka
- [[T-13 Enumeracja kont przy rejestracji]]
- [[T-16 Retencja danych aplikacji i CV]]
- [[RODO i dane osobowe]], [[Bezpieczeństwo]]
