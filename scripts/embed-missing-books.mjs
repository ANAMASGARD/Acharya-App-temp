#!/usr/bin/env node
/**
 * Safe incremental embed: refresh manifest from disk, then ingest ONLY missing
 * books/chapters. Never deletes existing Aura data (INGEST_SKIP_EXISTING=true).
 *
 * Use after manually dropping PDFs into books/class-N/english/<slug>/
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./load-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvFile();

function requireEnv(name) {
  if (!process.env[name]?.trim()) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
}

requireEnv("NEO4J_URI");
requireEnv("NEO4J_PASSWORD");
requireEnv("OPENROUTER_API_KEY");
requireEnv("OPENROUTER_EMBEDDING_MODEL");

process.env.INGEST_SKIP_EXISTING = process.env.INGEST_SKIP_EXISTING ?? "true";

console.log("=== Embed missing demo books only (existing Aura data is kept) ===\n");

execSync("node scripts/generate-books-manifest.mjs", { cwd: ROOT, stdio: "inherit" });
console.log("");
execSync("node scripts/ingest-ncert-books.mjs", {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

console.log("\nCheck status: npm run books:status\n");
