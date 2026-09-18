---
typ: przegląd
data: 2026-09-17
zakres: całe repo — API, frontend, migracje, CI/CD, zależności
projekt: Baza
commit: e2e0a90
tags: [przegląd, obszar/bezpieczeństwo]
---

# Review techniczne pod produkcję

> [!abstract] Wnioski w jednym zdaniu
> Fundamenty są zrobione lepiej niż w typowym MVP — model RLS, walidacja i obsługa plików są solidne. Ale rate limiting jest globalny zamiast per-IP, na publicznych uploadach siedzi podatny multer, a rejestracja nie weryfikuje ani maila, ani NIP-u. Te trzy rzeczy trzeba zamknąć przed ruchem.

## Metodologia

Co zostało zrobione:
- przegląd całego kodu API, frontendu, wszystkich 11 migracji, obu workflow CI/CD
- `npm ci` → `npm run lint` → `npm run test` na czystym klonie
- `npm audit` z rozbiciem na zależności produkcyjne i deweloperskie
- weryfikacja zachowania bibliotek w `node_modules` (throttler, multer) zamiast polegania na `package.json`
- skan repo i historii gita pod kątem sekretów

> [!warning] Czego NIE zweryfikowano
> Proxy środowiska review blokowało ruch wychodzący na Railway i Cloudflare (`CONNECT tunnel failed, 403`). **Wszystkie ustalenia pochodzą z kodu, nie z żywej produkcji.** Dotyczy to zwłaszcza [[T-12 Deep linki na Cloudflare Pages|T-12]] (deep linki) i [[T-11 CORS fail-open|T-11]] (czy `CORS_ORIGIN` jest realnie ustawione).

## Stan weryfikacji

| Sprawdzenie | Wynik |
| ----------- | ----- |
| `npm run lint` | ✅ zielone (baza-api, baza-frontend) |
| `npm run test` | ✅ zielone — **po** ręcznym `ensure-fe-env` ([[T-20 npm run test nie działa na świeżym klonie\|T-20]]) |
| Pliki testowe | 39 speców |
| Sekrety w repo | ✅ czysto, także w historii (`git log --all -p`) |
| `npm audit` (prod) | ❌ multer 2.2.0 — 4× HIGH ([[T-02 Podatny multer na publicznych uploadach\|T-02]]) |
| `npm audit` (dev) | ⚠️ 21 podatności, nie trafiają na produkcję |

---

## 🔴 Blokery

### 1. Rate limiting jest globalny, nie per-IP → [[T-01 Trust proxy dla rate limitingu]]

`@nestjs/throttler` kluczuje po `req.ip`. Express bez `trust proxy` zwraca IP gniazda TCP — czyli IP edge proxy Railway, **identyczne dla każdego odwiedzającego**. Limit 120 req/min obowiązuje globalnie dla całego serwisu; rejestracja i aplikowanie dzielą jeden kubełek 10/min.

Pogarsza to refetch `/api/offers` przy każdej zmianie filtra i strzał w `/api/health` przy każdym wejściu na stronę główną. Tryb awarii jest perwersyjny: **im lepiej pójdzie launch, tym szybciej serwis padnie**.

### 2. Podatny multer na publicznych uploadach → [[T-02 Podatny multer na publicznych uploadach]]

`package.json` deklaruje multer 2.3.0, ale `@nestjs/platform-express@11.2.3` pinuje własną zagnieżdżoną kopię **2.2.0** — i to ona obsługuje `FileInterceptor`. Cztery advisory HIGH, w tym obejście limitu rozmiaru pliku, osiągalne anonimowo na `/api/auth/register` i `/api/offers/:id/applications`.

### 3. Brak weryfikacji e-mail i NIP → [[T-03 Weryfikacja adresu e-mail przy rejestracji]] + [[T-04 Unikalność i weryfikacja NIP]]

`email_confirm: true` przy `createUser` oznacza, że żaden mail nie wychodzi. `companies.nip` nie ma `UNIQUE` ani sumy kontrolnej.

Pełna ścieżka, której nic nie blokuje: jednorazówka → cudzy NIP i nazwa realnej firmy → współrzędne → atrakcyjna oferta → zbieranie CV kierowców (imię, telefon, e-mail, pełne CV).

**To jest najpoważniejsze ryzyko w obecnym designie** i nie jest to problem techniczny, tylko produktowy. Zbierasz dane osobowe w imieniu niezweryfikowanych podmiotów — pod RODO jesteś administratorem tych danych i przy pierwszej skardze nie masz czym się bronić.

---

## 🟠 Poważne

