#!/usr/bin/env node
import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE ?? "neo4j";

  if (!uri?.startsWith("neo4j+s://") || !password) {
    throw new Error("Configure NEO4J_URI and NEO4J_PASSWORD in .env");
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database });

  try {
    const books = await session.run(
      "MATCH (b:CurriculumBook) RETURN b LIMIT 5",
    );
    console.log("Sample CurriculumBook nodes:");
    for (const record of books.records) {
      console.log(record.get("b").properties);
    }

    const chunkKeys = await session.run(
      "MATCH (c:Chunk) RETURN keys(c) AS keys LIMIT 1",
    );
    console.log("\nChunk property keys:", chunkKeys.records[0]?.get("keys"));

    const embeddingModel = await session.run(
      "MATCH (c:Chunk) WHERE c.embeddingModel IS NOT NULL RETURN DISTINCT c.embeddingModel AS model LIMIT 5",
    );
    console.log("\nEmbedding models in Aura:");
    for (const record of embeddingModel.records) {
      console.log(" -", record.get("model"));
    }

    const dim = await session.run(
      "MATCH (c:Chunk) WHERE c.embedding IS NOT NULL RETURN size(c.embedding) AS dim LIMIT 1",
    );
    console.log("\nEmbedding dimension:", dim.records[0]?.get("dim"));

    const indexes = await session.run("SHOW INDEXES");
    console.log("\nIndexes:");
    for (const record of indexes.records) {
      const name = record.get("name");
      const type = record.get("type");
      if (String(type).toLowerCase().includes("vector") || String(name).includes("embedding")) {
        console.log(record.toObject());
      }
    }

    const englishCounts = await session.run(
      `
      MATCH (b:CurriculumBook { subject: 'english' })
      OPTIONAL MATCH (ch:Chapter)-[:PART_OF]->(b)
      RETURN b.classLevel AS classLevel, b.title AS title, count(ch) AS chapters
      ORDER BY b.classLevel
    `,
    );
    console.log("\nEnglish books in Aura:");
    for (const record of englishCounts.records) {
      console.log(
        ` ${record.get("classLevel")} | ${record.get("title")} | ${record.get("chapters")} chapters`,
      );
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
