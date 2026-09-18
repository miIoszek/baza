# Architektura auth

## Tabele (`libs/api/data-access`, migracje `1789700000001-IdentitySchema`, `...02-DomainSchema`)

| Tabela | Ważne kolumny / ograniczenia |
|--------|------------------------------|
| `user_account` | `email` (CHECK = lower, unikalny indeks), `password_hash` (`select:false`), `roles text[]`, `status` (`active/banned/deleted`), `can_login`, `session_epoch` (>=1), `failed_login_count`, `locked_until`, `email_verified_at`. CHECK: nie da się mieć `can_login=true` bez hasha. |
| `refresh_token` | `token_hash` (SHA-256, unikalny), `family_id`, `generation`, `session_epoch` (epoka wydania), `used_at`, `revoked_at`, `revoked_reason`, `grace_reissue_count`, `expires_at`. FK -> `user_account` ON DELETE CASCADE. |
| `auth_one_time_token` | `purpose` (`verify_email`/`reset_password`), `token_hash`, `expires_at`, `consumed_at`. |
| `companies` | `user_id` UNIQUE FK -> `user_account` (1:1 właściciel). Jedyna rola biznesowa: `company`. |
| `job_offers`, `job_applications` | FK kaskadowe z `companies`; wszystkie CHECK-i przeniesione z migracji Supabase. |

Kierowcy są anonimowi (bez konta). Nie ma RLS ani ról DB: **API jest jedynym klientem bazy**.

## Tokeny

| | Access | Refresh |
|---|--------|---------|
| Format | JWT ES256, `kid` z keyringu | opaque 32 B (base64url) |
| Ważność | 5 min | 30 dni sliding (każda rotacja odnawia) |
| Gdzie | pamięć SPA, nagłówek `Authorization` | cookie HttpOnly Strict (`__Host-baza_rt`) |
| W DB | nic | tylko SHA-256 |
| Claims | `sub, aud=baza-api, iss, typ=access, roles, epc, jti, iat, exp` | - |

Weryfikacja access tokenu jest lokalna (bez sieci, bez JWKS). Tylko ES256; `kid` wskazuje klucz;
`typ` musi być `access`. Keyring: `AUTH_JWT_SIGNING_KEYS` = base64(JSON `[{kid, status, privateKeyPemBase64}]`),
dokładnie jeden `active`, reszta `retiring`.

## Przepływy

**Rejestracja** `POST /api/auth/register` (multipart: firma + opcjonalne logo): polityka hasła -> jedna
transakcja (`registerLocal` z `ON CONFLICT DO NOTHING` + insert `companies`) -> logo do R2 po commit
(klucz zawiera `companyId`; przy błędzie kompensacja: kasowanie konta + prefiksu R2) -> mail
weryfikacyjny. Odpowiedź 202 `{ emailVerificationRequired }` identyczna dla zajętego adresu (wtedy mail
"masz już konto"). KDF liczony PRZED sprawdzeniem unikalności.

**Login** `POST /api/auth/login`: blokada konta -> KDF (dummy dla nieznanych) -> dopiero po poprawnym
haśle `EMAIL_NOT_VERIFIED` -> nowa rodzina refresh (z bieżącą epoką) + access. Cookie w `Set-Cookie`.

**Refresh** `POST /api/auth/refresh` (cookie + `Origin`): jedna transakcja z `SELECT ... FOR UPDATE`
na tokenie. Nieznany/wygasły -> 401. Odwołany -> unieważnij rodzinę. Już użyty: w oknie 10 s i max 3
razy wydaj rodzeństwo (grace), inaczej uznaj za kradzież i unieważnij rodzinę. Po rotacji `SessionService`
sprawdza status konta i **zgodność epoki** tokenu z kontem.

**Logout** `POST /api/auth/logout`: blokuje wiersz tokenu (`FOR UPDATE`), unieważnia całą rodzinę,
czyści cookie. Idempotentny.

**Reset hasła**: `forgot-password` (202 zawsze; mail tylko dla istniejącego konta) -> `reset-password`
(najpierw walidacja siły hasła, żeby słabe hasło nie spaliło linku; potem jednorazowe zużycie tokenu
`UPDATE ... RETURNING`, `setPassword`, mail "hasło zmienione"). Nie loguje: wszystkie sesje giną.

