#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ "${ACHARYA_ANDROID_ENV_READY:-}" != "1" ]; then
  echo "ERROR: Run this after sourcing Android env:" >&2
  echo "  source scripts/android-env.sh" >&2
  echo "  npm run android:standalone-apk" >&2
  exit 1
fi

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env"

missing=()
[ -z "${EXPO_PUBLIC_API_URL:-}" ] && missing+=("EXPO_PUBLIC_API_URL")
[ -z "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ] && missing+=("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY")

if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: Missing required .env vars for standalone APK:" >&2
  for var in "${missing[@]}"; do
    echo "  - $var" >&2
  done
  echo "Set EXPO_PUBLIC_API_URL to your deployed Expo API / EAS Hosting URL." >&2
  exit 1
fi

for var in LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_AGENT_NAME VOICE_SESSION_SIGNING_SECRET VOICE_AGENT_WEBHOOK_SECRET SARVAM_API_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "WARN: $var is not set in .env — APK will build, but Chat voice may fail until API + LiveKit agent are configured." >&2
  fi
done

APP_VERSION="$(STANDALONE_BUILD=1 EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" npx expo config --json | node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => process.stdout.write(JSON.parse(s).version));')"
DIST_DIR="$REPO_ROOT/dist"
APK_NAME="acharya-${APP_VERSION}.apk"
APK_PATH="$DIST_DIR/$APK_NAME"

mkdir -p "$DIST_DIR"

echo "==> Syncing voice prompt"
npm run sync:voice-prompt

echo "==> API smoke test"
bash "$REPO_ROOT/scripts/test-api-keys.sh" || echo "WARN: some API checks failed — fix .env / resume Aura at https://console.neo4j.io"

echo "==> Generating native Android project (standalone — no dev client)"
export STANDALONE_BUILD=1
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://acharya-app.expo.app}"
export EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
# Clean prebuild is intentional: it regenerates native resources when the app
# icon/config changes and guarantees the release does not retain dev-client state.
npx expo prebuild --platform android --clean --no-install

echo "==> Configuring local release signing (debug keystore for sideload)"
bash "$REPO_ROOT/scripts/configure-android-release-signing.sh"

echo "==> Building release APK (bundled JS + LiveKit, API URL: $EXPO_PUBLIC_API_URL)"
export JAVA_HOME
export ANDROID_HOME
export ANDROID_SDK_ROOT
export STANDALONE_BUILD=1
export EXPO_PUBLIC_API_URL
export EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
(cd "$REPO_ROOT/android" && ./gradlew :app:assembleRelease --no-daemon)

RELEASE_APK="$REPO_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$RELEASE_APK" ]; then
  echo "ERROR: Release APK not found at $RELEASE_APK" >&2
  exit 1
fi

cp "$RELEASE_APK" "$APK_PATH"

echo ""
echo "Standalone APK ready:"
echo "  $APK_PATH"
echo ""
echo "Install on a connected device:"
echo "  adb install -r \"$APK_PATH\""
echo ""
echo "Publish to GitHub Releases:"
echo "  bash scripts/publish-github-release.sh \"v${APP_VERSION}\" \"$APK_PATH\""
