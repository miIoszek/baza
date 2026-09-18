---
typ: runbook
projekt: Baza
ostatnio-sprawdzony: 2026-09-18
tags: [runbook, obszar/infrastruktura]
---

# Incydent: API nie odpowiada

## Kiedy używać

Frontend się ładuje, ale dane nie przychodzą. Albo Sentry sypie błędami. Albo ktoś napisał, że „nie działa".

## Triage — 2 minuty

```sh
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://<api-domena>/api/health
```

| Odpowiedź | Znaczenie | Idź do |
| --------- | --------- | ------ |
| `200` szybko | API żyje — problem jest gdzie indziej | **A** |
| `429` | rate limit | **B** |
| `503` | brak konfiguracji | **C** |
| `500` | wyjątek w aplikacji | **D** |
| timeout / brak odpowiedzi | proces leży | **E** |

---

### A. API żyje, ale dane nie wracają

Sprawdź konkretny endpoint, nie tylko health:

```sh
curl -s "https://<api-domena>/api/offers" | head -c 300
```

- Pusta tablica zamiast ofert → sprawdź, czy Supabase odpowiada (panel Supabase → Database → Health)
- Błąd CORS w konsoli przeglądarki → `CORS_ORIGIN` nie zawiera domeny FE
- 401 na wszystkim → sesja Supabase wygasła po stronie klienta; wyloguj i zaloguj ponownie

### B. 429 — rate limit

**To jest dziś najbardziej prawdopodobna przyczyna „strona nie działa" przy wzroście ruchu.** Limit 120 req/min jest wspólny dla całego serwisu, bo `req.ip` zwraca IP proxy Railway.

Doraźnie: podnieś limit w `app.module.ts` i wdróż.
Docelowo: [[T-01 Trust proxy dla rate limitingu]] — to jest właściwa naprawa, zajmuje 15 minut.

### C. 503 — brak konfiguracji

Komunikat wprost podaje, czego brakuje:

- „Supabase config missing" → `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- „Private R2 is not configured" → `R2_PRIVATE_BUCKET` brakuje albo równa się `R2_BUCKET`
- „R2 is not configured" → `R2_PUBLIC_URL` puste lub wskazuje na `*.r2.cloudflarestorage.com`

Sprawdź zmienne na Railway. Najczęstsza przyczyna: ktoś dodał zmienną w złym środowisku albo z literówką.

### D. 500 — wyjątek

Sentry ma pełny ślad (`AllExceptionsFilter` raportuje wszystko ≥500).

Jeśli błąd dotyczy jednej oferty, a nie wszystkich, sprawdź `license_category` — `resolveLicenseCategory` celowo rzuca przy nieznanej wartości zamiast po cichu podstawiać domyślną (`job-offer.service.ts:529-541`). Wiersz z wartością spoza `('B','C','CE','C_E')` wywali każdy endpoint, który go zwraca.

### E. Proces leży

1. Railway → logi serwisu. `assertRequiredSupabaseEnv` rzuca z czytelnym komunikatem przy starcie
2. Sprawdź, czy nie wpadł w pętlę restartów (`restartPolicyMaxRetries = 10` — po dziesięciu próbach przestaje)
3. Jeśli to skutek świeżego deployu → **rollback**, patrz [[Deploy na produkcję]]

## Po incydencie

- [ ] Zapisz w notatce dziennej, co się stało i jak długo trwało
- [ ] Jeśli przyczyna to znane zadanie — podbij mu priorytet
- [ ] Jeśli przyczyna była nowa — załóż zadanie z [[Szablon - zadanie]]
- [ ] Jeśli triage czegoś nie pokrył — dopisz tutaj

## Powiązane

- [[Deploy na produkcję]] · [[CI-CD i deploy]] · [[Wydajność i skalowanie]]
