#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TAG="${1:-}"
APK_PATH="${2:-}"

if [ -z "$TAG" ] || [ -z "$APK_PATH" ]; then
  echo "Usage: bash scripts/publish-github-release.sh <tag> <apk-path>" >&2
  echo "Example: bash scripts/publish-github-release.sh v1.0.2 dist/acharya-1.0.2.apk" >&2
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: APK not found: $APK_PATH" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is required. Install: https://cli.github.com/" >&2
  exit 1
fi

APK_BASENAME="$(basename "$APK_PATH")"

gh release create "$TAG" "$APK_PATH" \
  --title "$TAG" \
  --notes "Android APK release for Acharya." \
  --latest

echo ""
echo "Published: https://github.com/ANAMASGARD/Acharya-App/releases/tag/${TAG#v}"
echo "Latest download: https://github.com/ANAMASGARD/Acharya-App/releases/latest"
echo "Asset: $APK_BASENAME"
