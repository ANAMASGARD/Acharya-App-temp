#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env"

for var in SARVAM_API_KEY VOICE_AGENT_WEBHOOK_SECRET LIVEKIT_AGENT_NAME; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set in .env"
    exit 1
  fi
done

ACHARYA_API_BASE_URL="${ACHARYA_API_BASE_URL:-}"
if [ -z "$ACHARYA_API_BASE_URL" ]; then
  echo "ERROR: Set ACHARYA_API_BASE_URL in .env to your public Expo API URL."
  exit 1
fi

npm run sync:voice-prompt

cd "$REPO_ROOT/services/voice-livekit"

echo "Deploying LiveKit agent ..."
lk agent deploy

echo "Updating agent secrets from root .env ..."
lk agent update-secrets \
  --secrets "SARVAM_API_KEY=${SARVAM_API_KEY},ACHARYA_API_BASE_URL=${ACHARYA_API_BASE_URL},VOICE_AGENT_WEBHOOK_SECRET=${VOICE_AGENT_WEBHOOK_SECRET},SARVAM_STT_MODEL=${SARVAM_STT_MODEL:-saaras:v3},SARVAM_LLM_MODEL=${SARVAM_LLM_MODEL:-sarvam-30b},SARVAM_TTS_MODEL=${SARVAM_TTS_MODEL:-bulbul:v3},SARVAM_TTS_SPEAKER=${SARVAM_TTS_SPEAKER:-priya},LIVEKIT_AGENT_NAME=${LIVEKIT_AGENT_NAME}"

echo "Done. Agent name: ${LIVEKIT_AGENT_NAME}"