**Zmiana hasła** `POST /api/auth/change-password` (Bearer + `Origin`): wymaga obecnego hasła; kończy
wszystkie sesje i zwraca nową (`AuthSessionResponse`).

## Endpointy `/api/auth/*`

| Metoda | Ścieżka | Auth | Throttle/min | Odpowiedź |
|--------|---------|------|--------------|-----------|
| POST | `register` | public | 5 | 202 `{emailVerificationRequired}` |
| POST | `login` | public + Origin | 10 | 200 `{accessToken, expiresInSeconds}` + cookie |
| POST | `refresh` | cookie + Origin | 60 | j.w. |
| POST | `logout` | cookie + Origin | 30 | 204 |
| POST | `verify-email` | public | 20 | 204 |
| POST | `resend-verification` | public | 5 | 202 (zawsze) |
| POST | `forgot-password` | public | 5 | 202 (zawsze) |
| POST | `reset-password` | public | 10 | 204 |
| POST | `change-password` | Bearer + Origin | 5 | 200 nowa sesja |
| GET | `me` | Bearer | - | `AuthMeResponse` |

## Kody błędów (pole `code` w odpowiedzi, filtr `AllExceptionsFilter`)

`INVALID_CREDENTIALS` 401, `ACCOUNT_LOCKED` 429, `EMAIL_NOT_VERIFIED` 403, `INVALID_TOKEN` 400,
`WEAK_PASSWORD` 400, `SESSION_EXPIRED` 401, `FORBIDDEN_ORIGIN` 403. SPA przełącza się po `code`, nie po
`message`. Błąd bazy w guardzie = **503**, nie 401 (żeby SPA nie czyściło ważnej sesji).

## Zmienne środowiskowe (API)

| Zmienna | Znaczenie |
|---------|-----------|
| `DATABASE_URL` | wymagana; na Railway `${{Postgres.DATABASE_URL}}` (host prywatny) |
| `DATABASE_SSL` / `DATABASE_SSL_CA` / `DATABASE_POOL_MAX` / `DATABASE_RUN_MIGRATIONS` | opcjonalne |
| `AUTH_JWT_SIGNING_KEYS` | keyring ES256; **wymagany na produkcji** (dev: klucz ulotny) |
| `AUTH_TOKEN_ISSUER` | domyślnie `baza-api` |
| `AUTH_WEB_BASE_URL` | origin SPA do linków w mailach; **wymagany na produkcji** |
| `AUTH_ALLOWED_ORIGINS` | domyślnie `CORS_ORIGIN` |
| `AUTH_SECURE_COOKIES` | domyślnie `true` na produkcji |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` wyłącza wymóg (tylko gdy poczta niepodpięta) |
| `CORS_ORIGIN` | dokładna lista, wymagana na produkcji |
| `PROXY_SHARED_SECRET` | sekret wspólny z proxy Pages (prawdziwe IP klienta dla throttlera) |
| `MAIL_TRANSPORT` (`resend`/`log`), `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` | poczta |

## Frontend

`AuthService` (`core/auth.service.ts`): token w pamięci; `whenReady()` przywraca sesję przez
`/auth/refresh` (single-flight); timer odświeża ~60 s przed wygaśnięciem; `signOut` zawsze czyści stan
lokalny. `authInterceptor`: nie blokuje anonimów; przy 401 robi **jeden** refresh i ponawia żądanie.
Odświeżanie/logowanie idą przez `HttpBackend` (poza interceptorami, bez rekurencji).

## Proxy Pages

`/api/*` na `baza-app.pages.dev` -> `API_ORIGIN` (Railway). Funkcja usuwa wszystkie nagłówki `x-baza-*`
od klienta i dokłada `x-baza-proxy-secret` + `x-baza-client-ip`. `ProxyAwareThrottlerGuard` ufa
`x-baza-client-ip` tylko przy zgodnym sekrecie (porównanie w stałym czasie). Docelowo (własna domena):
`api.<domena>` + `API_BASE_URL`, a funkcję usunąć.
