---
typ: runbook
projekt: Baza
ostatnio-sprawdzony: 2026-09-18
tags: [runbook, obszar/deploy]
---

# Deploy na produkcję

## Kiedy używać

Każdy merge do `main`. Deploy jest automatyczny, ale ten runbook opisuje, co powinieneś sprawdzić i co zrobić, gdy pójdzie źle.

> [!warning] Stan na dziś
> Deploy **nie czeka na CI** ([[T-07 Deploy nie czeka na CI|T-07]]) i **nie odpala migracji** ([[T-08 Migracje poza pipeline'em|T-08]]). Dopóki te zadania nie są zrobione, kroki 1 i 3 musisz wykonać ręcznie.

## Przed merge

- [ ] `npm run lint && npm run test && npm run build` lokalnie — zielone
- [ ] Sprawdź, czy PR dotyka `supabase/migrations/` → jeśli tak, patrz **Migracje** niżej
- [ ] Sprawdź, czy PR dodaje nową zmienną środowiskową → ustaw ją na Railway / w Actions **przed** merge
- [ ] Zmiana niekompatybilna ze schematem? → rozbij na dwa deploye

## Migracje (ręcznie, do czasu T-08)

Kolejność: **schemat przed kodem**, ale tylko dla zmian wstecznie kompatybilnych.

```sh
supabase link --project-ref <ref>
supabase db push
```

| Typ zmiany | Jak |
| ---------- | --- |
| Dodanie kolumny / tabeli / indeksu | migracja → deploy kodu |
| Usunięcie / zmiana nazwy kolumny | deploy #1: kod przestaje używać → migracja → deploy #2 |
| Nowy constraint na istniejących danych | kwarantanna niepasujących wierszy, **nigdy `delete`** ([[T-19 Migracje kasujące dane\|T-19]]) |

## Merge i obserwacja

Push do `main` odpala dwa workflow równolegle:

- **CI** — lint, test, build
- **Deploy** — filtr ścieżek → Railway (API) i/lub Cloudflare Pages (FE)

Obserwuj **oba**. Zielony deploy przy czerwonym CI oznacza, że właśnie wdrożyłeś zepsuty kod.

## Weryfikacja po deployu

```sh
# API żyje
curl -s https://<api-domena>/api/health

# publiczne dane wracają
curl -s "https://<api-domena>/api/offers" | head -c 300

# deep link działa (zwróć uwagę na 200, nie 404)
curl -I https://<fe-domena>/offers/<uuid-istniejącej-oferty>
```

Ręcznie, w incognito:
- [ ] Strona główna się ładuje
- [ ] Lista ofert pokazuje oferty, mapa się renderuje
- [ ] Filtr po kraju zmienia wyniki i zmienia URL
- [ ] Szczegóły oferty otwierają się z mapy trasy
- [ ] Logowanie firmy działa, skrzynka aplikacji się ładuje

- [ ] Sentry — brak nowej fali błędów w ciągu 15 min

## Rollback

> [!important] Najszybsza ścieżka to Railway, nie git

**API:** w panelu Railway wybierz poprzedni udany deployment → *Redeploy*. Nie czeka na build, wraca w sekundy.

**Frontend:** w panelu Cloudflare Pages wybierz poprzedni deployment → *Rollback*.

**Baza:** migracje nie mają automatycznego rollbacku. Cofnięcie wymaga napisania migracji odwracającej. Dlatego zmiany niekompatybilne idą w dwóch deployach — żeby rollback kodu nie wymagał rollbacku schematu.

Dopiero po przywróceniu działania: `git revert` i normalna ścieżka przez PR.

## Gdy nie działa

| Objaw | Gdzie szukać |
| ----- | ------------ |
| API nie wstaje | logi Railway — najpewniej brakująca zmienna (`assertRequiredSupabaseEnv` rzuca z nazwą) |
| 503 „Supabase config missing" | `SUPABASE_*` nieustawione lub puste |
| 503 „Private R2 is not configured" | `R2_PRIVATE_BUCKET` brakuje lub równy `R2_BUCKET` |
| Wszyscy dostają 429 | wspólny kubełek rate limitu — [[T-01 Trust proxy dla rate limitingu\|T-01]] |
| CORS blokuje FE | `CORS_ORIGIN` nie zawiera domeny Pages |
| Deep link daje 404 | brak `_redirects` — [[T-12 Deep linki na Cloudflare Pages\|T-12]] |
| Logo firm się nie ładują | `R2_PUBLIC_URL` wskazuje na host S3 API zamiast r2.dev/domeny |

## Powiązane

- [[CI-CD i deploy]] · [[Stack i infrastruktura]] · [[Incydent - API nie odpowiada]]
