# `@baza/api-core`

NestJS helpers used by `baza-api`:

- `configureApp(app)` — CORS, ValidationPipe, global exception filter
- `ApiCoreModule` / `AllExceptionsFilter`

Import `configureApp` from `main.ts` so every Nest app gets the same baseline.
