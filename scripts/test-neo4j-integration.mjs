#!/usr/bin/env node
/**
 * End-to-end AuraDB integration test (secrets stay in .env — never logged).
 * Usage: node scripts/test-neo4j-integration.mjs
 */

import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";

const TEST_CLERK_ID = "acharya_integration_test_user";
const TEST_SESSION_TOPIC = "Integration Test Session";

function pass(label) {
  console.log(`PASS: ${label}`);
}

function fail(label, error) {
  console.error(`FAIL: ${label}`, error instanceof Error ? error.message : error);
  process.exit(1);
}

if (!uri || !password) {
  fail("env", new Error("Missing NEO4J_URI or NEO4J_PASSWORD"));
}

if (!uri.startsWith("neo4j+s://")) {
  fail("uri", new Error("NEO4J_URI must use neo4j+s://"));
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

try {
  await driver.verifyConnectivity();
  pass("AuraDB TLS connectivity (neo4j+s://)");

  const session = driver.session({ database });

  try {
    const constraintResult = await session.executeRead((tx) =>
      tx.run("SHOW CONSTRAINTS YIELD name RETURN count(name) AS constraintCount"),
    );
    const constraintCount = constraintResult.records[0].get("constraintCount").toNumber();
    if (constraintCount < 8) {
      fail(
        "schema constraints",
        new Error(`Expected at least 8 constraints, found ${constraintCount}. Run apply-neo4j-schema.mjs`),
      );
    }
    pass(`Schema constraints present (${constraintCount})`);

    const indexResult = await session.executeRead((tx) =>
      tx.run(
        "SHOW INDEXES YIELD name, type WHERE type = 'VECTOR' RETURN count(name) AS vectorIndexCount",
      ),
    );
    const vectorIndexCount = indexResult.records[0].get("vectorIndexCount").toNumber();
    if (vectorIndexCount < 1) {
      fail("vector index", new Error("chunk_embedding vector index not found"));
    }
    pass("Vector index chunk_embedding exists");

    await session.executeWrite((tx) =>
      tx.run(
        `
        MERGE (t:Teacher { clerkId: $clerkId })
        ON CREATE SET t.createdAt = datetime(), t.email = 'integration@test.acharya'
        ON MATCH SET t.lastSeenAt = datetime()
        `,
        { clerkId: TEST_CLERK_ID },
      ),
    );
    pass("Teacher MERGE (idempotent ingestion)");

    const sessionId = crypto.randomUUID();

    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (t:Teacher { clerkId: $clerkId })
        CREATE (s:Session {
          sessionId: $sessionId,
          topic: $topic,
          subject: 'Mathematics',
          classLevel: 'Class 8',
          recordedAt: datetime(),
          durationSeconds: 42,
          teacherClerkId: $clerkId
        })
        CREATE (t)-[:TAUGHT]->(s)
        RETURN s.sessionId AS sessionId
        `,
        { clerkId: TEST_CLERK_ID, sessionId, topic: TEST_SESSION_TOPIC },
      ),
    );
    pass("Session CREATE with (Teacher)-[:TAUGHT]->(Session)");

    const historyResult = await session.executeRead((tx) =>
      tx.run(
        `
        MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)
        RETURN count(s) AS sessionCount
        `,
        { clerkId: TEST_CLERK_ID },
      ),
    );
    const sessionCount = historyResult.records[0].get("sessionCount").toNumber();
    if (sessionCount < 1) {
      fail("calendar query", new Error("TAUGHT traversal returned no sessions"));
    }
    pass(`Calendar/history graph query (${sessionCount} session(s) for test teacher)`);

    const statsResult = await session.executeRead((tx) =>
      tx.run(`
        RETURN
          count { (n) } AS nodeCount,
          count { ()-[r]->() } AS relCount
      `),
    );
    const nodeCount = statsResult.records[0].get("nodeCount").toNumber();
    const relCount = statsResult.records[0].get("relCount").toNumber();
    pass(`Graph stats — nodes: ${nodeCount}, relationships: ${relCount}`);

    await session.executeWrite((tx) =>
      tx.run(
        `
        MATCH (t:Teacher { clerkId: $clerkId })-[:TAUGHT]->(s:Session)
        DETACH DELETE s
        WITH t
        DETACH DELETE t
        `,
        { clerkId: TEST_CLERK_ID },
      ),
    );
    pass("Test data cleaned up");
  } finally {
    await session.close();
  }

  console.log("\nAll AuraDB integration tests passed.");
} catch (error) {
  fail("integration", error);
} finally {
  await driver.close();
}
