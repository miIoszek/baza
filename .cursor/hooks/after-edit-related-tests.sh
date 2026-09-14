#!/usr/bin/env bash
# Scoped related tests for test-plan risk areas (#1–#4). Skip non-risk edits.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INPUT="$(cat)"
FILE="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("file_path") or "")' <<<"$INPUT")"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  exit 0
fi

case "$FILE" in
  */.cursor/*|*/.claude/*|*/.git/*) exit 0 ;;
esac

REL="${FILE#"$ROOT"/}"

# Highest remaining / covered risks from context/foundation/test-plan.md:
# #1–#2 marketplace loop (job-application), #3–#4 filters/contracts (job-offer + FE page + shared types)
IS_RISK=0
case "$REL" in
  apps/baza-api/src/app/company/job-application.*|\
  apps/baza-api/src/app/company/job-offer.*|\
  apps/baza-api/src/testing/stateful-supabase.mock.ts|\
  apps/baza-frontend/src/app/pages/job-offers/*|\
  libs/shared/types/src/*)
    IS_RISK=1
    ;;
esac

if [[ "$IS_RISK" -ne 1 ]]; then
  exit 0
fi

case "$REL" in
  apps/baza-api/*)
    OUT="$(npx jest --config apps/baza-api/jest.config.js \
      --findRelatedTests "$REL" --passWithNoTests --forceExit 2>&1)" || {
      MSG="after-edit related tests failed for ${REL}:
${OUT}"
      python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
      echo "$MSG" >&2
      exit 2
    }
    ;;
  apps/baza-frontend/*)
    # Angular unit-test target uses Vitest; related mode when available.
    OUT="$(cd apps/baza-frontend && AI_AGENT=1 npx vitest related "../../$REL" --run 2>&1)" || {
      MSG="after-edit related tests failed for ${REL}:
${OUT}"
      python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
      echo "$MSG" >&2
      exit 2
    }
    ;;
  libs/shared/types/*)
    OUT_API="$(npx jest --config apps/baza-api/jest.config.js \
      --findRelatedTests "$REL" --passWithNoTests --forceExit 2>&1)" || {
      MSG="after-edit related tests (api) failed for ${REL}:
${OUT_API}"
      python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
      echo "$MSG" >&2
      exit 2
    }
    ;;
esac

exit 0
