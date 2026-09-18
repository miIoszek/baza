---
id: T-15
typ: zadanie
status: todo
priorytet: P2
obszar: [produkt]
projekt: Baza
szacunek: 4h
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/produkt]
---

# T-15 Brak powiadomień o nowej aplikacji

> [!tip] To jest zadanie produktowe, nie techniczne
> Technicznie nic nie jest zepsute. Ale bez tego pętla marketplace się nie domyka.

## Problem

Grep po `apps/` i `libs/` nie znajduje żadnego klienta pocztowego (`nodemailer`, `resend`, `sendgrid`, `postmark`) ani logiki powiadomień. Kiedy kierowca wyśle aplikację, firma **nie dowiaduje się o tym w żaden sposób** — musi sama pamiętać, żeby się zalogować i sprawdzić skrzynkę (`/company/applications`).

## Dlaczego to podkopuje produkt

Roadmapa nazywa S-05 („firma dostaje aplikację kierowcy w skrzynce") **north star** — najmniejszym wycinkiem dowodzącym hipotezy produktowej. Ale bez powiadomienia ta pętla zamyka się tylko wtedy, gdy firma z własnej inicjatywy wróci na serwis.

Realny scenariusz: kierowca aplikuje, firma orientuje się po 5 dniach, kierowca ma już inną pracę. Obie strony uznają, że Baza nie działa — mimo że technicznie zadziałała bezbłędnie.

To jest różnica między "funkcja jest zaimplementowana" a "produkt działa".

## Jak naprawić

Najprostsza wersja, która załatwia 90% wartości: mail do firmy natychmiast po `applyToPublishedOffer`.

- Resend albo Postmark (proste API, dobry deliverability, darmowy tier wystarczy na start)
- Treść: tytuł oferty, imię/kontakt kierowcy, link do skrzynki — **bez załączonego CV** (dane osobowe w mailu to niepotrzebne ryzyko; niech kliknie i pobierze z aplikacji)
- Wysyłka **poza transakcją** — nieudany mail nie może wywalić zapisu aplikacji

```ts
// po udanym insert w applyToPublishedOffer
void this.mailer.notifyNewApplication(company.email, offer.title, row.id)
  .catch((err) => this.logger.error(`Powiadomienie nie wyszło: ${err.message}`));
```

> [!warning] Nie blokuj aplikacji kierowcy na wysyłce maila
> Jeśli dostawca poczty leży, kierowca ma nadal wysłać CV. Fire-and-forget + log + Sentry.

## Kolejne kroki (osobne zadania)

- dzienne podsumowanie zamiast maila za każdym razem (gdy wolumen wzrośnie)
- powiadomienie do kierowcy, że aplikacja dotarła (buduje zaufanie do serwisu)

## Definicja ukończenia

- [ ] Wybrany dostawca poczty + klucz w zmiennych Railway
- [ ] Mail po nowej aplikacji, bez CV w załączniku
- [ ] Błąd wysyłki nie przerywa zapisu aplikacji
- [ ] Test z mockiem mailera

## Powiązane
- [[T-14 Brak ochrony przed duplikatami aplikacji]]
- [[Baza]]
