# Problemy, spostrzeżenia i pułapki

Format: **co**, dlaczego to ważne, co zrobiliśmy / co robić. Dopisuj na górze nowe wpisy z datą.

## Znalezione podczas migracji (2026-09-18)

### 1. Wyścig: wylogowanie / zmiana hasła vs trwająca rotacja refresh (BŁĄD BEZPIECZEŃSTWA, naprawiony)
Znalazł go dopiero e2e w Firefoxie (testy integracyjne bez współbieżności go nie widziały).
Logout unieważniał rodzinę tokenów, a równoległa rotacja (w innej transakcji) commitowała **żywego
następcę** już po unieważnieniu. Efekt: "wylogowany" użytkownik miał działającą sesję na serwerze; przy
zmianie hasła stary refresh token mógł wystawić nowy access token.
**Naprawa (dwie warstwy):** (a) `refresh_token.session_epoch` - token z epoki starszej niż konto jest
martwy, sprawdzane w `SessionService.refresh`; (b) `revokeByToken` blokuje wiersz tokenu `FOR UPDATE`,
więc czeka na commit rotacji i unieważnia całą rodzinę. Testy: `logout racing an in-flight refresh...`
i `a refresh token from an older session epoch is dead...`.
**Wniosek:** każda operacja "unieważnij wszystko" musi być odporna na transakcje w toku. Nie zakładaj,
że `UPDATE ... WHERE revoked_at IS NULL` widzi wiersze z niezacommitowanych transakcji.

### 2. `storageState` z Playwrighta nie działa z rotującym refresh tokenem
Zapisane cookie odtwarzane w wielu równoległych kontekstach (i w kolejnych uruchomieniach) to reuse
starego tokenu poza oknem grace = wykrycie kradzieży = unieważnienie sesji = losowe 401.
**Zrobione:** każdy test uwierzytelniony loguje się własną sesją (`e2e/authenticated.ts`, `POST
/api/auth/login` z `Origin`). Nie przywracaj współdzielonego `storageState`.

### 3. `*.up.railway.app` jest na Public Suffix List => cookie nie zadziała cross-site
Cookie `SameSite=Strict` (i w ogóle first-party) wymaga, żeby SPA i API były same-site. SPA na
`*.pages.dev`, API na `*.up.railway.app` = różne witryny. `SameSite=None` odpada (blokowane cookies
zewnętrzne w Safari/Firefox/Chrome).
**Zrobione (tymczasowo):** Pages Function proxy `/api`. **Docelowo:** własna domena, `api.<domena>`
na Railway, `API_BASE_URL` w CI, usunięcie funkcji. Do czasu domeny throttler potrzebuje
`PROXY_SHARED_SECRET`, inaczej cały ruch widziany jest z adresów Cloudflare (jeden kubełek).

### 4. Build produkcyjny łapie to, czego testy nie łapią
`@nx/js:tsc` buduje biblioteki samodzielnie z `rootDir` = katalog biblioteki: import z innej biblioteki
(`data-access` -> `@baza/shared-types`) daje TS6059 i **wywala deploy**, mimo zielonych testów. Encje w
`data-access` mają własne typy (np. `StoredRouteDirection`). Zawsze uruchom `npm run build`.

### 5. `@nestjs/typeorm@12` jest tylko-ESM
Jest (CJS) go nie transformuje, a projekt jest na Nest 11. Przypięto `@nestjs/typeorm@^11`.

### 6. Walidacja w DTO vs polityka hasła
Stary `@MinLength(8)` w `RegisterCompanyDto` odrzucał hasło zanim zadziałała wspólna polityka (10 znaków),
więc klient dostawał błąd bez kodu `WEAK_PASSWORD`. Siła hasła jest w jednym miejscu:
`isAcceptablePassword` w `@baza/shared-types` (`libs/shared/types/src/lib/password-policy.ts`;
`password-policy.util.ts` w API to tylko re-eksport). Formularze SPA (rejestracja, reset) walidują
tą samą funkcją, więc nie mogą obiecać hasła, którego API nie przyjmie. DTO tylko ogranicza długość
górną (ochrona scrypt).

### 7. Słabe hasło nie może spalić linku resetu
`resetPassword` sprawdza politykę bez emaila PRZED zużyciem tokenu (reguła "hasło = email" sprawdzana
ponownie po zużyciu, bo potrzebuje konta).

### 8. Windows / CRLF w skryptach edytujących pliki
Pliki w repo mają CRLF w katalogu roboczym. `String.replace` z `\n` w literale po cichu nic nie robi.
Normalizuj `\r\n` -> `\n` przed podmianą albo używaj narzędzia Edit. Sprawdzaj, że podmiana faktycznie
zaszła (`includes` + rzucenie błędu).

