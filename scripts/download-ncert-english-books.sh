#!/usr/bin/env bash
# Download NCERT English textbooks (Class 1–12) from official ncert.nic.in ZIPs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOKS_DIR="$ROOT/books"

download_and_unzip() {
  local class_num="$1"
  local book_slug="$2"
  local zip_name="$3"
  local url="https://ncert.nic.in/textbook/pdf/${zip_name}.zip"
  local dest="$BOOKS_DIR/class-${class_num}/english/${book_slug}"

  mkdir -p "$dest"
  local zip_path="$dest/${zip_name}.zip"

  if [[ -f "$zip_path" ]] && unzip -tq "$zip_path" >/dev/null 2>&1; then
    echo "  [skip download] $zip_path"
  else
    echo "  [download] $url"
    curl -fsSL --retry 3 --retry-delay 2 -o "$zip_path" "$url"
  fi

  echo "  [unzip] -> $dest"
  unzip -o -q "$zip_path" -d "$dest" || true
  rm -f "$zip_path"
}

echo "NCERT English books -> $BOOKS_DIR"
mkdir -p "$BOOKS_DIR"

# Migrate legacy class-2 PDFs if present
LEGACY_CLASS2="$ROOT/books/class 2"
LEGACY_CLASS2_ALT="$ROOT/books/class2"
DEST_CLASS2="$BOOKS_DIR/class-2/english/marigold"
if [[ -d "$LEGACY_CLASS2" || -d "$LEGACY_CLASS2_ALT" ]]; then
  mkdir -p "$DEST_CLASS2"
  find "$ROOT/books" -maxdepth 3 -name 'bemr*.pdf' -exec cp -n {} "$DEST_CLASS2/" \; 2>/dev/null || true
fi

echo "Class 1"
download_and_unzip 1 marigold aeen1dd
download_and_unzip 1 raindrops aerd1dd

echo "Class 2"
download_and_unzip 2 marigold been1dd
download_and_unzip 2 raindrops berd1dd

echo "Class 3"
download_and_unzip 3 marigold ceen1dd

echo "Class 4"
download_and_unzip 4 marigold deen1dd

echo "Class 5"
download_and_unzip 5 marigold eeen1dd

echo "Class 6"
download_and_unzip 6 honeysuckle fehl1dd
download_and_unzip 6 a-pact-with-the-sun fepw1dd

echo "Class 7"
download_and_unzip 7 honeycomb gehc1dd
download_and_unzip 7 an-alien-hand geah1dd

echo "Class 8"
download_and_unzip 8 honeydew hehd1dd
download_and_unzip 8 it-so-happened heih1dd

echo "Class 9"
download_and_unzip 9 beehive iebe1dd
download_and_unzip 9 moments iemo1dd
download_and_unzip 9 words-and-expressions iewe1dd

echo "Class 10"
download_and_unzip 10 first-flight jeff1dd
download_and_unzip 10 footprints-without-feet jefp1dd

echo "Class 11"
download_and_unzip 11 hornbill kehb1dd
download_and_unzip 11 snapshots kesp1dd
download_and_unzip 11 woven-words keww1dd

echo "Class 12"
download_and_unzip 12 flamingo lefl1dd
download_and_unzip 12 kaleidoscope lekl1dd
download_and_unzip 12 vistas levt1dd

node "$ROOT/scripts/generate-books-manifest.mjs"

echo ""
echo "Done. PDF counts per class:"
for n in $(seq 1 12); do
  count=$(find "$BOOKS_DIR/class-${n}" -name '*.pdf' 2>/dev/null | wc -l)
  echo "  class-${n}: ${count} PDFs"
done
