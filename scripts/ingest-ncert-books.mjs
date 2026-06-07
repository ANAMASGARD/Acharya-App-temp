#!/usr/bin/env node
/**
 * Ingest books/manifest.json into Neo4j Aura: CurriculumBook → Chapter → Chunk + embeddings.
 *
 * Speed knobs (env):
 *   INGEST_EMBED_BATCH_SIZE=64     — texts per OpenRouter embedding call (default 64)
 *   INGEST_WRITE_BATCH_SIZE=100    — chunks per Neo4j UNWIND write (default 100)
 *   INGEST_PARSE_CONCURRENCY=6     — parallel PDF parses per book (default 6)
 *   INGEST_SKIP_EXISTING=true      — skip books/chapters already in Aura (default true)
 *
 * Requires: NEO4J_*, OPENROUTER_API_KEY, OPENROUTER_EMBEDDING_MODEL in .env
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

const { PDFParse } = await import("pdf-parse");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadEnvFile();

const CHUNK_CHARS = 2000;
const OVERLAP = 200;
const EMBED_BATCH_SIZE = Number(process.env.INGEST_EMBED_BATCH_SIZE ?? 64);
const WRITE_BATCH_SIZE = Number(process.env.INGEST_WRITE_BATCH_SIZE ?? 100);
const PARSE_CONCURRENCY = Number(process.env.INGEST_PARSE_CONCURRENCY ?? 6);
const SKIP_EXISTING = process.env.INGEST_SKIP_EXISTING !== "false";

function chunkText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= CHUNK_CHARS) return [normalized];
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_CHARS, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = Math.max(0, end - OVERLAP);
  }
  return chunks;
}

async function embedTextsBatch(texts) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_EMBEDDING_MODEL;
  if (!apiKey || !model) {
    throw new Error("Set OPENROUTER_API_KEY and OPENROUTER_EMBEDDING_MODEL in .env");
  }
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: texts }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Embedding failed ${response.status}`);
  }
  return payload.data.map((row) => row.embedding);
}

/** Embed many texts with batched API calls. */
async function embedAll(texts) {
  const vectors = new Array(texts.length);
  for (let offset = 0; offset < texts.length; offset += EMBED_BATCH_SIZE) {
    const slice = texts.slice(offset, offset + EMBED_BATCH_SIZE);
    const batch = await embedTextsBatch(slice);
    for (let i = 0; i < batch.length; i++) {
      vectors[offset + i] = batch[i];
    }
    process.stdout.write(
      `\r  Embeddings: ${Math.min(offset + slice.length, texts.length)}/${texts.length}`,
    );
  }
  process.stdout.write("\n");
  return vectors;
}

function chapterTitleFromPdf(fileName) {
  const base = fileName.replace(/\.pdf$/i, "");
  return `Chapter ${base.slice(-2) || base}`;
}

