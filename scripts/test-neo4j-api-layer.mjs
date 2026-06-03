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

  const { GET } = await import("../app/api/health/neo4j+api.ts");
  const response = await GET();
  const body = await response.json();

  if (body.status !== "ok" || !body.connected) {
    console.error("FAIL: GET /api/health/neo4j", body);
    process.exit(1);
  }

  console.log(
    `PASS: GET /api/health/neo4j — status=${body.status}, nodes=${body.nodeCount}, rels=${body.relCount}`,
  );
  console.log("\nApp API layer + AuraDB integration verified.");
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await closeNeo4jDriver();
}
