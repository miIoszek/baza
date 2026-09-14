#!/usr/bin/env bash
# Push local Sentry DSNs to Railway (API) and GitHub Actions secrets (FE).
# Reads: repo-root .env (SENTRY_DSN) + apps/baza-frontend/src/environments/environment.local.ts
# Does not print secret values. Requires: railway logged in, `gh auth` valid.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a
# dotenvx / dotenv may inject; plain export of KEY=VAL lines:
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    export "$key=$val"
  fi
done < .env
set +a

API_DSN="${SENTRY_DSN:-}"
API_DSN="$(echo -n "$API_DSN" | tr -d '[:space:]')"
if [[ -z "$API_DSN" ]]; then
  echo "SENTRY_DSN empty in .env (API / baza-api)" >&2
  exit 1
fi

LOCAL_FE="apps/baza-frontend/src/environments/environment.local.ts"
if [[ ! -f "$LOCAL_FE" ]]; then
  echo "Missing $LOCAL_FE" >&2
  exit 1
fi
FE_DSN="$(
  node -e "
    const t=require('fs').readFileSync(process.argv[1],'utf8');
    const m=t.match(/sentryDsn:\\s*['\"]([^'\"]*)['\"]/);
    if(!m||!m[1].trim()) process.exit(2);
    process.stdout.write(m[1].trim());
  " "$LOCAL_FE"
)" || {
  echo "sentryDsn empty in environment.local.ts (FE / baza-frontend)" >&2
  exit 1
}

ORG="${SENTRY_ORG:-milosz}"
echo "API DSN length: ${#API_DSN}"
echo "FE  DSN length: ${#FE_DSN}"
echo "SENTRY_ORG: $ORG"

echo "→ Railway: SENTRY_DSN + SENTRY_ENVIRONMENT=production (--skip-deploys)"
railway variables set \
  "SENTRY_DSN=$API_DSN" \
  "SENTRY_ENVIRONMENT=production" \
  --skip-deploys

echo "→ GitHub secrets: SENTRY_DSN (FE), SENTRY_ORG, SENTRY_PROJECT=baza-frontend"
printf '%s' "$FE_DSN" | gh secret set SENTRY_DSN
printf '%s' "$ORG" | gh secret set SENTRY_ORG
printf '%s' "baza-frontend" | gh secret set SENTRY_PROJECT

if [[ -n "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "→ GitHub secret: SENTRY_AUTH_TOKEN (from local env)"
  printf '%s' "$SENTRY_AUTH_TOKEN" | gh secret set SENTRY_AUTH_TOKEN
  echo "→ Railway build: SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT=baza-api"
  railway variables set \
    "SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN" \
    "SENTRY_ORG=$ORG" \
    "SENTRY_PROJECT=baza-api" \
    --skip-deploys
else
  echo "ℹ SENTRY_AUTH_TOKEN not in .env — skipped map-upload secrets (optional)."
  echo "  Create at https://sentry.io/settings/account/api/auth-tokens/ then:"
  echo "  export SENTRY_AUTH_TOKEN=... && $0"
fi

echo "Done. Redeploy API (Railway) after merge so runtime picks up DSN."
