#!/usr/bin/env node
/**
 * Verify Neo4j Aura connectivity and schema readiness.
 * Usage: node scripts/verify-neo4j.mjs
 * Loads .env automatically — secrets are never printed.
 */

import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";

if (!uri || !password) {
  console.error("Missing NEO4J_URI or NEO4J_PASSWORD");
  process.exit(1);
}

if (!uri.startsWith("neo4j+s://")) {
  console.error("NEO4J_URI must use neo4j+s:// (AuraDB)");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

try {
  await driver.verifyConnectivity();
  const session = driver.session({ database });
  const result = await session.executeRead((tx) =>
    tx.run(`
      RETURN
        1 AS ok,
        count { (n) } AS nodeCount,
        count { ()-[r]->() } AS relCount
    `),
  );
  await session.close();

  const record = result.records[0];
  console.log("AuraDB connection: OK");
  console.log("Nodes:", record.get("nodeCount").toNumber());
  console.log("Relationships:", record.get("relCount").toNumber());
} catch (error) {
  console.error("AuraDB connection failed:", error);
  process.exit(1);
} finally {
  await driver.close();
}
