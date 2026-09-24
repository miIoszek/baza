# Operacje

Nigdy nie wypisuj wartości sekretów (`railway variables --kv` drukuje surowe wartości - filtruj nazwy).

## Railway (projekt `baza`, środowisko `production`)

Serwisy: `baza-api` (Railpack, `npm run start`), `Postgres` (`postgres-ssl:18`, wolumen). Region obu:
`europe-west4-drams3a`. Baza **nie ma** publicznego proxy TCP.

```bash
cd /c/code/baza && railway link -p baza            # raz na katalog
railway status ; railway logs -s baza-api ; railway logs -s Postgres
railway variables -s baza-api --kv | sed -E 's/=.*/=<value>/'        # tylko nazwy
railway variable set NAZWA=wartość --skip-deploys -s baza-api          # kilka naraz, potem jeden redeploy
echo -n "$SEKRET" | railway variable set NAZWA --stdin --skip-deploys -s baza-api
railway scale -s baza-api eu-west=1 us-east=0                        # zmiana regionu (baza pusta!)
```

Sprzężenie z bazą: `DATABASE_URL=${{Postgres.DATABASE_URL}}` (host `postgres.railway.internal`).

### Dostęp do bazy z lokalnej maszyny (tymczasowo)

1. Utwórz proxy: narzędzie MCP `mcp__railway__create-tcp-proxy` (serviceId Postgresa, port 5432) albo
   dashboard. Sprawdź host/port: `mcp__railway__list-tcp-proxies`.
2. Połącz z `DATABASE_SSL=require` (certyfikat samopodpisany).
3. **Usuń proxy po skończonej pracy** (`mcp__railway__delete-tcp-proxy`). Nie zostawiaj bazy publicznej.

Testy integracyjne używają osobnej bazy `baza_test` (nie `railway`); każdy plik testowy tworzy własny
schemat `t_<hex>` i go kasuje. Nigdy nie kieruj `TEST_DATABASE_URL` na bazę z prawdziwymi danymi.

## Klucze JWT (rotacja bez wylogowywania)

`AUTH_JWT_SIGNING_KEYS` = base64(JSON `[{kid, status, privateKeyPemBase64}]`), dokładnie jeden `active`.

1. Wygeneruj parę P-256 (`generateKeyPairSync('ec', {namedCurve:'prime256v1'})`, eksport PKCS#8 PEM).
2. Nowy klucz jako `active`, dotychczasowy przestaw na `retiring` (oba w tablicy) -> zapisz zmienną -> deploy.
   Tokeny podpisane starym kluczem nadal się weryfikują, nowe podpisuje nowy.
3. Po co najmniej `ACCESS_TOKEN_TTL_SECONDS` (5 min) usuń klucz `retiring`.
Rotacja przy podejrzeniu wycieku: usuń stary klucz od razu (wszyscy dostaną 401 i odświeżą sesję cookie).
Kid nazywaj datą (np. `baza-2026-09-18`). Klucz nie może trafić do repo ani do logów.

## Role, blokady, wyłączanie kont (SQL; brak CLI)

```sql
-- nadanie roli (użytkownik musi zalogować się ponownie; role są czytane z DB przy każdym żądaniu)
UPDATE user_account SET roles = array_append(roles, 'admin') WHERE email = 'ktos@example.com';

-- odblokowanie po blokadzie logowania
UPDATE user_account SET failed_login_count = 0, locked_until = NULL WHERE email = '…';

-- wyłączenie konta = w kodzie UserAccountService.disable(userId, 'account-disabled')
-- (ustawia status, can_login=false, podbija session_epoch, unieważnia refresh; cache guarda czyści od razu
--  na tej replice). Ręczny SQL musi zrobić to samo w JEDNEJ transakcji:
BEGIN;
UPDATE user_account SET status='banned', can_login=false, session_epoch=session_epoch+1 WHERE id='…';
UPDATE refresh_token SET revoked_at=now(), revoked_reason='account-disabled' WHERE user_id='…' AND revoked_at IS NULL;
COMMIT;
```
`@Roles('admin')` istnieje (`RolesGuard`), ale żaden endpoint go jeszcze nie używa.

## Sygnały do alertów (logi Railway)

- `auth.security.refresh_reuse_detected` (ERROR) - podejrzenie kradzieży tokenu; rzadkie z założenia.
- `auth.security.lockout` - blokada konta po 10 błędach.
- `auth.login.failed reason=...` - skoki = credential stuffing.
- `Mail delivery failed` - poczta nie działa (rejestracje bez maila).

## Backupy i odtwarzanie - STAN

Wolumen Postgresa na Railway istnieje. **Automatyczne kopie zapasowe NIE są jeszcze skonfigurowane
ani zweryfikowane** (patrz `migration-log.md`, otwarte sprawy). Do zrobienia: włączyć Railway Backups
dla wolumenu i/lub cron `pg_dump` do prywatnego bucketu R2 (wzór: `mamymapy/scripts/pg-dump-to-r2.sh`),
oraz **przetestować odtworzenie** na `baza_test`. Kopia, której nie odtworzono, nie jest kopią.

## Cutover (Supabase -> własny auth) - procedura

Stan i otwarte punkty: `migration-log.md`. Kolejność: (1) CI zielone na gałęzi, (2) ustaw w Railway
`AUTH_WEB_BASE_URL`, `CORS_ORIGIN`, `PROXY_SHARED_SECRET`, (3) ustaw w projekcie Pages `API_ORIGIN`,
`PROXY_SHARED_SECRET`, (4) merge -> deploy API (migracje wykonają się przy starcie) i FE, (5) smoke:
`/api/health`, rejestracja, login, odświeżenie strony, logout, reset hasła, (6) dopiero po potwierdzeniu
użytkownika: wyłączenie projektu Supabase i usunięcie sekretów `SUPABASE_*` z GitHub/Railway.
Baza na Railway jest pusta (w Supabase były tylko dane testowe), więc nie ma importu danych.