async function parsePdf(pdfPath) {
  const pdfBuffer = await readFile(pdfPath);
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const parsed = await parser.getText();
    return parsed.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** bookId → { chapters, chunks } for skip-existing checks */
async function loadAuraBookStats(session) {
  const result = await session.run(`
    MATCH (b:CurriculumBook)
    OPTIONAL MATCH (ch:Chapter)-[:PART_OF]->(b)
    OPTIONAL MATCH (c:Chunk)-[:IN_CHAPTER]->(ch)
    RETURN b.bookId AS bookId,
           count(DISTINCT ch) AS chapters,
           count(DISTINCT c) AS chunks
  `);
  return new Map(
    result.records.map((r) => [
      r.get("bookId"),
      {
        chapters: r.get("chapters").toNumber(),
        chunks: r.get("chunks").toNumber(),
      },
    ]),
  );
}

function isBookFullyIngested(auraStats, bookId, expectedChapters) {
  const stats = auraStats.get(bookId);
  return (
    stats !== undefined &&
    stats.chapters >= expectedChapters &&
    stats.chunks > 0
  );
}

async function chapterHasChunks(session, chapterId) {
  const result = await session.run(
    `
    MATCH (ch:Chapter { chapterId: $chapterId })-[:PART_OF]->(:CurriculumBook)
    MATCH (c:Chunk)-[:IN_CHAPTER]->(ch)
    RETURN count(c) AS n LIMIT 1
  `,
    { chapterId },
  );
  const count = result.records[0]?.get("n");
  return count && count.toNumber() > 0;
}

async function writeChapters(session, bookId, chapters) {
  if (chapters.length === 0) return;

  await session.executeWrite(async (tx) => {
    await tx.run(
      `
      UNWIND $chapters AS row
      MATCH (b:CurriculumBook { bookId: $bookId })
      MERGE (ch:Chapter { chapterId: row.chapterId })
      SET ch.title = row.chapterTitle,
          ch.index = row.chapterIndex,
          ch.pdfFileName = row.pdfFileName,
          ch.updatedAt = datetime()
      MERGE (ch)-[:PART_OF]->(b)
    `,
      {
        bookId,
        chapters: chapters.map((ch) => ({
          chapterId: ch.chapterId,
          chapterTitle: ch.chapterTitle,
          chapterIndex: ch.chapterIndex,
          pdfFileName: ch.pdfFileName,
        })),
      },
    );
  });
}

async function writeChunkBatch(session, rows, embeddingModel) {
  await session.executeWrite(async (tx) => {
    await tx.run(
      `
      UNWIND $rows AS row
      MATCH (ch:Chapter { chapterId: row.chapterId })
      MERGE (c:Chunk { chunkId: row.chunkId })
      SET c.text = row.text,
          c.source = 'curriculum',
          c.embedding = row.embedding,
          c.embeddingModel = $embeddingModel,
          c.index = row.index,
          c.updatedAt = datetime()
      MERGE (c)-[:IN_CHAPTER]->(ch)
    `,
      { rows, embeddingModel },
    );
  });
}

async function main() {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const embeddingModel = process.env.OPENROUTER_EMBEDDING_MODEL;

  if (!uri?.startsWith("neo4j+s://") || !password) {
    throw new Error("Configure NEO4J_URI (neo4j+s://) and NEO4J_PASSWORD in .env");
  }
  if (!embeddingModel) {
    throw new Error("Set OPENROUTER_EMBEDDING_MODEL in .env (run: node scripts/aura-introspect.mjs)");
  }

  console.log(
    `Ingest config: embedBatch=${EMBED_BATCH_SIZE} writeBatch=${WRITE_BATCH_SIZE} parseConcurrency=${PARSE_CONCURRENCY} skipExisting=${SKIP_EXISTING}`,
  );

  const manifestPath = path.join(ROOT, "books", "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database });

  let totalChunks = 0;
  let skippedChapters = 0;
  let skippedBooks = 0;

  try {
    const auraStats = SKIP_EXISTING
      ? await loadAuraBookStats(session)
      : new Map();

    for (const book of manifest.books) {
      if (book.chapterPdfs.length === 0) {
        console.log(`Skip (no PDFs): ${book.bookId}`);
        continue;
      }

      if (
        SKIP_EXISTING &&
        isBookFullyIngested(auraStats, book.bookId, book.chapterPdfs.length)
      ) {
        const stats = auraStats.get(book.bookId);
        console.log(
          `\nSkip (already in Aura): ${book.bookId} — ${stats.chapters} chapters, ${stats.chunks} chunks`,
        );
        skippedBooks += 1;
        skippedChapters += book.chapterPdfs.length;
        continue;
      }

      console.log(`\nIngesting ${book.bookId} (${book.chapterPdfs.length} chapters)`);

      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MERGE (b:CurriculumBook { bookId: $bookId })
          SET b.title = $title,
              b.classLevel = $classLevel,
              b.subject = $subject,
              b.source = 'ncert',
              b.isPreloaded = true,
              b.slug = $slug,
              b.zipCode = $zipCode,
              b.updatedAt = datetime()
        `,
          {
            bookId: book.bookId,
            title: book.title,
            classLevel: book.classLevel,
            subject: book.subject,
            slug: book.slug,
            zipCode: book.zipCode,
          },
        );
      });

      const chapterMeta = book.chapterPdfs.map((chapterPdf, chapterIndex) => ({
        chapterPdf,
        chapterIndex: chapterIndex + 1,
        chapterId: `${book.bookId}-ch-${chapterIndex + 1}`,
        chapterTitle: chapterTitleFromPdf(chapterPdf.fileName),
        pdfPath: path.join(ROOT, "books", chapterPdf.relativePath),
      }));

      const toProcess = [];
      for (const meta of chapterMeta) {
        if (SKIP_EXISTING && (await chapterHasChunks(session, meta.chapterId))) {
          skippedChapters += 1;
          continue;
        }
        toProcess.push(meta);
      }

      if (toProcess.length === 0) {
        console.log("  All chapters already ingested — skip");
        continue;
      }

      console.log(`  Parsing ${toProcess.length} PDFs (${PARSE_CONCURRENCY} at a time)…`);
      const parsed = await mapConcurrent(toProcess, PARSE_CONCURRENCY, async (meta) => {
        const fullText = await parsePdf(meta.pdfPath);
        return { ...meta, textChunks: chunkText(fullText) };
      });

      const withText = parsed.filter((row) => row.textChunks.length > 0);
      const emptyCount = parsed.length - withText.length;
      if (emptyCount > 0) {
        console.log(`  Skipped ${emptyCount} empty PDFs`);
      }

      await writeChapters(
        session,
        book.bookId,
        withText.map((row) => ({
          chapterId: row.chapterId,
          chapterTitle: row.chapterTitle,
          chapterIndex: row.chapterIndex,
          pdfFileName: row.chapterPdf.fileName,
        })),
      );

      const flatChunks = [];
      for (const row of withText) {
        for (let i = 0; i < row.textChunks.length; i++) {
          flatChunks.push({
            chapterId: row.chapterId,
            chunkId: `${row.chapterId}-chunk-${i}`,
            text: row.textChunks[i],
            index: i,
          });
        }
      }

      if (flatChunks.length === 0) {
        console.log("  No text chunks to embed");
        continue;
      }

      console.log(`  Embedding ${flatChunks.length} chunks…`);
      const embeddings = await embedAll(flatChunks.map((c) => c.text));

      console.log(`  Writing ${flatChunks.length} chunks to Aura…`);
      for (let offset = 0; offset < flatChunks.length; offset += WRITE_BATCH_SIZE) {
        const slice = flatChunks.slice(offset, offset + WRITE_BATCH_SIZE);
        const rows = slice.map((chunk, i) => ({
          chapterId: chunk.chapterId,
          chunkId: chunk.chunkId,
          text: chunk.text,
          index: chunk.index,
          embedding: embeddings[offset + i],
        }));
        await writeChunkBatch(session, rows, embeddingModel);
        totalChunks += slice.length;
      }

      console.log(`  Done: ${flatChunks.length} chunks for ${withText.length} chapters`);
    }
  } finally {
    await session.close();
    await driver.close();
  }

  console.log(
    `\nDone. Chunks written: ${totalChunks}. Books skipped: ${skippedBooks}. Chapters skipped: ${skippedChapters}.`,
  );
  if (totalChunks === 0 && skippedBooks > 0) {
    console.log("All manifest books are already in Aura — nothing to do.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
