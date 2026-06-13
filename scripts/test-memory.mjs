#!/usr/bin/env node
/**
 * Live test for graph-native agent memory (Phase 1).
 * Mirrors lib/graph/memory.ts Cypher against Aura: store a Memory, then recall
 * it via the memory_embedding vector index, then clean up the test data.
 *
 * Usage: node scripts/test-memory.mjs
 */

import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";
const orKey = process.env.OPENROUTER_API_KEY;
const orModel = process.env.OPENROUTER_EMBEDDING_MODEL;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!uri || !password) fail("Missing NEO4J_URI / NEO4J_PASSWORD in .env");
if (!orKey || !orModel) fail("Missing OPENROUTER_API_KEY / OPENROUTER_EMBEDDING_MODEL in .env");

async function embed(text) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: orModel, input: [text] }),
  });
  if (!res.ok) fail(`Embedding request failed (${res.status})`);
  const json = await res.json();
  return json.data[0].embedding;
}

const TEST_CLERK = `test-memory-${Date.now()}`;
const FACT = "Teaches Class 6 Science and struggles to keep large classes engaged";

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
const session = driver.session({ database });

try {
  console.log("1. Embedding + storing a Memory node...");
  const factEmbedding = await embed(FACT);
  await session.executeWrite((tx) =>
    tx.run(
      `
      MERGE (t:Teacher { clerkId: $clerkId }) ON CREATE SET t.createdAt = datetime()
      MERGE (m:Memory { clerkId: $clerkId, normText: $normText })
        ON CREATE SET m.memoryId = $memoryId, m.text = $text, m.kind = 'subject',
                      m.embedding = $embedding, m.createdAt = datetime()
      MERGE (t)-[:HAS_MEMORY]->(m)
      `,
      {
        clerkId: TEST_CLERK,
        normText: FACT.toLowerCase(),
        memoryId: crypto.randomUUID(),
        text: FACT,
        embedding: factEmbedding,
      },
    ),
  );

  console.log("2. Recalling with a related query via memory_embedding index...");
  const queryEmbedding = await embed("How do I handle a big noisy science class?");
  const result = await session.executeRead((tx) =>
    tx.run(
      `
      CALL db.index.vector.queryNodes('memory_embedding', $topK, $embedding)
      YIELD node AS m, score
      WHERE m.clerkId = $clerkId
      RETURN m.text AS text, score ORDER BY score DESC LIMIT 6
      `,
      { topK: 25, embedding: queryEmbedding, clerkId: TEST_CLERK },
    ),
  );

  const hit = result.records.find((r) => r.get("text") === FACT);
  if (!hit) fail("Stored memory was NOT recalled via the vector index");
  console.log(`   recalled: "${hit.get("text")}" (score ${hit.get("score").toFixed(4)})`);

  console.log("3. Cleaning up test data...");
  await session.executeWrite((tx) =>
    tx.run(
      `MATCH (t:Teacher { clerkId: $clerkId }) OPTIONAL MATCH (t)-[:HAS_MEMORY]->(m:Memory) DETACH DELETE t, m`,
      { clerkId: TEST_CLERK },
    ),
  );

  console.log("\nPASS: memory store + vector recall + cleanup all succeeded.");
} finally {
  await session.close();
  await driver.close();
}
