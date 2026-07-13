#!/usr/bin/env bash
# Quick API + env smoke test before APK build.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env"

API_URL="${EXPO_PUBLIC_API_URL:-https://acharya-app.expo.app}"
API_URL="${API_URL%/}"

echo "=== Acharya API smoke test ==="
echo "API: $API_URL"
echo ""

check() {
  local name="$1"
  local url="$2"
  local expect="$3"
  local body
  body="$(curl -sS -m 20 "$url" 2>&1 || true)"
  if echo "$body" | grep -q '"status":"ok"'; then
    echo "OK   $name"
  elif echo "$body" | grep -q "$expect"; then
    echo "WARN $name (reachable but not healthy)"
    echo "     $body" | head -c 200
    echo ""
  else
    echo "FAIL $name"
    echo "     $body" | head -c 200
    echo ""
  fi
}

check "Neo4j health" "$API_URL/api/health/neo4j" '"transport":"https-query-api-v2"'
check "Curriculum API" "$API_URL/api/curriculum/availability" 'class\|error\|book'

echo ""
echo "Local Neo4j driver test:"
node -e "
const neo4j=require('neo4j-driver');
const uri=process.env.NEO4J_URI;
const user=process.env.NEO4J_USERNAME||'neo4j';
const pass=process.env.NEO4J_PASSWORD;
const db=process.env.NEO4J_DATABASE||'neo4j';
if(!uri||!pass){console.log('FAIL missing NEO4J_URI/PASSWORD');process.exit(1)}
const d=neo4j.driver(uri, neo4j.auth.basic(user, pass));
d.verifyConnectivity()
  .then(()=>{console.log('OK   Aura connectivity');return d.close()})
  .catch((e)=>{console.log('FAIL Aura:', e.message.split('\\n')[0]);process.exit(1)});
" 2>&1

echo ""
for var in EXPO_PUBLIC_API_URL EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY SARVAM_API_KEY OPENROUTER_API_KEY VOICE_SESSION_SIGNING_SECRET; do
  if [ -n "${!var:-}" ]; then
    echo "SET  $var"
  else
    echo "MISS $var"
  fi
done

if [ -z "${LIVEKIT_URL:-}" ]; then
  echo "WARN LIVEKIT_URL not set — voice in APK needs LiveKit (text chat still works)"
fi
