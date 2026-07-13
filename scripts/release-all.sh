#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Acharya release pipeline ==="
echo ""

EAS_BIN="$REPO_ROOT/node_modules/.bin/eas"
if [ ! -x "$EAS_BIN" ] || ! "$EAS_BIN" whoami >/dev/null 2>&1; then
  echo "Step 0: Log in to Expo (one-time)"
  echo "  npm run eas:login"
  echo ""
  echo "Complete login in the browser, then rerun:"
  echo "  npm run release:all"
  exit 1
fi

echo "Step 1/3: Deploy API to EAS Hosting"
npm run deploy:api

echo ""
echo "Step 2/3: Build standalone APK"
if [ "${ACHARYA_ANDROID_ENV_READY:-}" != "1" ]; then
  echo "Sourcing Android env..."
  # shellcheck source=/dev/null
  source "$REPO_ROOT/scripts/android-env.sh"
fi
npm run android:standalone-apk

APP_VERSION="$(STANDALONE_BUILD=1 EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-}" EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" npx expo config --json | node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => process.stdout.write(JSON.parse(s).version));')"
APK_PATH="$REPO_ROOT/dist/acharya-${APP_VERSION}.apk"

echo ""
echo "Step 3/3: Publish GitHub Release"
if [ -f "$APK_PATH" ] && command -v gh >/dev/null 2>&1; then
  bash "$REPO_ROOT/scripts/publish-github-release.sh" "v${APP_VERSION}" "$APK_PATH"
else
  echo "APK built at: $APK_PATH"
  echo "Publish manually: bash scripts/publish-github-release.sh v${APP_VERSION} $APK_PATH"
fi

echo ""
echo "Done. Share with judges:"
echo "  APK: https://github.com/ANAMASGARD/Acharya-App/releases/latest"
# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env" 2>/dev/null || true
if [ -n "${EXPO_PUBLIC_API_URL:-}" ]; then
  echo "  API: $EXPO_PUBLIC_API_URL"
fi
