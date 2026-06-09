#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
Acharya voice — use TWO terminals (like frontend + backend):

  Terminal 1 — voice AI backend:
    ./voice-backend.sh

  Terminal 2 — Expo app:
    ./expo-local.sh

Keep both running. Scan the QR code in Expo Go (same Wi-Fi as this laptop).
EOF
