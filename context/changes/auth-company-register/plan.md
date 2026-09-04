# Auth Company Register Implementation Plan

## Overview

FR-001 company signup without logo: `companies` table, Nest `POST /api/auth/register`, FE register form wired with auto-login, navbar shows `company.name`.

## Current State Analysis

- Session change delivers login + `/api/auth/me` with `company: null`.
- Supabase project `baza` (`famqecjcmdnyakbuuekt`) provisioned for this program.
- Register UI stub exists.

## Desired End State

- Register creates Auth user + companies row; FE signs in and lands on `/`.
- `/api/auth/me` returns company; navbar uses company name.
- Photo columns nullable for next change.

## What We're NOT Doing

- R2 / sharp / photo upload
- Public profile page polish beyond me/navbar

## Implementation Approach

Migration → Nest register DTO/service → extend `/me` → wire FE register + AuthService account label from `/me`.

## Phase 1: Schema + Nest register + /me company

### Changes Required:

#### 1. companies migration

**File**: applied via Supabase + mirrored `supabase/migrations/*.sql`

**Intent**: text `base_location`; nullable photo fields; RLS select public, insert/update own.

**Contract**: table `public.companies` as in migration.

#### 2. POST /api/auth/register

**File**: `apps/baza-api/src/app/auth/`

**Intent**: Validate DTO; create user (service role admin); insert company; return ids. No photo.

**Contract**: Body: name, nip, email, password, description, baseLocation, termsAccepted. 201 on success.

#### 3. Extend GET /me

**Intent**: Load company by `user_id`.

**Contract**: `AuthMeResponse.company` populated when row exists.

### Success Criteria:

#### Automated

- API build succeeds
- Migration present in repo

#### Manual

- Register via API creates user+company (needs SERVICE_ROLE in env)

---

## Phase 2: FE register + navbar company name

### Changes Required:

#### 1. RegisterPage submit

**Intent**: POST register → signInWithPassword → navigate `/`.

#### 2. AuthService / App shell label

**Intent**: After session, fetch `/api/auth/me`; expose `accountLabel` = company.name ?? email.

### Success Criteria:

#### Automated

- FE build + tests pass

#### Manual

- Register flow updates navbar to company name

## Progress

### Phase 1: Schema + Nest register + /me company

#### Automated

- [x] 1.1 API build succeeds
- [x] 1.2 Migration SQL in repo

#### Manual

- [x] 1.3 Register creates user+company

### Phase 2: FE register + navbar company name

#### Automated

- [x] 2.1 FE build + tests pass

#### Manual

- [x] 2.2 Navbar shows company name after register
