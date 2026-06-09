#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -z "${LAN_IP:-}" ]; then
  echo "ERROR: Could not detect LAN IP. Connect to Wi-Fi and retry."
  exit 1
fi

EXPO_API_PORT="${EXPO_API_PORT:-8081}"
export VOICE_GATEWAY_WSS_URL="ws://${LAN_IP}:8080/voice"
export ACHARYA_API_BASE_URL="http://127.0.0.1:${EXPO_API_PORT}"

echo "=============================================="
echo " Acharya voice backend (Terminal 1)"
echo "=============================================="
echo "LAN IP:          $LAN_IP"
echo "Voice WebSocket: $VOICE_GATEWAY_WSS_URL"
echo "Transcript API:  $ACHARYA_API_BASE_URL"
echo ""
echo "In Terminal 2 run:"
echo "  ./expo-local.sh"
echo "  (or: npx expo start --go --clear)"
echo ""
echo "If Expo uses a different port (e.g. 8082), restart this script with:"
echo "  EXPO_API_PORT=8082 ./voice-backend.sh"
echo ""

PYTHON=""
for candidate in python3.12 python3.11 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON="$candidate"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "ERROR: Python 3 not found."
  exit 1
fi

cd "$REPO_ROOT"
npm run sync:voice-prompt

VOICE_LOCAL="$REPO_ROOT/services/voice-local"
cd "$VOICE_LOCAL"

if [ ! -d .venv ]; then
  "$PYTHON" -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "voice-local running on http://0.0.0.0:8080 (Ctrl+C to stop)"
exec uvicorn voice_gateway.main:app --host 0.0.0.0 --port 8080 --reload
