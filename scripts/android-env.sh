#!/usr/bin/env bash
# Source this file so Android/Java env vars persist in your shell:
#   source scripts/android-env.sh
#
# Loads root .env for EXPO_PUBLIC_* build-time vars (secrets are not printed).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=load-env.sh
source "$REPO_ROOT/scripts/load-env.sh"
load_repo_env "$REPO_ROOT/.env" 2>/dev/null || true

find_java_home() {
  if [ -n "${JAVA_HOME:-}" ] && [ -d "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    return 0
  fi

  unset JAVA_HOME

  local candidates=(
    "/usr/lib/jvm/java-17-temurin-jdk"
    "/usr/lib/jvm/java-17-openjdk"
    "/usr/lib/jvm/java-17"
    "/usr/lib/jvm/java-25-openjdk"
    "/usr/lib/jvm/java-21-openjdk"
    "/usr/lib/jvm/java-21"
    "/usr/lib/jvm/default-java"
    "/opt/homebrew/opt/openjdk@17"
    "/opt/homebrew/opt/openjdk@21"
  )

  for candidate in "${candidates[@]}"; do
    if [ -d "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      return 0
    fi
  done

  if command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || command -v java)"
    if [ -n "$java_bin" ]; then
      export JAVA_HOME="$(dirname "$(dirname "$java_bin")")"
      return 0
    fi
  fi

  return 1
}

find_android_home() {
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
    export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
    return 0
  fi

  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "$ANDROID_SDK_ROOT" ]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    return 0
  fi

  local candidates=(
    "$HOME/Android/Sdk"
    "$HOME/Library/Android/sdk"
    "/opt/android-sdk"
    "/usr/lib/android-sdk"
    "/usr/local/lib/android/sdk"
  )

  for candidate in "${candidates[@]}"; do
    if [ -d "$candidate" ]; then
      export ANDROID_HOME="$candidate"
      export ANDROID_SDK_ROOT="$candidate"
      return 0
    fi
  done

  return 1
}

if ! find_java_home; then
  echo "ERROR: JAVA_HOME not found. Install JDK 17+ (Fedora: sudo dnf install java-17-openjdk-devel)." >&2
  return 1 2>/dev/null || exit 1
fi

if ! find_android_home; then
  echo "ERROR: ANDROID_HOME not found. Install Android SDK (Android Studio or sdkmanager)." >&2
  return 1 2>/dev/null || exit 1
fi

export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/cmdline-tools/bin:$PATH"

export ACHARYA_ANDROID_ENV_READY=1

echo "Android build environment ready."
echo "  JAVA_HOME=$JAVA_HOME"
echo "  ANDROID_HOME=$ANDROID_HOME"

if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  echo "WARN: EXPO_PUBLIC_API_URL is not set in .env — required for standalone APK voice + API calls." >&2
fi

if [ -z "${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "WARN: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in .env — required for auth in the APK." >&2
fi
