#!/usr/bin/env bash
# Per-edit typecheck scoped to the edited app (Nx monorepo). Exit 2 = blocking.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INPUT="$(cat)"
FILE="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("file_path") or "")' <<<"$INPUT")"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  exit 0
fi

case "$FILE" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

case "$FILE" in
  */dist/*|*/out-tsc/*|*/node_modules/*|*.spec.ts|*.test.ts|*.mock.ts) exit 0 ;;
esac

REL="${FILE#"$ROOT"/}"
TSCONFIG=""

case "$REL" in
  apps/baza-api/*) TSCONFIG="apps/baza-api/tsconfig.app.json" ;;
  apps/baza-frontend/*) TSCONFIG="apps/baza-frontend/tsconfig.app.json" ;;
  libs/shared/types/*|libs/api/*|libs/baza/*)
    # Shared libs: typecheck both app consumers (still ~few seconds each).
    OUT_API="$(npx tsc -p apps/baza-api/tsconfig.app.json --noEmit 2>&1)" || {
      MSG="after-edit typecheck (api, via shared lib) failed for ${REL}:
${OUT_API}"
      python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
      echo "$MSG" >&2
      exit 2
    }
    OUT_FE="$(npx tsc -p apps/baza-frontend/tsconfig.app.json --noEmit 2>&1)" || {
      MSG="after-edit typecheck (frontend, via shared lib) failed for ${REL}:
${OUT_FE}"
      python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
      echo "$MSG" >&2
      exit 2
    }
    exit 0
    ;;
  *) exit 0 ;;
esac

OUT="$(npx tsc -p "$TSCONFIG" --noEmit 2>&1)" || {
  MSG="after-edit typecheck failed for ${REL} (${TSCONFIG}):
${OUT}"
  python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
  echo "$MSG" >&2
  exit 2
}

exit 0
