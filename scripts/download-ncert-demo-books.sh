#!/usr/bin/env bash
# Download missing NCERT English demo books (one per class — see books/demo-books.json).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOKS_DIR="$ROOT/books"
CONFIG="$BOOKS_DIR/demo-books.json"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG"
  exit 1
fi

download_and_unzip() {
  local class_num="$1"
  local book_slug="$2"
  local zip_name="$3"
  local url="https://ncert.nic.in/textbook/pdf/${zip_name}.zip"
  local dest="$BOOKS_DIR/class-${class_num}/english/${book_slug}"

  mkdir -p "$dest"
  local zip_path="$dest/${zip_name}.zip"
  local pdf_count
  pdf_count=$(find "$dest" -name '*.pdf' 2>/dev/null | wc -l)

  if [[ "$pdf_count" -gt 0 ]]; then
    echo "  [skip] class-${class_num}/${book_slug} — ${pdf_count} PDFs already present"
    find "$dest" -name '*.zip' -delete 2>/dev/null || true
    return 0
  fi

  echo "  [download] class-${class_num}/${book_slug} <- $url"
  if ! curl -fsSL --retry 3 --retry-delay 2 -A "Mozilla/5.0" -o "$zip_path" "$url"; then
    echo "  [warn] download failed for ${zip_name} — skip"
    rm -f "$zip_path"
    return 0
  fi

  echo "  [unzip] -> $dest"
  unzip -o -q "$zip_path" -d "$dest" || true
  rm -f "$zip_path"
}

echo "NCERT English demo books -> $BOOKS_DIR"
echo "(one book per class — config: books/demo-books.json)"
mkdir -p "$BOOKS_DIR"

# Migrate legacy class-2 PDFs if present
LEGACY_CLASS2="$ROOT/books/class 2"
LEGACY_CLASS2_ALT="$ROOT/books/class2"
DEST_CLASS2="$BOOKS_DIR/class-2/english/marigold"
if [[ -d "$LEGACY_CLASS2" || -d "$LEGACY_CLASS2_ALT" ]]; then
  mkdir -p "$DEST_CLASS2"
  find "$ROOT/books" -maxdepth 3 -name 'bemr*.pdf' -exec cp -n {} "$DEST_CLASS2/" \; 2>/dev/null || true
fi

node -e "
const fs = require('fs');
const books = JSON.parse(fs.readFileSync('$CONFIG', 'utf8')).books;
for (const b of books) {
  console.log([b.classNum, b.slug, b.zipCode].join('\t'));
}
" | while IFS=$'\t' read -r class_num book_slug zip_name; do
  echo "Class ${class_num} — ${book_slug}"
  download_and_unzip "$class_num" "$book_slug" "$zip_name"
done

node "$ROOT/scripts/generate-books-manifest.mjs"

echo ""
echo "Demo PDF counts:"
node -e "
const fs = require('fs');
const path = require('path');
const cfg = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));
for (const b of cfg.books) {
  const dir = path.join('$BOOKS_DIR', 'class-' + b.classNum, 'english', b.slug);
  let count = 0;
  try {
    const walk = (d) => {
      for (const name of fs.readdirSync(d)) {
        const full = path.join(d, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (name.toLowerCase().endsWith('.pdf')) count++;
      }
    };
    walk(dir);
  } catch {}
  console.log('  class-' + b.classNum + ' ' + b.slug + ': ' + count + ' PDFs');
}
"
