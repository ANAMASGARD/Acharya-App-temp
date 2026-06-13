#!/usr/bin/env node
/**
 * Live test for Phase 3 question-paper weightage verification.
 *  1) Runs the getChapterWeights Cypher against Aura for a real embedded book
 *     and asserts chapters + chunk counts come back.
 *  2) Exercises a JS replica of computeWeightage (lib/rag/weightage.ts) and
 *     asserts the even-split target, status thresholds, out-of-syllabus
 *     handling, and balance score.
 *
 * Usage: node scripts/test-weightage.mjs
 */

import neo4j from "neo4j-driver";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

if (!uri || !password) fail("Missing NEO4J_URI / NEO4J_PASSWORD in .env");

// --- JS replica of lib/rag/weightage.ts computeWeightage (keep in sync) ---
function round(v) {
  return Math.round(v * 10) / 10;
}
function computeWeightage({ questions, chapters }) {
  if (chapters.length === 0) return null;
  const valid = questions.filter((q) => Number.isFinite(q.marks) && q.marks > 0);
  if (valid.length === 0) return null;
  const totalMarks = valid.reduce((s, q) => s + q.marks, 0);
  const expectedPct = 100 / chapters.length;
  const keys = new Set(chapters.map((c) => c.title.trim().toLowerCase()));
  const byChapter = new Map();
  let oos = 0;
  for (const q of valid) {
    const k = q.chapter.trim().toLowerCase();
    if (keys.has(k)) byChapter.set(k, (byChapter.get(k) ?? 0) + q.marks);
    else oos += q.marks;
  }
  const tol = Math.max(5, expectedPct * 0.4);
  const chapterReports = chapters.map((c) => {
    const marks = byChapter.get(c.title.trim().toLowerCase()) ?? 0;
    const actualPct = (marks / totalMarks) * 100;
    const delta = actualPct - expectedPct;
    let status;
    if (marks <= 0) status = "missing";
    else if (Math.abs(delta) <= tol) status = "aligned";
    else status = delta > 0 ? "over" : "under";
    return { chapterTitle: c.title, expectedPct: round(expectedPct), actualPct: round(actualPct), marks, delta: round(delta), status };
  });
  const oosPct = (oos / totalMarks) * 100;
  const totalDeviation =
    chapterReports.reduce((s, c) => s + Math.abs(c.expectedPct - c.actualPct), 0) + oosPct;
  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - 0.5 * totalDeviation)));
  return { totalMarks, balanceScore, chapters: chapterReports, outOfSyllabusMarks: oos, outOfSyllabusPct: round(oosPct), contentInsight: null };
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
const session = driver.session({ database });

try {
  console.log("1. Finding an embedded book + running getChapterWeights Cypher...");
  const bookRes = await session.executeRead((tx) =>
    tx.run(
      `MATCH (chunk:Chunk)-[:IN_CHAPTER]->(:Chapter)-[:PART_OF]->(b:CurriculumBook)
       RETURN b.bookId AS bookId, count(chunk) AS c ORDER BY c DESC LIMIT 1`,
    ),
  );
  if (bookRes.records.length === 0) fail("No embedded curriculum book found in Aura");
  const bookId = bookRes.records[0].get("bookId");

  const weightsRes = await session.executeRead((tx) =>
    tx.run(
      `MATCH (chunk:Chunk)-[:IN_CHAPTER]->(ch:Chapter)-[:PART_OF]->(book:CurriculumBook)
       WHERE book.bookId IN $bookIds AND ($chapterIds IS NULL OR ch.chapterId IN $chapterIds)
       WITH ch, count(chunk) AS chunkCount
       RETURN ch.chapterId AS chapterId, coalesce(ch.title, ch.chapterId) AS title,
              coalesce(ch.index, 0) AS index, chunkCount
       ORDER BY index ASC, title ASC`,
      { bookIds: [bookId], chapterIds: null },
    ),
  );
  const chapters = weightsRes.records.map((r) => ({
    chapterId: r.get("chapterId"),
    title: String(r.get("title")),
    index: r.get("index")?.toNumber?.() ?? Number(r.get("index")),
    chunkCount: r.get("chunkCount")?.toNumber?.() ?? Number(r.get("chunkCount")),
  }));
  assert(chapters.length > 0, "getChapterWeights returned no chapters");
  assert(chapters.every((c) => c.chunkCount > 0), "a chapter had 0 chunks");
  console.log(`   book ${bookId}: ${chapters.length} chapters, e.g. "${chapters[0].title}" (${chapters[0].chunkCount} chunks)`);

  console.log("2. Testing computeWeightage math...");
  const synthChapters = [
    { chapterId: "a", title: "Chapter A", index: 1, chunkCount: 10 },
    { chapterId: "b", title: "Chapter B", index: 2, chunkCount: 10 },
    { chapterId: "c", title: "Chapter C", index: 3, chunkCount: 10 },
  ];
  const report = computeWeightage({
    chapters: synthChapters,
    questions: [
      { marks: 5, chapter: "Chapter A" },
      { marks: 3, chapter: "Chapter B" },
      { marks: 2, chapter: "Something not in syllabus" },
    ],
  });
  assert(report !== null, "computeWeightage returned null for valid input");
  assert(report.totalMarks === 10, `totalMarks expected 10, got ${report.totalMarks}`);
  const a = report.chapters.find((c) => c.chapterTitle === "Chapter A");
  const c = report.chapters.find((c) => c.chapterTitle === "Chapter C");
  assert(a.status === "over", `Chapter A should be over, got ${a.status}`);
  assert(c.status === "missing", `Chapter C should be missing, got ${c.status}`);
  assert(report.outOfSyllabusMarks === 2, `OOS marks expected 2, got ${report.outOfSyllabusMarks}`);
  assert(report.balanceScore >= 0 && report.balanceScore <= 100, "balanceScore out of range");
  const sumPct = report.chapters.reduce((s, x) => s + x.actualPct, 0) + report.outOfSyllabusPct;
  assert(Math.abs(sumPct - 100) < 0.5, `actual percentages should sum ~100, got ${sumPct}`);
  console.log(`   balanceScore=${report.balanceScore}, A=${a.actualPct}% (over), C=missing, OOS=${report.outOfSyllabusPct}%`);

  console.log("\nPASS: getChapterWeights Cypher + computeWeightage math both verified.");
} finally {
  await session.close();
  await driver.close();
}
