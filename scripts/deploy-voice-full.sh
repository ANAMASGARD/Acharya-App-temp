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
  echo "ERROR: Not logged in. Run: npm run eas:login" >&2
  exit 1
fi

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env"

for var in EXPO_PUBLIC_API_URL ACHARYA_API_BASE_URL LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_AGENT_NAME SARVAM_API_KEY VOICE_AGENT_WEBHOOK_SECRET; do
  if [ -z "${!var:-}" ]; then
    echo "WARN: $var is not set — voice agent deploy may fail." >&2
  fi
done

npm run sync:voice-prompt
bash "$REPO_ROOT/scripts/deploy-voice-livekit.sh"