### 9. Pre-commit (lefthook) kompiluje `apps/baza-api` bez typów jesta
Pliki pomocnicze testów (`src/testing/*.ts`, nie-spec) muszą być wykluczone z `tsconfig.app.json` i
dodane do `tsconfig.spec.json` (zrobione dla `src/testing/**`).

## Czego NIE kopiować z `meet` (audyt 2026-09-18)

- `POST /auth/refresh` bierze `clientType` z body: XSS może wymusić `native` i dostać 180-dniowy refresh
  token w JSON, co niweczy HttpOnly. U nas: refresh tylko w cookie.
- Rotacja refresh bez transakcji i blokady (findOne -> insert -> update): dwa równoległe żądania mogą oba
  wygrać. U nas: `SELECT ... FOR UPDATE` w jednej transakcji.
- Rejestracja liczy scrypt tylko dla nowego adresu = wyrocznia czasowa. U nas: KDF przed sprawdzeniem
  unikalności.
- Brak opcji SSL dla bazy. U nas: `DATABASE_SSL`/`DATABASE_SSL_CA`.
- Po migracji zostały nazwy `supabase-*` i alias `SupabaseUser` (149 użyć). U nas: zero śladów.
- Ślady w dokumentacji `meet` (nieaktualne liczby migracji, `AUTH_JWT_ISSUER` vs `AUTH_TOKEN_ISSUER`).
- `meet` nie importował użytkowników z Supabase (konta stają się nielogowalne). U nas w Supabase były
  tylko dane testowe, więc start od zera.

## `mamymapy`

Nadal Supabase Auth (API tylko weryfikuje JWT przez JWKS). Nie ma tam blokady konta poza ustawieniami
Supabase, jest podwójna weryfikacja JWT (strategy + chat) z różnymi listami algorytmów i bez testów,
unieważnienie tokenu tylko przez jego wygaśnięcie, kolejność w usuwaniu konta (DB, potem Supabase) może
zostawić osieroconego użytkownika. To lista rzeczy, które nasz model (epoka sesji, jeden weryfikator)
załatwia z definicji.

## Znane długi / ograniczenia

- **Throttler jest w pamięci procesu.** OK dla jednej repliki; przy skalowaniu potrzebny Redis, inaczej
  limity są per replika. Blokada konta (Postgres) działa niezależnie od tego.
- **Okno unieważnienia na innych replikach**: cache konta w guardzie 5 s (`ACCOUNT_CACHE_TTL_MS`). Na
  replice, która obsłużyła zmianę, unieważnienie jest natychmiastowe.
- **Niezweryfikowany timing rejestracji z logo**: upload do R2 dzieje się tylko dla nowego konta. Napastnik
  kontroluje obecność logo, więc bez logo różnica to kilka ms; z logo byłaby duża. Akceptowane (bez
  logo brak różnicy). Do rozważenia: wysyłka logo asynchronicznie.
- **Brak sweepera** wygasłych `refresh_token` / `auth_one_time_token` (`RefreshTokenService.deleteExpired`
  istnieje, nie jest podpięty do crona).
- **Brak CLI do nadawania ról / banowania.** `UserAccountService.disable` istnieje, ale nie ma endpointu
  ani komendy; obecnie SQL (patrz `operations.md`).
- **Mail**: bez `RESEND_API_KEY` transport `log` tylko loguje. Na produkcji wtedy ustaw
  `AUTH_REQUIRE_EMAIL_VERIFICATION=false`, inaczej nikt nie zaloguje się po rejestracji.
- **Nagłówek `Referrer-Policy: no-referrer`** dla tras z tokenem w URL (`/verify-email`,
  `/reset-password`) nie jest ustawiony - tokeny są w query string. Dodaj przez `_headers` na Pages.
- **Ciasteczko `__Host-` wymaga HTTPS**, dlatego lokalnie (`http://localhost`) używamy nazwy `baza_rt`
  bez `Secure`. e2e na HTTPS produkcji wymaga innej nazwy cookie w narzędziach.
- **Region**: Postgres i API w `europe-west4` (Amsterdam). Zmiana regionu bazy z danymi = migracja z
  przestojem; nie zmieniaj bez planu.
- **`railway.toml`** jest oznaczony jako deprecated przez Railway (działa do 2026-12-01); migracja do
  `.railway/railway.ts` jeszcze nie wykonana.

## Jak testować, żeby nie wpaść w to samo

- Testy współbieżności piszemy na prawdziwej bazie (`Promise.all` + zapytanie kontrolne o stan wierszy).
- Po zmianie auth uruchom e2e w przeglądarce, nie tylko `supertest`.
- Testuj negatywnie: token innego keyringu, `alg=none`, zły `typ`, zły `Origin`, podszywanie się pod
  `x-baza-client-ip`, ponowne użycie linku, izolacja między firmami.
