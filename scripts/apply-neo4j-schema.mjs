#!/usr/bin/env node
/**
 * Apply neo4j/schema.cypher to AuraDB (no cypher-shell required).
 * Usage: node scripts/apply-neo4j-schema.mjs
 */

import fs from "node:fs";
import path from "node:path";
import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";

if (!uri || !password) {
  console.error("FAIL: Missing NEO4J_URI or NEO4J_PASSWORD in .env");
  process.exit(1);
}

if (!uri.startsWith("neo4j+s://")) {
  console.error("FAIL: NEO4J_URI must use neo4j+s:// (AuraDB)");
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "neo4j", "schema.cypher");
const schema = fs.readFileSync(schemaPath, "utf8");

const statements = schema
  .split(";")
  .map((statement) =>
    statement
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

try {
  await driver.verifyConnectivity();
  console.log("AuraDB connectivity: OK");

  const session = driver.session({ database });

  try {
    for (const statement of statements) {
      const label = statement.split("\n")[0].slice(0, 60);
      await session.executeWrite((tx) => tx.run(statement));
      console.log(`Applied: ${label}…`);
    }
  } finally {
    await session.close();
  }

  console.log(`Schema applied: ${statements.length} statements`);
} catch (error) {
  console.error("FAIL: Schema apply error:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await driver.close();
}
