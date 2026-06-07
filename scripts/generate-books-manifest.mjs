#!/usr/bin/env node
/**
 * Scan demo books on disk and write books/manifest.json (one book per class).
 * Config: books/demo-books.json
 * Path: books/class-N/<subject>/<slug>/*.pdf
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BOOKS_DIR = path.join(ROOT, "books");
const CONFIG_PATH = path.join(BOOKS_DIR, "demo-books.json");

export function demoBookId(meta) {
  const classLevel = `class-${meta.classNum}`;
  const subject = meta.subject ?? "english";
  return `ncert-${subject}-${classLevel}-${meta.slug}`;
}

async function listChapterPdfsRecursive(dir, baseDir = BOOKS_DIR) {
  const pdfs = [];

  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith(".pdf")) {
        continue;
      }
      const st = await stat(full);
      if (st.isFile()) {
        pdfs.push({
          fileName: entry.name,
          relativePath: path.relative(baseDir, full),
        });
      }
    }
  }

  await walk(dir);
  return pdfs.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
const books = [];

for (const meta of config.books) {
  const classLevel = `class-${meta.classNum}`;
  const subject = meta.subject ?? "english";
  const bookId = demoBookId(meta);
  const dir = path.join(BOOKS_DIR, classLevel, subject, meta.slug);
  const chapterPdfs = await listChapterPdfsRecursive(dir);

  if (chapterPdfs.length === 0) {
    console.log(`  (no PDFs) ${bookId} — expected ${dir}`);
  }

  books.push({
    bookId,
    title: meta.title,
    classLevel,
    classNum: meta.classNum,
    subject,
    slug: meta.slug,
    zipCode: meta.zipCode,
    source: "ncert",
    isPreloaded: true,
    chapterPdfs,
  });
}

const withPdfs = books.filter((b) => b.chapterPdfs.length > 0);
const manifest = {
  generatedAt: new Date().toISOString(),
  demo: true,
  books: withPdfs,
};

await writeFile(
  path.join(BOOKS_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

console.log(
  `Wrote manifest: ${withPdfs.length} demo books, ${withPdfs.reduce((n, b) => n + b.chapterPdfs.length, 0)} chapter PDFs`,
);
