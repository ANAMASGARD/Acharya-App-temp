#!/usr/bin/env bash
# After expo prebuild, allow local release APK signing with the debug keystore.
# Suitable for judge/demo sideloading — not for Play Store submission.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_GRADLE="$REPO_ROOT/android/app/build.gradle"
BUILD_GRADLE_KTS="$REPO_ROOT/android/app/build.gradle.kts"

patch_gradle_file() {
  local file="$1"

  if [ ! -f "$file" ]; then
    return 1
  fi

  if grep -q "ACHARYA_RELEASE_DEBUG_SIGNING" "$file"; then
    return 0
  fi

  python3 - "$file" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text()

marker = "        release {"
if marker not in text:
    print(f"ERROR: Could not find release buildType in {path}", file=sys.stderr)
    sys.exit(1)

replacement = """        release {
            // ACHARYA_RELEASE_DEBUG_SIGNING — local judge/demo APK only
            signingConfig signingConfigs.debug"""
text = text.replace(marker, replacement, 1)
path.write_text(text)
PY
}

if [ -f "$BUILD_GRADLE" ]; then
  patch_gradle_file "$BUILD_GRADLE"
elif [ -f "$BUILD_GRADLE_KTS" ]; then
  echo "WARN: build.gradle.kts detected — configure release signing manually if assembleRelease fails." >&2
else
  echo "ERROR: android/app/build.gradle not found. Run expo prebuild first." >&2
  exit 1
fi
