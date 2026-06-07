#!/usr/bin/env node
/**
 * Compare demo books (books/demo-books.json + manifest) vs Neo4j Aura.
 * Usage: npm run books:status
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadEnvFile();

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE ?? "neo4j";

  if (!uri?.startsWith("neo4j+s://") || !password) {
    throw new Error("Configure NEO4J_URI and NEO4J_PASSWORD in .env");
  }

  const demoConfig = JSON.parse(
    await readFile(path.join(ROOT, "books", "demo-books.json"), "utf8"),
  );

  let manifestBooks = [];
  try {
    const manifest = JSON.parse(
      await readFile(path.join(ROOT, "books", "manifest.json"), "utf8"),
    );
    manifestBooks = manifest.books ?? [];
  } catch {
    console.log("No manifest.json — run: npm run books:manifest\n");
  }

  const manifestById = new Map(manifestBooks.map((b) => [b.bookId, b]));

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database });

  try {
    const aura = await session.run(`
      MATCH (b:CurriculumBook)
      OPTIONAL MATCH (ch:Chapter)-[:PART_OF]->(b)
      OPTIONAL MATCH (c:Chunk)-[:IN_CHAPTER]->(ch)
      RETURN b.bookId AS bookId, b.title AS title, b.classLevel AS classLevel,
             b.subject AS subject,
             count(DISTINCT ch) AS chapters, count(DISTINCT c) AS chunks
      ORDER BY b.classLevel, b.subject, b.title
    `);

    const auraMap = new Map(
      aura.records.map((r) => [
        r.get("bookId"),
        {
          title: r.get("title"),
          classLevel: r.get("classLevel"),
          chapters: r.get("chapters").toNumber(),
          chunks: r.get("chunks").toNumber(),
        },
      ]),
    );

    const total = await session.run(
      `MATCH (c:Chunk { source: 'curriculum' }) RETURN count(c) AS n`,
    );
    const dim = await session.run(
      `MATCH (c:Chunk) WHERE c.embedding IS NOT NULL RETURN size(c.embedding) AS dim LIMIT 1`,
    );
    const model = await session.run(
      `MATCH (c:Chunk) WHERE c.embeddingModel IS NOT NULL RETURN DISTINCT c.embeddingModel AS model`,
    );

    console.log("=== Acharya demo books — embedding status ===\n");
    console.log(
      "Embedding:",
      model.records.map((r) => r.get("model")).join(", ") || "(none)",
    );
    console.log(
      "Vector dimension:",
      dim.records[0]?.get("dim")?.toString() ?? "unknown",
    );
    console.log(
      "Total curriculum chunks in Aura:",
      total.records[0].get("n").toString(),
      "\n",
    );

    let complete = 0;
    let partial = 0;
    let missingPdf = 0;
    let missingAura = 0;

    function demoBookId(meta) {
      const classLevel = `class-${meta.classNum}`;
      const subject = meta.subject ?? "english";
      return `ncert-${subject}-${classLevel}-${meta.slug}`;
    }

    console.log("Demo books (one per class):");
    console.log(
      "STATUS     | CLASS    | SUBJECT  | BOOK              | PDFs | Aura ch | Chunks",
    );
    console.log(
      "-----------+----------+----------+-------------------+------+---------+-------",
    );

    for (const meta of demoConfig.books) {
      const classLevel = `class-${meta.classNum}`;
      const subject = meta.subject ?? "english";
      const bookId = demoBookId(meta);
      const manifest = manifestById.get(bookId);
      const pdfCount = manifest?.chapterPdfs?.length ?? 0;
      const inAura = auraMap.get(bookId);

      let status;
      if (pdfCount === 0) {
        status = "NO PDF";
        missingPdf += 1;
      } else if (!inAura || inAura.chapters === 0) {
        status = "NOT IN DB";
        missingAura += 1;
      } else if (inAura.chapters >= pdfCount && inAura.chunks > 0) {
        status = "COMPLETE";
        complete += 1;
      } else {
        status = "PARTIAL";
        partial += 1;
      }

      const pad = (s, n) => String(s).padEnd(n);
      console.log(
        `${pad(status, 10)} | ${pad(classLevel, 8)} | ${pad(subject, 8)} | ${pad(meta.title, 17)} | ${pad(pdfCount, 4)} | ${pad(inAura?.chapters ?? 0, 7)} | ${inAura?.chunks ?? 0}`,
      );
    }

    const demoIds = new Set(demoConfig.books.map((m) => demoBookId(m)));
    const extras = aura.records.filter((r) => !demoIds.has(r.get("bookId")));

    if (extras.length > 0) {
      console.log("\nExtra books in Aura (from earlier full ingest — safe to ignore for demo):");
      for (const r of extras) {
        console.log(
          `  ${r.get("classLevel")} | ${r.get("title")} | ${r.get("chapters").toNumber()} chapters | ${r.get("chunks").toNumber()} chunks`,
        );
      }
    }

    console.log("\n--- Summary ---");
    console.log(`  Complete:  ${complete} / ${demoConfig.books.length} demo slots`);
    console.log(`  Partial:   ${partial}`);
    console.log(`  No PDF:    ${missingPdf} (add PDFs to books/ then npm run books:embed)`);
    console.log(`  Not in DB: ${missingAura}`);

    if (complete === manifestBooks.length && missingPdf === 0 && partial === 0) {
      console.log("\n✓ All demo books with PDFs are fully embedded. Step complete.");
      console.log("  Re-run npm run books:embed — it will skip everything (fast).");
    } else if (missingPdf > 0) {
      console.log(
        `\n○ Add missing PDFs under books/class-N/<subject>/<slug>/ then: npm run books:embed-missing`,
      );
    } else {
      console.log("\n○ Run: npm run books:embed  to finish missing/partial books.");
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
