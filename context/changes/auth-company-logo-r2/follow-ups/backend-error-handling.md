# Backend follow-ups (auth / API)

## Unified Nest error-handling system (deferred)

Multer / interceptor / filter errors are currently ad-hoc (`BadRequestException` in places, generic `Error` historically in fileFilter).

**TODO:** Design a single Nest exception filter + error DTO contract for:
- validation (class-validator)
- Multer upload rejects
- Supabase / R2 upstream failures
- consistent FE snackbar mapping

Until then: prefer `BadRequestException` / Nest HTTP exceptions at boundaries; avoid raw `Error` in filters.