| # | Sprawa | Zadanie |
| - | ------ | ------- |
| 4 | Cichy limit 1000 wierszy + filtrowanie w pamięci Node — filtry zaczną po cichu zwracać złe wyniki | [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci\|T-06]] |
| 5 | `ci.yml` i `deploy.yml` lecą równolegle — czerwone testy nie blokują deployu | [[T-07 Deploy nie czeka na CI\|T-07]] |
| 6 | Brak `supabase db push` w pipeline — kod może wyprzedzić schemat | [[T-08 Migracje poza pipeline'em\|T-08]] |
| 7 | `/api/health` istnieje, ale `railway.toml` nie ma `healthcheckPath` | [[T-05 Healthcheck na Railway\|T-05]] |
| 8 | `ListObjectsV2` bez paginacji — osierocone CV przy >1000 aplikacji na ofertę | [[T-10 Paginacja kasowania prefiksów R2\|T-10]] |
| 9 | `routes` ma `@ArrayMinSize(1)` bez górnego limitu | [[T-09 Nieograniczona tablica routes\|T-09]] |

---

## 🟡 Warto poprawić

| # | Sprawa | Zadanie |
| - | ------ | ------- |
| 10 | Enumeracja kont — 409 zdradza, które maile istnieją | [[T-13 Enumeracja kont przy rejestracji\|T-13]] |
| 11 | Brak ochrony przed duplikatami aplikacji | [[T-14 Brak ochrony przed duplikatami aplikacji\|T-14]] |
| 11b | Brak powiadomienia mailowego do firmy o nowej aplikacji | [[T-15 Brak powiadomień o nowej aplikacji\|T-15]] |
| 12 | Zero retencji dla `job_applications` i CV | [[T-16 Retencja danych aplikacji i CV\|T-16]] |
| 13 | GeoJSON z `raw.githubusercontent.com` w ścieżce krytycznej mapy | [[T-17 GeoJSON z zewnętrznego CDN\|T-17]] |
| 14 | Brak `_redirects` — zweryfikuj deep linki | [[T-12 Deep linki na Cloudflare Pages\|T-12]] |
| 15 | CORS fail-open przy braku `CORS_ORIGIN` | [[T-11 CORS fail-open\|T-11]] |
| 16 | Brak security headers (helmet) | [[T-18 Brak security headers\|T-18]] |
| 17 | Migracje kasujące dane produkcyjne | [[T-19 Migracje kasujące dane\|T-19]] |
| 18 | `npm run test` nie działa na świeżym klonie | [[T-20 npm run test nie działa na świeżym klonie\|T-20]] |
| 19 | Interceptor dokleja token po `includes('/api/')` | [[T-21 Interceptor dokleja token po dopasowaniu podłańcucha\|T-21]] |
| 20 | Brak `Cache-Control` na publicznych GET | [[T-22 Cache-Control na publicznych GET\|T-22]] |
| 21 | API nie ma pełnego `strict` | [[T-23 Niepełny strict w tsconfig API\|T-23]] |
| 22 | E2E nie działa w CI | [[T-24 E2E nie działa w CI\|T-24]] |
| 23 | Martwy kod w kontrolerach | [[T-25 Martwy kod w kontrolerach\|T-25]] |

---

## ✅ Co jest zrobione dobrze

Nie chcę, żeby lista wyglądała jak wyrok — sporo rzeczy jest lepszych niż w typowym MVP.

**Model RLS jest naprawdę solidny.** Ścieżka migracji od publicznych polityk → `revoke all from anon, authenticated` → tylko `service_role` jest przemyślana, a komentarze w migracjach tłumaczą *dlaczego* (np. `20260911120000` wprost opisuje obchodzenie gate'a na współrzędne przez anon JWT). Frontend nie dotyka PostgREST. Szczegóły: [[Model danych i RLS]].

**Walidacja DTO jest dokładna.** Allowlisty zamiast free-textu, `whitelist: true` + `forbidNonWhitelisted`, walidacja telefonu na trzech poziomach (DTO → custom constraint → CHECK w bazie), lustrzane constrainty długości w Postgresie na wypadek obejścia `ValidationPipe`.

**Uploady sprawdzają magic bytes, nie deklarowany MIME.** `%PDF-` dla CV (`r2-storage.service.ts:264`), `sharp().metadata()` z limitem pikseli dla logo. To jest robione poprawnie, w przeciwieństwie do większości projektów tej wielkości.

**Separacja bucketów publiczny/prywatny z fail-closed guardem**, gdy ktoś ustawi ten sam bucket (`r2-storage.service.ts:92-97`). CV nigdy nie dostaje publicznego URL-a — jest streamowane przez Nest z kontrolą właściciela **i** weryfikacją prefiksu klucza (`job-application.service.ts:176-182`). Obrona w głąb.

**Logika kompensacji przy rejestracji** — sprzątanie osieroconego konta i plików R2 na każdej ścieżce błędu, z eskalacją do Sentry, gdy samo sprzątanie padnie.

**Zero sekretów w repo i w historii gita.** `.gitignore` kompletny, `.env.example` zawiera wyłącznie nazwy zmiennych z komentarzami ostrzegawczymi.

**39 plików testowych, lint i testy zielone.** Są nawet testy na rzeczy typu mismatch prefiksu CV i mapowanie błędów Multera.

**Sentry z `tracesSampleRate: 0`** — świadome unikanie spalenia darmowego tieru. Source mapy uploadowane i kasowane z dist.

---

## Kolejność działań

Pełna lista z checkboxami: [[Tablica zadań]].

1. **Przed wpuszczeniem ruchu:** [[T-01 Trust proxy dla rate limitingu|T-01]], [[T-02 Podatny multer na publicznych uploadach|T-02]], [[T-03 Weryfikacja adresu e-mail przy rejestracji|T-03]], [[T-04 Unikalność i weryfikacja NIP|T-04]], [[T-05 Healthcheck na Railway|T-05]]
2. **W pierwszym tygodniu:** [[T-07 Deploy nie czeka na CI|T-07]], [[T-06 Cichy limit 1000 wierszy i filtrowanie w pamięci|T-06]], [[T-09 Nieograniczona tablica routes|T-09]], [[T-12 Deep linki na Cloudflare Pages|T-12]]
3. **Przed skalowaniem:** [[T-08 Migracje poza pipeline'em|T-08]], [[T-10 Paginacja kasowania prefiksów R2|T-10]], [[T-16 Retencja danych aplikacji i CV|T-16]], [[T-15 Brak powiadomień o nowej aplikacji|T-15]]
