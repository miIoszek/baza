---
name: baza-auth
description: Logowanie i autoryzacja w Baza - własny moduł identity (email + hasło), access token ES256, refresh token w cookie HttpOnly, rejestracja firmy, weryfikacja maila, reset hasła, Postgres na Railway. Użyj przy KAŻDEJ zmianie lub debugowaniu logowania, sesji, tokenów, cookie, CORS, guardów, migracji bazy, proxy /api, e2e z logowaniem, kluczy JWT lub incydentów bezpieczeństwa.
---

# Auth w Baza

Baza ma **własny** auth w NestJS na Postgresie z Railway. Supabase został usunięty (migracja
2026-09-18). Wzorcem był projekt `meet` (Sportova), ale **nie kopiuj go 1:1** - ma znane błędy
(patrz `references/gotchas.md`). `mamymapy` nadal używa Supabase Auth i NIE jest wzorcem.

## Jak to działa (w skrócie)

- **Hasło**: scrypt (`scrypt$N$r$p$salt$hash`), polityka 10-128 znaków / min. 4 różne / nie równe emailowi.
- **Access token**: JWT ES256, 5 min, trzymany **tylko w pamięci** SPA, wysyłany jako `Authorization: Bearer`.
- **Refresh token**: opaque, w DB tylko SHA-256, w **cookie HttpOnly `SameSite=Strict`** (`__Host-baza_rt`
  na produkcji, `baza_rt` lokalnie). **Nigdy nie wraca w body JSON.** Rotacja + wykrywanie reuse.
- **Unieważnianie**: `user_account.session_epoch` (zmiana hasła / ban) + rodziny refresh tokenów.
- **Guard globalny**: wszystko wymaga tokenu, chyba że `@Public()` (fail closed). Kolejność:
  throttler -> `AccessTokenGuard` -> `RolesGuard` (`app.module.ts`).
- **Rejestracja firmy** tworzy konto + `companies` w jednej transakcji; odpowiedź 202 jest identyczna
  dla nowego i istniejącego adresu (brak enumeracji).
- **Cookie wymaga same-site**: SPA na `*.pages.dev` woła `/api` przez **Cloudflare Pages Function**
  (`apps/baza-frontend/functions/api/[[path]].ts`), bo `*.up.railway.app` jest na Public Suffix List.

## Mapa plików

| Co | Gdzie |
|----|-------|
| Encje + migracje + konfiguracja DB | `libs/api/data-access/src/lib/` |
| Moduł identity (hasła, JWT, refresh, guardy, mail, kontroler `/auth/*`) | `apps/baza-api/src/app/identity/` |
| Rejestracja firmy, `/auth/me` | `apps/baza-api/src/app/auth/` |
| CORS, cookie-parser, trust proxy, kod błędu w odpowiedzi | `libs/api/core/src/lib/` |
| Sesja w przeglądarce, interceptor, strony auth | `apps/baza-frontend/src/app/core/`, `.../pages/{login,register,verify-email,check-email,forgot-password,reset-password}` |
| Proxy `/api` na Pages | `apps/baza-frontend/functions/api/[[path]].ts`, `public/_routes.json` |
| Testy integracyjne (prawdziwy Postgres) | `apps/baza-api/src/testing/` (`TEST_DATABASE_URL`) |
| e2e (Firefox, logowanie per test) | `e2e/authenticated.ts` |

## Zasady, których nie wolno złamać

1. Refresh token **tylko** w cookie. Żadnego `clientType`/pola w body, które by go zwracało.
2. Role czytaj **z bazy**, nie z tokenu (guard tak robi). Claims JWT budowane jawnym literałem, nigdy spreadem.
3. Każda zmiana poświadczeń (hasło, ban, usunięcie) = w **jednej transakcji**: bump `session_epoch` +
   `revokeAllForUser`. Refresh tokeny niosą epokę, z jaką wydano; niezgodna epoka = token martwy.
4. Endpointy przyjmujące email od anonima odpowiadają tak samo dla istniejącego i nieistniejącego adresu
   (202, ten sam kształt, porównywalny czas). `login` zawsze uruchamia KDF (`verifyDummy`).
5. `EMAIL_NOT_VERIFIED` zwracaj dopiero PO poprawnym haśle (inaczej formularz jest sondą istnienia konta).
6. Blokada konta (10 błędów / 15 min) żyje w Postgresie, nie w pamięci.
7. CORS: dokładna lista `CORS_ORIGIN`, nigdy `*`, nigdy odbijanie origin (cookie + `credentials`).
8. Endpointy z cookie (login/refresh/logout/change-password) wymagają `Origin` z listy dozwolonych.
9. Nowy endpoint jest domyślnie chroniony. `@Public()` dodawaj świadomie i dopisz test.
10. Nie loguj tokenów ani linków z tokenem w produkcji (`MailerService` loguje treść tylko poza produkcją).

## Checklist przy zmianie auth

- [ ] Test integracyjny na prawdziwym Postgresie (`apps/baza-api/src/testing/identity.integration.spec.ts`)
      + test jednostkowy, jeśli to czysta logika. Testy negatywne (co MA zostać odrzucone).
- [ ] `npm run lint && npm run test && npm run build` (build łapie błędy, których testy nie widzą,
      np. `rootDir` bibliotek Nx - patrz gotchas).
- [ ] Jeśli dotyka przeglądarki: uruchom e2e w Firefoxie (patrz `e2e/README.md`), bo błędy wyścigów
      wychodzą dopiero tam.
- [ ] Zmiana schematu: migracja TypeORM (skill `db-migrate`), **nigdy** edycja zastosowanej migracji.
- [ ] Zaktualizuj `references/architecture.md`, dopisz pułapki do `references/gotchas.md` i wpis do
      `references/migration-log.md`.

## Komendy

```bash
npx jest -c apps/baza-api/jest.config.js                 # testy API (integracyjne wymagają TEST_DATABASE_URL)
npx nx build baza-api                                      # build produkcyjny (webpack + tsc bibliotek)
railway status ; railway logs -s baza-api                  # Railway (projekt "baza")
```

Szczegóły operacyjne (klucze, role admina, odblokowanie konta, dostęp do bazy, backupy, cutover):
`references/operations.md`.

## Referencje

- `references/architecture.md` - tabele, tokeny, przepływy, endpointy, zmienne środowiskowe, kody błędów.
- `references/gotchas.md` - **problemy i spostrzeżenia**: co poszło nie tak, czego unikać, znane długi.
- `references/operations.md` - jak z tym żyć na Railway/Cloudflare.
- `references/migration-log.md` - dziennik migracji Supabase -> własny auth i lista otwartych spraw.
