# Offer Filter & Contract Parity Tests — Implementation Plan

## Overview

Add unit tests for test-plan Risks **#3** (filter fixture membership) and **#4** (FE↔API wire↔product field mapping). Update cookbook §6.5.

## Current State Analysis

Filtering runs only in `JobOfferService.matchesFilters`. Existing specs assert booleans, not ID-set oracles. Wire names (`cadence`, `license`, …) map to product names only in `parseListQuery`.

### Key Discoveries

- Research: `context/changes/testing-offer-filter-contract-parity/research.md`
- `matchesFilters` exposed for unit tests (`job-offer.service.ts`)
- FE helpers `jobOffersQueryToHttpParams` already unit-tested for shape; need explicit wire-key contract with API

## Desired End State

1. Table-driven test: fixed offers + filters → exact expected ID sets (#3).
2. Wire→`parseListQuery`→`JobOfferFilters` cases covering rename traps (#4).
3. Cookbook §6.5 filled; §3 Phase 2 → `done` after merge (use `implemented` until then).

## What We're NOT Doing

- Playwright / e2e
- Real Supabase listPublished integration
- Risks #5/#6
- Snapshotting entire DTOs

## Implementation Approach

Extend `job-offer.service.spec.ts` with fixture membership + parseListQuery mapping cases. Light FE assert that HttpParams keys match Nest DTO field names. Update `test-plan.md` cookbook.

## Phase 1: Fixture membership oracle (Risk #3)

### Overview

Seed 4 fixture offers; assert exact ID sets for country, cadence, and combined filters.

### Changes Required

#### 1. Membership tests

**File**: `apps/baza-api/src/app/company/job-offer.service.spec.ts`

**Intent**: Prove filter correctness via expected ID membership, not “non-empty”.

**Contract**: Fixtures `o-pl-de-weekly`, `o-it-fr-daily`, `o-de-nl-flexible`, `o-pl-cz-monthly`. Cases: `countries=DE`, `countries=PL`, `cadence=weekly` (includes flexible), `countries=DE&cadence=monthly` → only flexible DE, etc. Helper filters fixtures with `matchesFilters` and compares `Set` of ids.

### Success Criteria

#### Automated Verification

- `npx nx test baza-api` passes

#### Manual Verification

- Confirm one case would fail if country OR cadence semantics changed

---

## Phase 2: Wire↔product contract (Risk #4)

### Overview

Assert `parseListQuery` rename mapping; FE HttpParams keys align with DTO.

### Changes Required

#### 1. parseListQuery mapping cases

**File**: `apps/baza-api/src/app/company/job-offer.service.spec.ts`

**Intent**: `cadence`→`homeReturnCadence`, `license`→`licenseCategory`, `transport`→`requiredTransportType`, `nearLat`/`nearLng`→`near`.

**Contract**: Table of wire query objects → expected `JobOfferFilters`.

#### 2. FE wire keys

**File**: `apps/baza-frontend/src/app/pages/job-offers/job-offers-page.spec.ts`

**Intent**: Document contract keys shared with Nest DTO.

**Contract**: After `jobOffersQueryToHttpParams`, keys are exactly `countries|cadence|license|transport|nearLat|nearLng` subset.

### Success Criteria

#### Automated Verification

- `npx nx test baza-api` and `npx nx test baza-frontend` pass
- `npm run lint` passes

#### Manual Verification

- Skim cases: rename trap would break at least one assertion

---

## Phase 3: Cookbook sync

### Overview

Fill §6.5; set Phase 2 status `implemented` (→ `done` on merge).

### Changes Required

#### 1. test-plan.md

**File**: `context/foundation/test-plan.md`

**Intent**: Document filter membership + contract patterns.

**Contract**: §6.5 + §6.6 note; §3 Phase 2 status `implemented`.

### Success Criteria

#### Automated Verification

- `npm run lint` passes

#### Manual Verification

- §6.5 actionable without reading full specs

---

## Testing Strategy

Unit only; mutation-check manual: flip cadence flexible rule briefly.

## References

- Research: `context/changes/testing-offer-filter-contract-parity/research.md`
- Test plan Phase 2 Risks #3/#4

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Fixture membership oracle (Risk #3)

#### Automated

- [x] 1.1 `npx nx test baza-api` passes — f14b1e8

#### Manual

- [x] 1.2 Confirm membership case would fail if filter semantics changed — f14b1e8

### Phase 2: Wire↔product contract (Risk #4)

#### Automated

- [x] 2.1 `npx nx test baza-api` passes — f14b1e8
- [x] 2.2 `npx nx test baza-frontend` passes — f14b1e8
- [x] 2.3 `npm run lint` passes — f14b1e8

#### Manual

- [x] 2.4 Skim rename-trap assertions — f14b1e8

### Phase 3: Cookbook sync

#### Automated

- [x] 3.1 `npm run lint` passes — f14b1e8

#### Manual

- [x] 3.2 §6.5 actionable for future filter tests — f14b1e8
