---
project: Baza
version: 1
status: draft
created: 2026-09-17
prd_version: 1
purpose: wsad do narzędzia projektowego (Claude Design / Figma)
---

# Baza — brief produktowy i designerski

> Źródło prawdy o produkcie: `context/foundation/prd.md`, o stacku: `context/foundation/tech-stack.md`.
> Ten dokument to **materiał wejściowy do projektowania UI**: opis aplikacji, ekrany, stany, słowniki, gotowe prompty.
> Cały interfejs jest **po polsku** (MVP jednojęzyczny).

## 0. Jak tego użyć

| Sekcja | Do czego |
|---|---|
| 1–6 | Kontekst produktu + język wizualny → wklej **raz** na starcie sesji projektowej |
| 7 | Ekran po ekranie → projektuj **jeden ekran na raz** |
| 8 | Inwentarz komponentów → do design systemu |
| 9 | Gotowe prompty do skopiowania |
| 10 | Realistyczne dane do makiet (zamiast „Lorem ipsum") |
| 11 | Decyzje do podjęcia **przed** projektowaniem + uwagi krytyczne |

---

## 1. Czym jest Baza (elevator pitch)

**Baza to tablica ofert pracy dla branży transportu (TSL) w Polsce.**

Firmy transportowe publikują darmowe oferty dla kierowców. Kierowcy przeglądają je bez zakładania konta,
filtrują po **krajach tras** i **częstotliwości powrotów do domu**, oglądają trasy **na mapie**
i aplikują wysyłając e-mail, telefon i CV — bez rejestracji.

Firma dostaje aplikacje do swojej skrzynki w panelu.

## 2. Problem i wyróżnik — to musi być widać w designie

Zwykłe portale pracy dopasowują po tytule stanowiska i mieście. W transporcie o tym,
czy kierowca **zostanie w firmie**, decydują dwie rzeczy:

1. **Gdzie jeździ** — kraje i kierunki tras (np. PL → IT).
2. **Jak często wraca do domu** — codziennie / co tydzień / co dwa tygodnie / co miesiąc.

Wyróżnik produktu = **filtrowanie po trasie + kadencji powrotu, pokazane wizualnie na mapie**,
a nie kolejna lista tekstowa.

**Konsekwencja dla designu:** trasa i powrót do domu to **informacja pierwszej klasy** —
najbardziej widoczna rzecz na karcie oferty zaraz po tytule. Mapa nie jest ozdobą, tylko sposobem
czytania oferty. Jeśli z makiety da się usunąć mapę i trasy i nic się nie zmieni — makieta jest zła.

## 3. Użytkownicy i konteksty użycia

### Kierowca zawodowy (strona popytowa, ~80% ruchu)
- 25–55 lat, telefon z Androidem (często średnia półka), przegląda oferty **na parkingu, w kabinie, w przerwie**.
- Często w jasnym słońcu, czasem w rękawiczkach, jedną ręką.
- **Nie ma konta i nie chce go zakładać.** Wchodzi z linku / wyszukiwarki, skanuje, aplikuje, wychodzi.
- Ma CV w PDF w telefonie. Jeśli aplikowanie zajmie więcej niż ~60 sekund — rezygnuje.
- Nie czyta długich opisów. Skanuje: kraj → powrót do domu → stawka → kto to za firma.

### Osoba rekrutująca w firmie transportowej (strona podażowa)
- Właściciel, kierownik floty albo rekruter w firmie 5–200 pojazdów.
- Pracuje na **desktopie**, w biurze, między innymi zadaniami.
- Wchodzi rzadko i konkretnie: dodać ofertę, sprawdzić, czy ktoś aplikował, pobrać CV.
- Nie jest to osoba techniczna. Formularz oferty musi być wypełnialny bez instrukcji.

**Proporcja projektowania:** kierowca = **mobile-first**, firma = **desktop-first**.

## 4. Zasady projektowe

1. **Mobile-first dla części publicznej.** Projektuj ofertę najpierw na 390 px szerokości.
2. **Skanowalność > gęstość.** Kierowca ma ocenić ofertę w 3 sekundy: tytuł, trasa, powrót do domu, stawka, firma.
3. **Kontrast ponad estetykę.** Ekran czytany w słońcu. Tekst min. 4.5:1, duże cele dotykowe (min. 44×44 px).
4. **Aplikowanie bez tarcia.** Formularz aplikacji: 3 pola + plik + zgoda. Żadnego kroku „załóż konto".
5. **Mapa jako narzędzie, nie dekoracja.** Trasa czytelna bez najeżdżania kursorem; na telefonie mapa nie może zjadać całego ekranu.
6. **Uczciwe stany puste.** Młody marketplace bywa pusty — pusty wynik filtrowania musi podpowiadać, co poluzować.
7. **Polski, prosty język.** Bez korpo-mowy i bez angielskich wtrętów („Aplikuj", nie „Apply now").

## 5. Język wizualny — stan obecny (tokeny wprost z kodu)

Aplikacja **już ma** motyw: ciemny, granatowy, „premium/glass". Źródło: `apps/baza-frontend/src/styles/_theme.scss`.
Możesz go kontynuować albo świadomie odrzucić (patrz sekcja 11), ale warto go znać.

**Paleta (dark):**

| Rola | Hex |
|---|---|
| Tło strony (najciemniejsze) | `#020617` |
| Tło / background | `#0f172a` |
| Powierzchnia (karty) | `#1e293b` |
| Powierzchnia wariant | `#334155` |
| Tekst na tle | `#e2e8f0` |
| Tekst drugorzędny | `#94a3b8` |
| Obrys | `#64748b` / `#475569` |
| **Primary** (sky) | `#90caf9`, tekst na primary `#003258` |
| **Secondary** (safety green) | `#6ee7b7` |
| **Tertiary** (amber) | `#fbbf24` |
| Error | `#f87171` |

**Kolory znaczników (tagów) na kartach ofert:** prawo jazdy = niebieski `#90caf9`, powrót do domu = zielony `#6ee7b7`,
typ transportu = bursztyn `#fbbf24`, doświadczenie = fiolet `#a78bfa`, wynagrodzenie = turkus `#2dd4bf`,
lokalizacja = szary `#94a3b8`, trasa = błękit `#60a5fa`. Każdy tag: tekst w kolorze, tło = kolor 12–16% alpha, obrys = kolor 32–40% alpha.

**Mapa:** punkt A = primary (niebieski), punkt B = secondary (zielony), linia trasy = tertiary (bursztyn), tło mapy `#020617`.

**Kształty i typografia:**
- Font: Roboto (Material 3).
- Promień: karty `24px`, pola formularza i przyciski `14px`, tagi ≈ pigułka.
- Karty „glass": tło `rgba(30,41,59,0.42)` + `backdrop-filter: blur(28px)`, cień `0 16px 48px rgba(0,0,0,0.55)`.
- Przycisk główny: wysokość 48 px, waga 600, poświata `0 0 20px rgba(144,202,249,0.55)`.
- Tło strony: radialny gradient `#1e293b → #0f172a → #020617`.
- Szerokość treści: max `90rem`, padding strony `64px` (desktop), pasek górny `64px`.

**Logo:** ciemnogranatowa sylwetka / znak „Baza" (`apps/baza-frontend/public/baza-logo.png`), proporcja ok. 36×44.

## 6. Ograniczenia techniczne (co da się zbudować tanio)

- Front: **Angular 22 + Angular Material 3** (komponenty: toolbar, card, form-field filled, select, checkbox, button, icon).
  Design, który nie mapuje się na komponenty Material, kosztuje dużo czasu na implementację.
- Mapa: **Leaflet 1.9** + własny, uproszczony basemap granic państw (nie Google Maps, brak zdjęć satelitarnych,
  brak street view). Mapa = płaskie kontury krajów, etykiety krajów, piny i łuki tras ze strzałkami.
- Ikony: Material Symbols.
- Brak biblioteki animacji — animacje ograniczone do CSS transition.
- Pliki (logo firmy, CV) trafiają do Cloudflare R2; CV to wyłącznie **PDF do 5 MB**.
- Sesja firmy: Supabase Auth (e-mail + hasło).

---

## 7. Ekrany

Legenda: 🚚 = kierowca (publiczne), 🏢 = firma (po zalogowaniu).

| Ścieżka | Ekran | Kto |
|---|---|---|
| `/` | Oferty pracy — lista + filtry (docelowo także mapa) | 🚚 |
| `/job-offers/:id` | Szczegóły oferty + mapa tras + formularz aplikacji | 🚚 |
| `/companies` | Katalog pracodawców | 🚚 |
| `/companies/:id` | Publiczny profil firmy + jej oferty | 🚚 |
| `/login` | Logowanie firmy | 🏢 |
| `/register` | Rejestracja firmy | 🏢 |
| `/company/profile` | Edycja profilu firmy | 🏢 |
| `/company/offers` | Moje oferty | 🏢 |
| `/company/offers/new`, `/company/offers/:id/edit` | Formularz oferty | 🏢 |
| `/company/inbox` | Skrzynka aplikacji | 🏢 |

### Wspólna nawigacja (górny pasek, wysokość 64 px)

- Lewo: logo + wordmark „Baza" (link do `/`).
- Prawo, niezalogowany: „Oferty pracy", „Pracodawcy", „Login".
- Prawo, zalogowana firma: „Oferty pracy", „Pracodawcy", „Moje oferty", „Skrzynka", „Dodaj ofertę",
  awatar + nazwa firmy (link do profilu), „Wyloguj".
- **Do zaprojektowania:** wersja mobilna tego paska (dziś rozjeżdża się przy 6 linkach) — hamburger albo dolny pasek.

---

### 7.1 🚚 Oferty pracy — `/` (ekran #1, najważniejszy)

**Cel:** kierowca ma w kilkanaście sekund znaleźć oferty pasujące do jego tras i rytmu powrotów.

**Zawartość:**
- Nagłówek: „Oferty pracy" + podtytuł „Praca dla kierowców w branży transportu — według tras i powrotów do domu".
- **Filtry** (4 + akcje):
  - „Kraje trasy" — wielokrotny wybór z listy 39 krajów (np. Polska (PL), Włochy (IT)).
  - „Powrót do domu" — jeden z: Dowolna / Codziennie / Co tydzień / Co dwa tygodnie / Co miesiąc / Elastycznie.
  - „Prawo jazdy" — Dowolna / B / C / CE / C+E.
  - „Typ transportu" — Dowolny / 13 typów (patrz słownik).
  - Przyciski: „Użyj mojej lokalizacji" (sortuje najbliższe bazy), „Wyczyść filtry" (tylko gdy coś ustawione).
  - Komunikat po użyciu lokalizacji: „Sortowanie: najbliższe bazy względem Twojej lokalizacji".
- **Lista kart ofert.** Każda karta (cała klikalna) zawiera:
  - logo firmy 48×48 (lub placeholder z pierwszą literą) + nazwa firmy (osobny link do profilu firmy),
  - lokalizacja bazy (np. „Poznań, Wielkopolskie"),
  - **tytuł oferty** (H2),
  - sekcja „Trasy": pigułki `PL→IT`, `PL→DE`,
  - pigułki szczegółów: „Prawo jazdy C+E", „Co dwa tygodnie", „Plandeka / firanka", „min. 2 lata", opcjonalnie „8 000–10 000 PLN".

**Stany:**
- Ładowanie: „Ładowanie ofert…".
- Błąd: komunikat + „Spróbuj ponownie".
- Pusto z filtrami: „Brak ofert dla wybranych filtrów. Spróbuj poluzować kraj lub kadencję." + „Wyczyść filtry".
- Pusto bez filtrów: „Brak opublikowanych ofert.".
- Błąd geolokalizacji: komunikat w kolorze błędu.

**Mobile:** filtry muszą się zwijać (pasek chipów z licznikiem aktywnych filtrów → panel/bottom sheet z filtrami).
Karty jednokolumnowo, cel dotykowy na całą kartę.

**Luka do zaprojektowania (ważne):** PRD obiecuje listę **i mapę** na tym ekranie, a dziś mapy tu nie ma
(jest tylko na szczegółach oferty). Zaprojektuj:
- desktop: układ dzielony — lista po lewej (ok. 420–520 px), mapa po prawej, piny w bazach firm, podświetlenie karty ↔ pinu;
- mobile: przełącznik „Lista / Mapa" (lista domyślnie, zgodnie z wymaganiami niefunkcjonalnymi).

---

### 7.2 🚚 Szczegóły oferty — `/job-offers/:id` (ekran #2)

**Cel:** przekonać kierowcę i przyjąć aplikację bez rejestracji.

**Układ desktop:** dwie kolumny 1:1 — lewa: treść oferty + formularz aplikacji, prawa: mapa tras (sticky).
**Układ mobile (< 768 px):** jedna kolumna; mapa nad treścią albo zwinięta.

**Lewa kolumna:**
- Pasek akcji: „← Oferty" oraz przycisk główny „Aplikuj teraz" (przewija do formularza).
- Tytuł oferty + podtytuł: „Plandeka / firanka · Co dwa tygodnie".
- Link do firmy: logo + nazwa.
- Lista pól (`dt/dd`): **Trasy** (np. „Polska (PL) → Włochy (IT)" — najechanie podświetla trasę na mapie),
  Wymagane doświadczenie („2 lata"), Prawo jazdy („C+E"), Wynagrodzenie (opcjonalne), Lokalizacja bazy, Opis.
- **Karta „Aplikuj"** (wyróżniona, glass):
  - nagłówek „Aplikuj" + „Bez konta — e-mail, telefon i CV (PDF)",
  - pola: E-mail (ikona koperty), Telefon (ikona słuchawki, placeholder `+48 123 456 789`),
    Wiadomość (opcjonalnie, textarea, max 2000 znaków),
  - strefa pliku: „CV (PDF, max. 5 MB)" / „Wybierz plik"; po wyborze nazwa pliku + „Kliknij, aby zmienić",
  - checkbox zgody: „Wyrażam zgodę na przetwarzanie danych osobowych w celu rekrutacji",
  - przycisk „Wyślij aplikację" (pełna szerokość) / stan „Wysyłanie…",
  - stan sukcesu zastępuje formularz: „Aplikacja wysłana" + „Dziękujemy. Twoja aplikacja została przekazana firmie.".

**Prawa kolumna — mapa tras:**
- Płaskie kontury krajów na ciemnym tle, etykiety krajów.
- Pin bazy firmy.
- Dla każdej trasy: łuk od kraju A do kraju B ze strzałką kierunku, punkt A niebieski, punkt B zielony, linia bursztynowa.
- Podświetlenie trasy przy najechaniu na pozycję z listy tras.

**Stany:** ładowanie („Ładowanie oferty…"), nie znaleziono („Nie znaleziono oferty" / „Oferta nie istnieje albo została wycofana." + „← Wszystkie oferty"), błędy walidacji pól, błąd wysyłki.

---

### 7.3 🚚 Katalog pracodawców — `/companies`

Siatka kart firm: logo, nazwa, lokalizacja bazy, „Oferty: 3". Nagłówek „Pracodawcy".
Stany: ładowanie / błąd + „Spróbuj ponownie" / pusto.

### 7.4 🚚 Publiczny profil firmy — `/companies/:id`

Nagłówek: logo, nazwa firmy, „NIP: 1234563218", lokalizacja, opis firmy.
Sekcja „Oferty pracy" — lista ofert tej firmy (tytuł + trasy, link do szczegółów).
Stany: ładowanie profilu, „Nie znaleziono firmy", „Brak opublikowanych ofert.".

### 7.5 🏢 Logowanie — `/login`

Wycentrowana karta na pełnoekranowym tle. Znak „Baza" nad kartą.
Tytuł „Witaj ponownie", podtytuł „Zaloguj się na konto firmy".
Pola: Email, Hasło (z przełącznikiem widoczności). Przycisk główny. Stopka: „Nie masz konta? **Zarejestruj się**".

### 7.6 🏢 Rejestracja firmy — `/register`

Ta sama forma karty. Tytuł „Dołącz do Bazy".
Pola: Nazwa firmy, NIP, Email, Lokalizacja bazowa, Krótki opis, Hasło, Potwierdź hasło, checkbox regulaminu.
Błąd: „Musisz zaakceptować regulamin". Stopka: „Masz już konto? **Zaloguj się**".
**Uwaga:** 7 pól w jednej kolumnie to dużo — rozważ dwa kroki (konto → dane firmy) albo układ dwukolumnowy na desktopie.

### 7.7 🏢 Profil firmy (edycja) — `/company/profile`

Formularz: Nazwa firmy, NIP, Lokalizacja bazowa, Szerokość (lat) + Długość (lng), Krótki opis, logo firmy.
Podpowiedź o współrzędnych (potrzebne, żeby oferta miała pin na mapie), błąd „Podaj obie współrzędne albo żadnej".
Link „Zobacz profil publiczny". **Do przemyślenia w designie:** ręczne wpisywanie lat/lng jest nieprzyjazne —
zaprojektuj wybór punktu na małej mapce.

### 7.8 🏢 Moje oferty — `/company/offers`

Tytuł „Moje oferty", podtytuł „Zarządzaj ogłoszeniami firmy".
Lista ofert: tytuł, status (opublikowana / szkic), meta (data), akcje: „Edytuj", „Wycofaj", „Usuń" (z potwierdzeniem).
Stany: ładowanie, błąd + „Spróbuj ponownie", pusto → wyraźne CTA „Dodaj pierwszą ofertę".

### 7.9 🏢 Formularz oferty — `/company/offers/new` i `/:id/edit`

Tytuł „Nowa oferta" / „Edytuj ofertę", podtytuł „Darmowa oferta pracy dla kierowców".
Pola: Tytuł, Opis, Powrót do domu (select), Lata doświadczenia (liczba), Typ transportu, Wymagane prawo jazdy.
Sekcja „Trasy": powtarzalne wiersze „Z kraju" → „Do kraju" + usuń, przycisk „Dodaj trasę".
Sekcja „Wynagrodzenie (opcjonalnie)": Od, Do, Waluta (3 znaki).
Status: opublikowana / szkic + podpowiedź, że publikacja wymaga współrzędnych w profilu firmy.
**To najbardziej złożony formularz w aplikacji — zasługuje na osobną uwagę w designie** (szczególnie edytor tras).

### 7.10 🏢 Skrzynka aplikacji — `/company/inbox`

Tytuł „Skrzynka aplikacji", podtytuł „Aplikacje kierowców do ofert Twojej firmy".
Lista aplikacji: nazwa oferty, e-mail, telefon, data, opcjonalna wiadomość, przycisk „Pobierz CV".
Stany: ładowanie, „Brak aplikacji.".
**Do przemyślenia:** brak statusów aplikacji (nowa / w kontakcie / odrzucona) — świadomie poza MVP,
ale design powinien przewidzieć miejsce na taki znacznik.

---

## 8. Inwentarz komponentów do zaprojektowania

1. **Karta oferty** (lista) — wariant desktop / mobile, stan hover, stan „wyróżniona na mapie".
2. **Pigułka / tag** — 7 wariantów kolorystycznych (trasa, prawo jazdy, powrót do domu, transport, doświadczenie, wynagrodzenie, lokalizacja).
3. **Pasek filtrów** — desktop (w linii) i mobile (chipy + panel), licznik aktywnych filtrów, licznik wyników.
4. **Mapa** — pin bazy, łuk trasy ze strzałką, etykieta kraju, stan podświetlenia, kontrolki zoom.
5. **Stan pusty / ładowanie / błąd** (jeden spójny komponent, trzy odmiany).
6. **Formularz** — pole tekstowe (filled, promień 14), select, textarea, checkbox, upload pliku, komunikaty błędów.
7. **Przycisk** — główny (z poświatą), obrysowany, tekstowy, w trzech stanach + disabled/loading.
8. **Awatar / logo firmy** — 32, 48, 96 px + placeholder z literą.
9. **Górny pasek** — wersja gość / zalogowana firma / mobile.
10. **Karta aplikacji w skrzynce**.

---

## 9. Gotowe prompty do Claude Design

**Prompt startowy (wklej raz):**

> Projektuję „Bazę" — polską tablicę ofert pracy dla kierowców zawodowych w transporcie.
> Kierowcy (mobile, często w słońcu, bez konta) przeglądają oferty i filtrują je po **krajach tras**
> i **częstotliwości powrotów do domu**, oglądają trasy na mapie i aplikują e-mailem, telefonem i CV w PDF.
> Firmy transportowe (desktop) publikują darmowe oferty i odbierają aplikacje w skrzynce.
> Wyróżnik produktu: dopasowanie po trasie i powrocie do domu + wizualizacja tras na mapie — to musi być
> najbardziej widoczna informacja w interfejsie.
> Cały interfejs po polsku. Mobile-first dla części kierowcy, desktop-first dla panelu firmy.
> Styl: ciemny granat (#0f172a / #020617), akcent błękitny #90caf9, zielony #6ee7b7, bursztyn #fbbf24,
> font Roboto, karty o promieniu 24 px, pola i przyciski 14 px. Wysoki kontrast, duże cele dotykowe.
> Docelowa implementacja: Angular Material 3 — używaj układów, które da się złożyć ze standardowych komponentów.

**Ekran 1 — lista ofert (mobile):**

> Zaprojektuj ekran „Oferty pracy" na telefonie (390 px). Góra: pasek z logo „Baza". Pod nim tytuł
> i pasek filtrów jako chipy: „Kraje trasy", „Powrót do domu", „Prawo jazdy", „Typ transportu" + licznik aktywnych filtrów
> i przełącznik „Lista / Mapa". Dalej lista kart ofert. Karta: logo firmy 48 px + nazwa firmy + miasto bazy,
> tytuł oferty, pigułki tras (PL→IT, PL→DE), pigułki: „Prawo jazdy C+E", „Co dwa tygodnie",
> „Plandeka / firanka", „min. 2 lata", „8 000–10 000 PLN". Użyj prawdziwych polskich nazw firm i miast.
> Pokaż też stan pusty: „Brak ofert dla wybranych filtrów. Spróbuj poluzować kraj lub kadencję." z przyciskiem „Wyczyść filtry".

**Ekran 1b — lista ofert z mapą (desktop):**

> Ta sama treść na desktopie 1440 px w układzie dzielonym: po lewej kolumna filtrów i listy ofert (ok. 480 px),
> po prawej mapa Europy (płaskie kontury krajów na ciemnym tle) z pinami w bazach firm. Najechanie na kartę
> podświetla pin i odwrotnie. Mapa nie przewija się razem z listą.

**Ekran 2 — szczegóły oferty + aplikacja:**

> Zaprojektuj ekran szczegółów oferty na desktopie 1440 px, dwie kolumny. Lewa: tytuł „Kierowca C+E — trasy PL–IT",
> podtytuł „Plandeka / firanka · Co dwa tygodnie", firma z logo, lista pól (Trasy, Wymagane doświadczenie,
> Prawo jazdy, Wynagrodzenie, Lokalizacja bazy, Opis), pod nimi wyróżniona karta „Aplikuj" z polami
> E-mail, Telefon, Wiadomość (opcjonalnie), strefą wgrania CV („CV (PDF, max. 5 MB)"), zgodą RODO
> i przyciskiem „Wyślij aplikację". Prawa kolumna: mapa z pinem bazy i łukami tras ze strzałkami
> (start niebieski, koniec zielony, linia bursztynowa). Pokaż też wersję mobilną i stan po wysłaniu:
> „Aplikacja wysłana — Dziękujemy. Twoja aplikacja została przekazana firmie.".

**Ekran 3 — formularz nowej oferty:**

> Zaprojektuj formularz „Nowa oferta" dla firmy transportowej (desktop). Pola: Tytuł, Opis,
> Powrót do domu, Lata doświadczenia, Typ transportu, Wymagane prawo jazdy. Sekcja „Trasy" z powtarzalnymi
> wierszami „Z kraju → Do kraju" i przyciskiem „Dodaj trasę" — zaproponuj czytelny edytor tras z podglądem na mini-mapie.
> Sekcja „Wynagrodzenie (opcjonalnie)": Od, Do, Waluta. Na końcu wybór statusu (opublikowana / szkic) i przycisk zapisu.

**Ekran 4 — skrzynka aplikacji:**

> Zaprojektuj „Skrzynkę aplikacji" dla firmy (desktop): lista aplikacji kierowców z nazwą oferty,
> e-mailem, telefonem, datą, opcjonalną wiadomością i przyciskiem „Pobierz CV". Dodaj miejsce na przyszły
> status aplikacji (nowa / w kontakcie / odrzucona). Pokaż stan pusty: „Brak aplikacji.".

**Design system:**

> Zaprojektuj stronę design systemu dla „Bazy": paleta, typografia Roboto, przyciski (główny z poświatą,
> obrysowany, tekstowy), pola formularza (filled, promień 14 px), 7 wariantów pigułek (trasa, prawo jazdy,
> powrót do domu, typ transportu, doświadczenie, wynagrodzenie, lokalizacja), karta oferty,
> awatar firmy z placeholderem, stany puste/ładowania/błędu, elementy mapy (pin, łuk trasy ze strzałką, etykieta kraju).

---

## 10. Dane do makiet (używaj ich zamiast „Lorem ipsum")

**Powrót do domu:** Codziennie · Co tydzień · Co dwa tygodnie · Co miesiąc · Elastycznie

**Prawo jazdy:** B · C · CE · C+E

**Typy transportu:** Plandeka / firanka · Chłodnia / izoterma · Cysterna · Wywrotka · Kontener · Platforma ·
Niskopodwozie · Autowóz (przewóz aut) · Silos · HDS / dźwig · Bus / busy · Dostawcze · Inne

**Kraje (39, kody ISO):** Polska (PL), Niemcy (DE), Czechy (CZ), Słowacja (SK), Austria (AT), Węgry (HU),
Litwa (LT), Łotwa (LV), Estonia (EE), Holandia (NL), Belgia (BE), Luksemburg (LU), Francja (FR), Włochy (IT),
Hiszpania (ES), Portugalia (PT), Irlandia (IE), Dania (DK), Szwecja (SE), Finlandia (FI), Rumunia (RO),
Bułgaria (BG), Chorwacja (HR), Słowenia (SI), Grecja (GR), Cypr (CY), Malta (MT), Ukraina (UA), Białoruś (BY),
Rosja (RU), Turcja (TR), Wielka Brytania (GB), Szwajcaria (CH), Norwegia (NO), Serbia (RS),
Bośnia i Hercegowina (BA), Macedonia Północna (MK), Mołdawia (MD), Albania (AL)

**Przykładowe oferty:**

| Tytuł | Firma / baza | Trasy | Powrót | Prawo jazdy | Transport | Doświadczenie | Wynagrodzenie |
|---|---|---|---|---|---|---|---|
| Kierowca C+E — trasy PL–IT | Transgór Logistics, Poznań | PL→IT, IT→PL | Co dwa tygodnie | C+E | Plandeka / firanka | min. 2 lata | 8 000–10 000 PLN |
| Kierowca chłodnia — Skandynawia | NordFracht, Gdańsk | PL→SE, PL→NO | Co miesiąc | C+E | Chłodnia / izoterma | min. 3 lata | 9 500–12 000 PLN |
| Kierowca C — dystrybucja krajowa | Wisła Trans, Kraków | PL→PL | Codziennie | C | Dostawcze | min. 1 rok | 6 500–7 500 PLN |
| Kierowca cysterna ADR — DE/BE/NL | Chemtrans Polska, Wrocław | PL→DE, PL→NL, PL→BE | Co tydzień | C+E | Cysterna | min. 5 lat | — |

**Przykładowe aplikacje (skrzynka):** `marek.k@example.com` · `+48 601 234 567` · „Mam 6 lat na trasach DE/NL, ADR ważny do 2027." · CV `marek-kowalski-cv.pdf`

**Teksty stanów (kopiuj 1:1):**
- „Ładowanie ofert…", „Ładowanie oferty…", „Ładowanie…"
- „Brak ofert dla wybranych filtrów. Spróbuj poluzować kraj lub kadencję."
- „Brak opublikowanych ofert.", „Brak aplikacji."
- „Spróbuj ponownie", „Wyczyść filtry", „Użyj mojej lokalizacji"
- „Aplikuj teraz", „Wyślij aplikację", „Wysyłanie…"
- „Aplikacja wysłana" / „Dziękujemy. Twoja aplikacja została przekazana firmie."
- „Nie znaleziono oferty" / „Oferta nie istnieje albo została wycofana."
- „Wyrażam zgodę na przetwarzanie danych osobowych w celu rekrutacji"

## 11. Decyzje do podjęcia przed projektowaniem + uwagi krytyczne

**D1. Redesign czy kontynuacja?** Aplikacja ma już zaimplementowany motyw (ciemny granat + glass).
Jeśli Claude Design wygeneruje coś odległego od Angular Material, przepisanie frontu kosztuje realne godziny.
*Rekomendacja:* projektuj **w obrębie istniejących tokenów** i zmień radykalnie tylko dwa ekrany,
na których to się opłaca — listę ofert i szczegóły oferty. Reszta (formularze firmy) może zostać jak jest.

**D2. Ciemny motyw dla kierowców — ryzyko.** „Premium glass" (przezroczystość + `blur(28px)` + poświaty) wygląda dobrze
na screenshotach, ale twój główny użytkownik czyta to na średniej klasy Androidzie, często w słońcu.
`backdrop-filter` potrafi mocno spowolnić przewijanie listy na takich telefonach, a granat z błękitną poświatą
ma słaby kontrast w pełnym świetle. *Rekomendacja:* zostaw ciemny motyw jako markę na ekranach marketingowych
i mapie, ale listę ofert zbuduj na **pełnych, nieprzezroczystych powierzchniach** bez blura —
albo zaprojektuj jasny wariant jako domyślny dla części publicznej. To nie jest kwestia gustu, tylko czytelności i FPS.

**D3. Brakuje mapy na liście ofert.** PRD i roadmapa mówią „lista + mapa", a `/` jest dziś listą bez mapy.
To jest właśnie wyróżnik produktu, więc wypadałoby go pokazać od razu na wejściu. Zaprojektuj układ dzielony (desktop)
i przełącznik lista/mapa (mobile).

**D4. Filtr „Kraje trasy" nie rozróżnia kierunku.** Oferty trzymają trasy jako **kierunek** (z kraju → do kraju),
a filtr pyta tylko o zbiór krajów. Kierowca myśli kierunkowo („jeżdżę na Włochy"). *Rekomendacja:* zaprojektuj filtr
jako parę „Skąd / Dokąd" z opcją „dowolny", albo dodaj przełącznik „tylko w tym kierunku".

**D5. Za dużo pigułek na karcie.** Pięć–sześć równorzędnych tagów w sześciu kolorach zabija hierarchię —
wszystko krzyczy, więc nic nie krzyczy. *Rekomendacja:* dwie klasy informacji: **wyróżnik** (trasa + powrót do domu,
mocny kolor) i **reszta** (prawo jazdy, transport, doświadczenie — neutralny szary), plus wynagrodzenie jako tekst, nie tag.

**D6. Rejestracja ma 7 pól, w tym NIP.** PRD już zauważa ryzyko porzuceń. Rozważ dwa kroki:
konto (e-mail + hasło) → dane firmy. Firma i tak musi wrócić po współrzędne bazy, żeby opublikować ofertę.

**D7. Współrzędne bazy wpisywane ręcznie (lat/lng).** Właściciel firmy transportowej nie wie, co to długość geograficzna.
Bez tego oferta nie pojawi się na mapie — czyli najważniejsza funkcja produktu wymaga najbardziej nieprzyjaznego pola
w całej aplikacji. Zaprojektuj wybór punktu przez kliknięcie na mapce (nawet jeśli implementacja przyjdzie później).

**Poza zakresem MVP — nie projektuj:** płatności i ogłoszeń płatnych, kont i profili kierowców,
czatu firma↔kierowca, wielojęzyczności, grupowania pinów na mapie (klastrów), statusów aplikacji w skrzynce.
