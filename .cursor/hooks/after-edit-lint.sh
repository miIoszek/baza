#!/usr/bin/env bash
# Per-edit lint (Cursor afterFileEdit). Exit 2 = blocking feedback for the agent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

INPUT="$(cat)"
FILE="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("file_path") or "")' <<<"$INPUT")"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  exit 0
fi

# Never react to edits under Cursor config (avoids reload loops).
case "$FILE" in
  */.cursor/*|*/.claude/*|*/.git/*) exit 0 ;;
esac

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

# Skip generated / dist / env
case "$FILE" in
  */dist/*|*/out-tsc/*|*/node_modules/*|*.local.ts) exit 0 ;;
esac

REL="${FILE#"$ROOT"/}"
echo "[after-edit-lint] checking ${REL}" >&2
OUT="$(npx eslint --fix "$REL" 2>&1)" || {
  MSG="after-edit lint failed for ${REL}:
${OUT}"
  python3 -c 'import json,sys; print(json.dumps({"additional_context": sys.argv[1][:10000]}))' "$MSG"
  echo "$MSG" >&2
  exit 2
}
echo "[after-edit-lint] ok ${REL}" >&2

exit 0
