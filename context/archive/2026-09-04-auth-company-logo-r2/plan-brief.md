# Auth Company Logo R2 — Plan Brief

> Full plan: `context/changes/auth-company-logo-r2/plan.md`

## What & Why

Optional company photo with optimized variants on R2 so UI can show a small logo without shipping full originals.

## Starting Point

Register works without files; photo columns nullable; R2 bucket name reserved in env example.

## Desired End State

Register accepts optional image → original + 48/96/192/512 WebP on R2 → URLs on company; FE preview.

## Key Decisions

| Decision | Choice | Source |
| -------- | ------ | ------ |
| Sizes | 48/96/192/512 + original | Umbrella |
| Protocol | S3-compatible to Cloudflare R2 | Umbrella |
| Optional | Register succeeds without photo | Umbrella |

## Phases

1. Nest R2/sharp/multipart  
2. FE FormData + preview
