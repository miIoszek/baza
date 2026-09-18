---
typ: obszar
projekt: Baza
aktualizacja: 2026-09-18
tags: [obszar, obszar/bezpieczeństwo]
---

# Bezpieczeństwo

## Otwarte zadania

```dataview
TABLE WITHOUT ID link(file.link, id) AS "ID", priorytet AS "Prio", status AS "Status"
FROM "01 Zadania"
WHERE contains(obszar, "bezpieczeństwo") AND status != "zrobione"
SORT priorytet ASC, id ASC
```

- [ ] [[T-01 Trust proxy dla rate limitingu]] — 🔴 rate limiting globalny
- [ ] [[T-02 Podatny multer na publicznych uploadach]] — 🔴 4× HIGH anonimowo
- [ ] [[T-03 Weryfikacja adresu e-mail przy rejestracji]] — 🔴 brak weryfikacji
- [ ] [[T-04 Unikalność i weryfikacja NIP]] — 🔴 podszywanie się pod firmy
- [ ] [[T-09 Nieograniczona tablica routes]] — 🟠
- [ ] [[T-11 CORS fail-open]] — 🟠
- [ ] [[T-13 Enumeracja kont przy rejestracji]] — 🟡
- [ ] [[T-18 Brak security headers]] — 🟡
- [ ] [[T-21 Interceptor dokleja token po dopasowaniu podłańcucha]] — 🟡

## Co jest już dobrze zrobione

Warto o tym pamiętać, żeby przypadkiem nie zepsuć przy refaktorze:

- **Jedna ścieżka do danych** — PostgREST odcięty, wszystko przez Nest. [[Model danych i RLS]]
- **RLS włączone bez polityk** jako deny-by-default, gdyby ktoś przywrócił grant
- **Magic bytes przy uploadzie** — `%PDF-` dla CV, `sharp().metadata()` dla obrazów. Deklarowany MIME nie wystarcza i tu tego nie ufa
- **CV nigdy publicznie** — osobny bucket, streaming przez Nest, sprawdzenie właściciela **i** prefiksu klucza
- **Własność zasobu w zapytaniu**, nie po pobraniu — `.eq('id', x).eq('company_id', y)`
- **Fail-closed przy braku konfiguracji** — `assertRequiredSupabaseEnv` blokuje start API
- **Brak sinków XSS** — zero `innerHTML` / `bypassSecurityTrust`; popupy Leafleta escapują (`offer-route-map.ts`)
- **Brak sekretów w repo i w historii**

## Zasady do trzymania

1. Nowa tabela → `revoke all from anon, authenticated` w tej samej migracji
2. Nowy upload → weryfikuj zawartość pliku, nie nagłówek `Content-Type`
3. Nowy endpoint publiczny → świadomie ustaw `@Throttle`, nie licz na domyślny
4. Konfiguracja bezpieczeństwa → fail-closed, jak `assertRequiredSupabaseEnv`
5. Dane osobowe → zobacz [[RODO i dane osobowe]]

## Powiązane

- [[2026-09-17 Review techniczne pod produkcję]] · [[Model danych i RLS]]
