#!/usr/bin/env node
/**
 * One-shot demo book pipeline:
 *   1. Remove leftover ZIPs
 *   2. Download missing demo PDFs (class 3, 4, 6, etc.)
 *   3. Regenerate manifest from books/demo-books.json
 *   4. Embed + write chunks to Neo4j Aura
 *
 * Usage: npm run books:embed
 */
import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadEnvFile();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`\nMissing ${name} in .env`);
    console.error("Copy .env.example and set Neo4j + OpenRouter keys.\n");
    process.exit(1);
  }
  return value;
}

async function removeZips(dir) {
  let removed = 0;
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
      if (entry.name.toLowerCase().endsWith(".zip")) {
        const { unlink } = await import("node:fs/promises");
        await unlink(full);
        removed += 1;
      }
    }
  }
  await walk(dir);
  return removed;
}

async function main() {
  console.log("=== Acharya demo books → Aura embeddings ===\n");

  requireEnv("NEO4J_URI");
  requireEnv("NEO4J_PASSWORD");
  requireEnv("OPENROUTER_API_KEY");
  requireEnv("OPENROUTER_EMBEDDING_MODEL");

  const booksDir = path.join(ROOT, "books");
  const removed = await removeZips(booksDir);
  if (removed > 0) {
    console.log(`Removed ${removed} ZIP file(s) from books/\n`);
  }

  console.log("Step 1/3 — Download missing demo PDFs (one book per class)…\n");
  execSync("bash scripts/download-ncert-demo-books.sh", {
    cwd: ROOT,
    stdio: "inherit",
  });

  const manifestPath = path.join(booksDir, "manifest.json");
  const { readFile } = await import("node:fs/promises");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bookCount = manifest.books?.length ?? 0;
  const pdfCount = manifest.books?.reduce((n, b) => n + b.chapterPdfs.length, 0) ?? 0;

  if (bookCount === 0) {
    console.error("\nNo PDFs found for demo books. Check books/demo-books.json and downloads.\n");
    process.exit(1);
  }

  console.log(`\nStep 2/3 — Manifest ready: ${bookCount} books, ${pdfCount} PDFs\n`);
  console.log("Step 3/3 — Embed + write to Aura (batched, skips existing chapters)…\n");

  execSync("node scripts/ingest-ncert-books.mjs", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n=== Done. Demo books are in Aura. ===\n");
  console.log("Verify: npm run neo4j:introspect\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
