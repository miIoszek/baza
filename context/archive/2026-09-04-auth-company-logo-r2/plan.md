# Auth Company Logo R2 Implementation Plan

## Overview

Optional company logo on register: resize with sharp to original + WebP 48/96/192/512, upload to Cloudflare R2 via S3-compatible client, persist `photo_key` / `photo_urls` on `companies`.

## Current State Analysis

- Register creates user+company without files.
- `photo_key` / `photo_urls` columns already exist (nullable).
- `.env.example` lists R2_* vars; bucket `baza-uploads` planned.

## Desired End State

- Multipart register accepts optional `photo` file.
- Five objects in R2; company row has URLs; FE shows preview / navbar can use `s96`.

## What We're NOT Doing

- Separate profile edit screen beyond register
- Image CDN transforms (client-side variants only)

## Implementation Approach

R2 module (S3 client) → ImageService (sharp) → extend register DTO/controller for multipart → FE file input.

## Phase 1: R2 + sharp + register multipart

### Changes Required:

#### 1. Dependencies

**Intent**: Add `@aws-sdk/client-s3`, `sharp`, `multer`, types.

#### 2. R2 upload service

**File**: `apps/baza-api/src/app/storage/`

**Intent**: PutObject to `R2_BUCKET` using account endpoint; public URLs from `R2_PUBLIC_URL`.

**Contract**: `uploadCompanyLogo(userId, buffer, mime)` → `{ photoKey, photoUrls }`.

#### 3. Register multipart

**Intent**: Optional file field `photo`; if present process+upload before/after company insert; update company row.

### Success Criteria:

#### Automated

- API build succeeds

#### Manual

- Upload produces 5 R2 objects when R2 env set

---

## Phase 2: FE file input + preview

### Changes Required:

#### 1. Register form

**Intent**: file input + preview; send FormData to register.

### Success Criteria:

#### Automated

- FE build + tests pass

#### Manual

- Preview shows selected image; after register small URL usable

## Progress

### Phase 1: R2 + sharp + register multipart

#### Automated

- [x] 1.1 API build succeeds

#### Manual

- [x] 1.2 Five R2 objects when configured

### Phase 2: FE file input + preview

#### Automated

- [x] 2.1 FE build + tests pass

#### Manual

- [x] 2.2 Preview + small URL after register
