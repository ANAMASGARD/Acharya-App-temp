#!/usr/bin/env node
/**
 * Test lib/neo4j.ts helpers (same code path as API routes).
 * Usage: node scripts/test-neo4j-api-layer.mjs
 */

import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const { verifyNeo4jConnection, runReadQuery, closeNeo4jDriver } = await import(
  "../lib/neo4j.ts"
);

try {
  await verifyNeo4jConnection();
  console.log("PASS: lib/neo4j.ts verifyNeo4jConnection()");

  const [stats] = await runReadQuery(`
    RETURN
      1 AS ok,
      count { (n) } AS nodeCount,
      count { ()-[r]->() } AS relCount
  `);

  console.log(
    `PASS: lib/neo4j.ts runReadQuery() — nodes: ${stats?.nodeCount ?? 0}, rels: ${stats?.relCount ?? 0}`,
  );

  if (!stats?.ok) {
    console.error("FAIL: health query returned no ok row");
    process.exit(1);
  }

  console.log(
    `PASS: health/neo4j query — status=ok, nodes=${stats?.nodeCount ?? 0}, rels=${stats?.relCount ?? 0}`,
  );
  console.log("\nApp API layer + AuraDB integration verified.");
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await closeNeo4jDriver();
}
