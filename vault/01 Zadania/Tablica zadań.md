---
typ: dashboard
projekt: Baza
aktualizacja: 2026-09-18
tags: [dashboard]
---

# Tablica zadań

> [!info] Jak to działa
> Każde zadanie to osobna notatka z polami `status` i `priorytet` we frontmatterze.
> Statusy: `todo` → `w-toku` → `zrobione` (albo `odrzucone`).
> Zapytania Dataview poniżej wymagają wtyczki **Dataview** — zobacz [[00 Start tutaj#Wtyczki]]. Pod nimi jest statyczna lista, która działa zawsze.

## Kolejność działań

### 🔴 Przed wpuszczeniem ruchu

Poza [[T-03 Weryfikacja adresu e-mail przy rejestracji|T-03]] to dosłownie kilkanaście linijek kodu.

```dataview
TABLE WITHOUT ID
  link(file.link, id + " " + file.name) AS "Zadanie",
  status AS "Status",
  szacunek AS "Czas"
FROM "01 Zadania"
WHERE priorytet = "P0" AND status != "zrobione" AND status != "odrzucone"
SORT id ASC
```

### 🟠 W pierwszym tygodniu

```dataview
TABLE WITHOUT ID
  link(file.link, id + " " + file.name) AS "Zadanie",
  status AS "Status",
  szacunek AS "Czas"
FROM "01 Zadania"
WHERE priorytet = "P1" AND status != "zrobione" AND status != "odrzucone"
SORT id ASC
```

### 🟡 Przed skalowaniem

```dataview
TABLE WITHOUT ID
  link(file.link, id + " " + file.name) AS "Zadanie",
  status AS "Status",
  szacunek AS "Czas"
FROM "01 Zadania"
WHERE priorytet = "P2" AND status != "zrobione" AND status != "odrzucone"
SORT id ASC
```

## W toku

```dataview
LIST
FROM "01 Zadania"
WHERE status = "w-toku"
SORT priorytet ASC
```

## Zrobione

```dataview
TABLE WITHOUT ID link(file.link, id) AS "ID", zamknięto AS "Data"
FROM "01 Zadania"
WHERE status = "zrobione"
SORT zamknięto DESC
```

---

## Lista statyczna (działa bez wtyczek)

### 🔴 P0 — blokery launchu

- [ ] [[T-01 Trust proxy dla rate limitingu]] — 15min — rate limiting jest globalny, nie per-IP
- [ ] [[T-02 Podatny multer na publicznych uploadach]] — 30min — 4× HIGH osiągalne anonimowo
- [ ] [[T-03 Weryfikacja adresu e-mail przy rejestracji]] — 3h — brak weryfikacji maila
- [ ] [[T-04 Unikalność i weryfikacja NIP]] — 2h — brak UNIQUE i sumy kontrolnej
- [ ] [[T-05 Healthcheck na Railway]] — 10min — zepsuty deploy wchodzi na żywo

### 🟠 P1 — pierwszy tydzień

- [ ] [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci]] — 1d — filtry zaczną kłamać
- [ ] [[T-07 Deploy nie czeka na CI]] — 45min — czerwone testy i tak deployują
- [ ] [[T-08 Migracje poza pipeline'em]] — 2h — schema ręcznie, kod automatycznie
- [ ] [[T-09 Nieograniczona tablica routes]] — 20min — brak `@ArrayMaxSize`
- [ ] [[T-10 Paginacja kasowania prefiksów R2]] — 1h — osierocone CV przy >1000 plików
- [ ] [[T-11 CORS fail-open]] — 30min — brak zmiennej = dowolny origin
- [ ] [[T-12 Deep linki na Cloudflare Pages]] — 30min — **do zweryfikowania**, może być 404

### 🟡 P2 — przed skalowaniem

- [ ] [[T-13 Enumeracja kont przy rejestracji]] — 30min
- [ ] [[T-14 Brak ochrony przed duplikatami aplikacji]] — 1h
- [ ] [[T-15 Brak powiadomień o nowej aplikacji]] — 4h — **produktowo istotne**
- [ ] [[T-16 Retencja danych aplikacji i CV]] — 1d — obowiązek RODO
- [ ] [[T-17 GeoJSON z zewnętrznego CDN]] — 1h
- [ ] [[T-18 Brak security headers]] — 1h
- [ ] [[T-19 Migracje kasujące dane]] — 30min — sprawdź, czy nic nie zginęło
- [ ] [[T-20 npm run test nie działa na świeżym klonie]] — 15min
- [ ] [[T-21 Interceptor dokleja token po dopasowaniu podłańcucha]] — 20min
- [ ] [[T-22 Cache-Control na publicznych GET]] — 45min
- [ ] [[T-23 Niepełny strict w tsconfig API]] — 2h
- [ ] [[T-24 E2E nie działa w CI]] — 3h
- [ ] [[T-25 Martwy kod w kontrolerach]] — 10min

---

## Wątki, które ciągną się przez wiele zadań

Te zadania nie są niezależne — warto je robić razem.

| Wątek | Zadania | Dlaczego razem |
| ----- | ------- | -------------- |
| **Zaufanie do firm** | [[T-03 Weryfikacja adresu e-mail przy rejestracji\|T-03]], [[T-04 Unikalność i weryfikacja NIP\|T-04]], [[T-13 Enumeracja kont przy rejestracji\|T-13]] | Jedna zmiana w ścieżce rejestracji zamiast trzech |
| **Dane osobowe kierowców** | [[T-10 Paginacja kasowania prefiksów R2\|T-10]], [[T-14 Brak ochrony przed duplikatami aplikacji\|T-14]], [[T-16 Retencja danych aplikacji i CV\|T-16]] | Wszystkie dotyczą cyklu życia CV w R2 |
| **Pipeline** | [[T-05 Healthcheck na Railway\|T-05]], [[T-07 Deploy nie czeka na CI\|T-07]], [[T-08 Migracje poza pipeline'em\|T-08]], [[T-24 E2E nie działa w CI\|T-24]] | Jeden przebudowany workflow |
| **Skalowanie odczytu** | [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci\|T-06]], [[T-22 Cache-Control na publicznych GET\|T-22]], [[T-01 Trust proxy dla rate limitingu\|T-01]] | Ten sam ruch, trzy warstwy |
| **Statyczne zasoby FE** | [[T-12 Deep linki na Cloudflare Pages\|T-12]], [[T-17 GeoJSON z zewnętrznego CDN\|T-17]], [[T-18 Brak security headers\|T-18]] | Ten sam katalog `public/` |

## Powiązane

- Źródło zadań: [[2026-09-17 Review techniczne pod produkcję]]
- [[Baza]] · [[00 Start tutaj]]
