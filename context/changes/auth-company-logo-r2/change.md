---
change_id: auth-company-logo-r2
title: Company logo upload with R2 size variants
status: impl_reviewed
created: 2026-09-04
updated: 2026-09-04
archived_at: null
---

## Notes

Optional company photo on register: multer + sharp → original + WebP 48/96/192/512 on Cloudflare R2; store photo_key/photo_urls; FE file input + preview using small URL.

Requires Railway/local env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`. Without R2, register without photo still works; with photo → 503 until R2 is set.
