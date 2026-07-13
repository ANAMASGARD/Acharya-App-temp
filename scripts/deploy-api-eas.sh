#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

EAS_BIN="$REPO_ROOT/node_modules/.bin/eas"

if [ ! -x "$EAS_BIN" ]; then
  echo "ERROR: eas-cli not installed. Run: npm install" >&2
  exit 1
fi

if ! "$EAS_BIN" whoami >/dev/null 2>&1; then
  echo "ERROR: Not logged in to Expo." >&2
  echo "Run once: npm run eas:login" >&2
  echo "Then retry: npm run deploy:api" >&2
  exit 1
fi

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
if [ -f "$REPO_ROOT/.env" ]; then
  load_repo_env "$REPO_ROOT/.env"
fi

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo "ERROR: Missing .env — copy .env.example and fill secrets." >&2
  exit 1
fi

echo "==> Linking Expo project (if needed)"
if ! grep -q 'projectId' "$REPO_ROOT/app.config.ts" 2>/dev/null; then
  "$EAS_BIN" init --non-interactive --force 2>/dev/null || "$EAS_BIN" init --force
fi

echo "==> Pushing server env vars to EAS (production)"
# Avoid broken expo-dev-client plugin during config resolution
export STANDALONE_BUILD=1
"$EAS_BIN" env:push --environment production --path "$REPO_ROOT/.env" --force

echo "==> Exporting server bundle (web + API routes)"
npx expo export --platform web

echo "==> Deploying API to EAS Hosting (production)"
DEPLOY_LOG="$(mktemp)"
if ! "$EAS_BIN" deploy --prod --environment production --export-dir dist --non-interactive >"$DEPLOY_LOG" 2>&1; then
  cat "$DEPLOY_LOG"
  rm -f "$DEPLOY_LOG"
  exit 1
fi
cat "$DEPLOY_LOG"

API_URL="$(grep -Eo 'https://[a-zA-Z0-9._-]+\.expo\.app' "$DEPLOY_LOG" | head -1 || true)"
# Prefer stable production alias if present
if grep -q 'https://acharya-app\.expo\.app' "$DEPLOY_LOG"; then
  API_URL="https://acharya-app.expo.app"
fi

if [ -z "$API_URL" ]; then
  API_URL="$(grep -Eo 'https://[a-zA-Z0-9._/-]+' "$DEPLOY_LOG" | grep -E 'expo\.(app|dev)' | head -1 || true)"
fi
rm -f "$DEPLOY_LOG"

if [ -z "$API_URL" ]; then
  echo ""
  echo "Deploy finished. Copy the production URL from the output above into .env:"
  echo "  EXPO_PUBLIC_API_URL=https://your-url.expo.app"
  echo "  ACHARYA_API_BASE_URL=https://your-url.expo.app"
  exit 0
fi

echo ""
echo "Deployed API URL: $API_URL"

if grep -q '^EXPO_PUBLIC_API_URL=' "$REPO_ROOT/.env"; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|" "$REPO_ROOT/.env"
else
  printf '\nEXPO_PUBLIC_API_URL=%s\n' "$API_URL" >> "$REPO_ROOT/.env"
fi

if grep -q '^ACHARYA_API_BASE_URL=' "$REPO_ROOT/.env"; then
  sed -i "s|^ACHARYA_API_BASE_URL=.*|ACHARYA_API_BASE_URL=${API_URL}|" "$REPO_ROOT/.env"
else
  printf '\nACHARYA_API_BASE_URL=%s\n' "$API_URL" >> "$REPO_ROOT/.env"
fi

echo "Updated .env with EXPO_PUBLIC_API_URL and ACHARYA_API_BASE_URL"
echo ""
echo "==> Verifying Neo4j health on deployed API"
HEALTH="$(curl -sS -m 30 "${API_URL}/api/health/neo4j" || true)"
echo "$HEALTH"
if ! echo "$HEALTH" | grep -q '"connected":true' || ! echo "$HEALTH" | grep -q '"transport":"https-query-api-v2"'; then
  echo "ERROR: Neo4j health check failed or stale server bundle is still deployed." >&2
  exit 1
fi
echo "Neo4j health OK — existing APK can keep using ${API_URL} (no rebuild required)."
echo ""
echo "Next (only if you changed EXPO_PUBLIC_API_URL): source scripts/android-env.sh && npm run android:standalone-apk"
