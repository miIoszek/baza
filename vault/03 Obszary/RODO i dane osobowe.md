---
typ: obszar
projekt: Baza
aktualizacja: 2026-09-18
tags: [obszar, obszar/rodo]
---

# RODO i dane osobowe

> [!warning] To nie jest porada prawna
> Notatka techniczna — spis tego, gdzie w systemie siedzą dane osobowe i co z nimi jest nie tak. Przy launchu produktu zbierającego CV warto to skonsultować z kimś, kto się na tym zna.

## Otwarte zadania

- [ ] [[T-03 Weryfikacja adresu e-mail przy rejestracji]] — 🔴 **źródło problemu**
- [ ] [[T-04 Unikalność i weryfikacja NIP]] — 🔴 **źródło problemu**
- [ ] [[T-10 Paginacja kasowania prefiksów R2]] — 🟠 osierocone CV
- [ ] [[T-16 Retencja danych aplikacji i CV]] — 🟡 brak retencji i ścieżki usunięcia
- [ ] [[T-19 Migracje kasujące dane]] — 🟡 migracje kasowały aplikacje

## Gdzie są dane osobowe

| Gdzie | Co | Kto ma dostęp |
| ----- | -- | ------------- |
| `auth.users` (Supabase) | e-mail firmy | Supabase Auth, Nest przez service_role |
| `companies` | nazwa, NIP, opis, lokalizacja | Nest; **NIP i nazwa publicznie** przez `/api/companies/:id` |
| `job_applications` | e-mail, telefon, wiadomość kierowcy | Nest; firma widzi swoje przez `/api/company/applications` |
| R2 prywatny | **pliki CV** — najwrażliwsze dane w systemie | wyłącznie streaming przez Nest po sprawdzeniu właściciela |
| Sentry | ślady błędów | zależy od konfiguracji — patrz niżej |

## Główny problem

Kierowca wysyła CV firmie, której **nikt nie zweryfikował**:

- e-mail nie jest potwierdzany (`email_confirm: true`)
- NIP to dowolne 10 cyfr, bez `UNIQUE` i bez sumy kontrolnej
- nazwa firmy to wolny tekst

Czyli: przyjmujesz dane osobowe i przekazujesz je podmiotom, których tożsamości nie sprawdzasz. Zgoda jest odbierana i datowana (`consent_accepted_at`) — to dobrze — ale zgoda na przekazanie danych **niezweryfikowanemu** odbiorcy niewiele znaczy.

**Kolejność naprawy ma znaczenie:** najpierw weryfikacja firm ([[T-03 Weryfikacja adresu e-mail przy rejestracji|T-03]], [[T-04 Unikalność i weryfikacja NIP|T-04]]), potem retencja ([[T-16 Retencja danych aplikacji i CV|T-16]]). Porządkowanie danych, które nie powinny były trafić tam, gdzie trafiły, to zła kolejność.

## Czego brakuje

- [ ] Określony okres retencji (typowo 6–12 mies. dla rekrutacji)
- [ ] Automatyczne czyszczenie starych aplikacji **wraz z plikami R2**
- [ ] Ścieżka „usuń moje dane" dla kierowcy
- [ ] Klauzula informacyjna przy formularzu aplikacji (kto, po co, jak długo, jakie prawa)
- [ ] Runbook na żądanie usunięcia danych

## Co jest już dobrze

- Zgoda odbierana **i datowana** — `consent_accepted_at` jako `not null`
- CV w osobnym prywatnym buckecie, nigdy publiczny URL
- Pobieranie CV z `Cache-Control: private, no-store` i weryfikacją właściciela **oraz** prefiksu klucza
- Kasowanie oferty czyści pliki CV (z zastrzeżeniem [[T-10 Paginacja kasowania prefiksów R2|T-10]])
- Fail-closed: nie da się usunąć oferty z aplikacjami, gdy prywatne R2 jest niedostępne — zamiast osierocić pliki

## Do sprawdzenia

**Sentry a dane osobowe.** `instrument.ts` nie ustawia `sendDefaultPii`, więc domyślnie powinno być `false` — ale `AllExceptionsFilter` łapie każdy wyjątek 5xx i wysyła go do Sentry. Gdyby wyjątek poleciał z `applyToPublishedOffer`, w kontekście mogą siedzieć e-mail i telefon kierowcy. **Nie zweryfikowałem, co realnie ląduje w Sentry** — warto sprawdzić na prawdziwym zdarzeniu i w razie czego dodać `beforeSend` czyszczący ciała żądań.

## Powiązane

- [[Model danych i RLS]] · [[Bezpieczeństwo]]
