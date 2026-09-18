---
id: T-25
typ: zadanie
status: todo
priorytet: P2
obszar: [jakość]
projekt: Baza
szacunek: 10min
źródło: "[[2026-09-17 Review techniczne pod produkcję]]"
utworzono: 2026-09-17
tags: [zadanie, priorytet/P2, obszar/jakość]
---

# T-25 Martwy kod w kontrolerach

## Problem

Dwa miejsca obsługują przypadek, który nie może wystąpić:

```ts
// auth.controller.ts:61-67
@Get('me')
@UseGuards(JwtAuthGuard)
async me(@Req() req: AuthedRequest): Promise<AuthMeResponse> {
  const user = req.user;
  if (!user) {
    return { user: { id: '', email: null }, company: null };   // ← nieosiągalne
  }
```

```ts
// company.controller.ts:53-58 — to samo
```

`JwtAuthGuard` rzuca `UnauthorizedException`, jeśli nie ustawi `req.user` (`jwt-auth.guard.ts:29-35`). Do ciała metody nie da się wejść bez usera.

Ten fallback jest gorszy niż zbędny — zwraca **pozornie poprawną odpowiedź z pustym `id`** zamiast błędu. Gdyby kiedyś ktoś zdjął guard z endpointu, zamiast 401 poleciałoby 200 z pustą sesją, a front uznałby to za „zalogowany użytkownik bez firmy". Cichy błąd zamiast głośnego.

Ciekawe, że `requireUserId` w tym samym pliku robi to dobrze (`company.controller.ts:170-176`) — rzuca zamiast zwracać atrapę.

## Jak naprawić

Usuń fallback, zawęź typ:

```ts
async me(@Req() req: AuthedRequest): Promise<AuthMeResponse> {
  const user = this.requireUser(req);   // rzuca, nie zwraca atrapy
  const company = await this.authService.getCompanyForUser(user.id);
  return { user: { id: user.id, email: user.email ?? null }, company };
}
```

Albo lepiej: zmień `AuthedRequest`, żeby po guardzie `user` był wymagany — wtedy TypeScript sam pilnuje, że fallback jest niepotrzebny.

## Definicja ukończenia

- [ ] Fallback usunięty w obu kontrolerach
- [ ] Testy nadal zielone (sprawdź `auth.controller.spec.ts`, `company.controller.spec.ts`)

## Powiązane
- [[Jakość kodu i testy]]
