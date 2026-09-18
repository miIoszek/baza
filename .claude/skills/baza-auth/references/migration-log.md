# Dziennik migracji: Supabase -> własny auth + Postgres na Railway

Dopisuj wpisy na górze (data, co, dlaczego, stan). To jest pamięć projektu dla kolejnych agentów.

## Decyzje (2026-09-18, użytkownik: "nie chcę płacić w Supabase, wolę hostować u siebie")

| Decyzja | Uzasadnienie |
|---------|--------------|
| Własny auth w NestJS wzorowany na `meet`, bez Google/Apple | B2B, tylko firmy; OAuth da się dodać bez zmiany schematu |
| Postgres na Railway, region `europe-west4` | dane osobowe (email, telefon, CV) z UE, niższy ping z Polski; baza była pusta więc zmiana regionu była darmowa |
| TypeORM + migracje jako klasy SQL, uruchamiane przy starcie API pod advisory lock | spójne z `meet`/`mamymapy`; deploy = migracja |
| Dane Supabase to tylko dane testowe -> start od czystej bazy, bez importu | potwierdził użytkownik |
| Refresh token tylko w cookie HttpOnly Strict, access w pamięci | najwyższy standard; XSS nie odczyta długo żyjącego poświadczenia |
| Proxy `/api` przez Pages Function jako rozwiązanie tymczasowe, docelowo własna domena | brak domeny; `railway.app` jest na PSL |
| Weryfikacja maila wymagana (flaga do wyłączenia) | wymaga Resend; do czasu podpięcia flaga `AUTH_REQUIRE_EMAIL_VERIFICATION=false` |
| Zwykły Postgres (bez PostGIS) | migracje używały zwykłych `base_lat/base_lng` z CHECK-ami |

## Zrobione

- Railway: serwis `Postgres` (18) dodany, przeniesiony do `europe-west4`, `baza-api` też. Zmienne
  ustawione na `baza-api`: `DATABASE_URL` (referencja), `AUTH_JWT_SIGNING_KEYS`, `AUTH_TOKEN_ISSUER`,
  `AUTH_SECURE_COOKIES`. Baza `baza_test` utworzona do testów integracyjnych.
- Kod: warstwa danych, moduł identity, przepisane serwisy firm/ofert/aplikacji, frontend (sesja w
  pamięci + cookie), nowe strony auth, proxy Pages, e2e, CI (Postgres w usłudze), dokumentacja.
- Testy: API 105 (w tym testy współbieżności na prawdziwym Postgresie), frontend 87, e2e Firefox 6/6.
- Znaleziony i naprawiony błąd wyścigu logout/refresh (patrz `gotchas.md` #1).

## Otwarte sprawy (stan na 2026-09-18)

1. **Poczta (Resend)**: potrzebne konto/klucz API i zweryfikowana domena nadawcy. Do tego czasu na
   produkcji `AUTH_REQUIRE_EMAIL_VERIFICATION=false` albo nikt nie potwierdzi konta.
2. **Zmienne produkcyjne do ustawienia przed cutoverem**: Railway `AUTH_WEB_BASE_URL`, `PROXY_SHARED_SECRET`,
   sprawdzić `CORS_ORIGIN` (dokładny origin Pages); Pages `API_ORIGIN`, `PROXY_SHARED_SECRET`.
3. **Własna domena** (`api.<domena>`) - usuwa potrzebę proxy i ustawia throttling po prawdziwym IP.
4. **Backupy Postgresa** nie skonfigurowane ani niezweryfikowane (patrz `operations.md`).
5. **Zmienne `SUPABASE_*`** nadal są na `baza-api` w Railway i jako sekrety GitHub; usunąć dopiero po
   potwierdzonym cutoverze. **Wyłączenie projektu Supabase = decyzja użytkownika** (nieodwracalne).
6. **Tymczasowy dostęp**: sprawdź, że proxy TCP do Postgresa jest usunięte (`list-tcp-proxies`).
7. Sweeper wygasłych tokenów, CLI do ról/banów, `Referrer-Policy` na trasach z tokenem, Redis przy skalowaniu.
8. Migracja `railway.toml` do IaC (do 2026-12-01).
9. Konfiguracja Git: repo nie ma `user.name/email`; commity z tej migracji podpisano tożsamością
   podaną jednorazowo w poleceniu.
