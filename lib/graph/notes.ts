import { runWriteQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type { VerificationGap } from "@/types/notes-verification";
import type { ChapterCoverage, GeneratedPaper } from "@/types/question-paper";
import { createHash, randomUUID } from "node:crypto";

type ReportRow = Readonly<{
  verificationId: string;
}>;

export async function saveTeacherChunks(input: {
  clerkId: string;
  verificationId: string;
  chunks: readonly { chunkId: string; text: string; index: number }[];
  sourceFileName: string;
  textHash: string;
}): Promise<void> {
  if (input.chunks.length === 0) {
    return;
  }

  await runWriteQuery(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    WITH t
    UNWIND $chunks AS item
    MERGE (c:Chunk { chunkId: item.chunkId })
    ON CREATE SET c.createdAt = datetime()
    SET c.text = item.text,
        c.source = 'teacher_paper',
        c.index = item.index,
        c.textHash = $textHash,
        c.sourceFileName = $sourceFileName,
        c.updatedAt = datetime()
    MERGE (t)-[:UPLOADED]->(c)
    WITH c
    MATCH (v:VerificationReport { verificationId: $verificationId })
    MERGE (v)-[:CHECKED_AGAINST]->(c)
  `,
    {
      clerkId: input.clerkId,
      verificationId: input.verificationId,
      textHash: input.textHash,
      sourceFileName: input.sourceFileName,
      chunks: input.chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        text: chunk.text,
        index: chunk.index,
      })),
    },
  );
}

export async function linkCurriculumMatches(input: {
  teacherChunkId: string;
  matches: readonly RetrievedChunk[];
}): Promise<void> {
  const top = input.matches.slice(0, 5);

  if (top.length === 0) {
    return;
  }

  await runWriteQuery(
    `
    MATCH (teacher:Chunk { chunkId: $teacherChunkId })
    UNWIND $matches AS m
    MATCH (ref:Chunk { chunkId: m.chunkId })
    MERGE (teacher)-[r:MATCHED_CURRICULUM]->(ref)
    SET r.score = m.finalScore,
        r.updatedAt = datetime()
  `,
    {
      teacherChunkId: input.teacherChunkId,
      matches: top.map((match) => ({
        chunkId: match.chunkId,
        finalScore: match.finalScore,
      })),
    },
  );
}

export async function saveVerificationReport(input: {
  clerkId: string;
  mode: "verify" | "generate";
  classLevel: string;
  subject: string;
  bookIds: readonly string[];
  alignmentScore?: number;
  chapterCoverage?: ChapterCoverage;
  gaps?: readonly VerificationGap[];
  difficultySummary?: string;
  generatedPaper?: GeneratedPaper;
  paperType?: string | null;
  difficulty?: string | null;
  totalMarks?: number | null;
  sourceMime?: string;
  sourceFileName?: string;
  extractionWarning?: string | null;
}): Promise<string> {
  const verificationId = randomUUID();

  const [row] = await runWriteQuery<ReportRow>(
    `
    MERGE (t:Teacher { clerkId: $clerkId })
    ON CREATE SET t.createdAt = datetime()
    CREATE (v:VerificationReport {
      verificationId: $verificationId,
      mode: $mode,
      classLevel: $classLevel,
      subject: $subject,
      bookIds: $bookIds,
      alignmentScore: $alignmentScore,
      chapterCoverage: $chapterCoverage,
      gaps: $gaps,
      difficultySummary: $difficultySummary,
      generatedPaper: $generatedPaper,
      paperType: $paperType,
      difficulty: $difficulty,
      totalMarks: $totalMarks,
      sourceMime: $sourceMime,
      sourceFileName: $sourceFileName,
      extractionWarning: $extractionWarning,
      createdAt: datetime()
    })
    MERGE (t)-[:REQUESTED]->(v)
    RETURN v.verificationId AS verificationId
  `,
    {
      clerkId: input.clerkId,
      verificationId,
      mode: input.mode,
      classLevel: input.classLevel,
      subject: input.subject,
      bookIds: [...input.bookIds],
      alignmentScore: input.alignmentScore ?? null,
      chapterCoverage: input.chapterCoverage
        ? JSON.stringify(input.chapterCoverage)
        : null,
      gaps: input.gaps ? JSON.stringify(input.gaps) : null,
      difficultySummary: input.difficultySummary ?? null,
      generatedPaper: input.generatedPaper
        ? JSON.stringify(input.generatedPaper)
        : null,
      paperType: input.paperType ?? null,
      difficulty: input.difficulty ?? null,
      totalMarks: input.totalMarks ?? null,
      sourceMime: input.sourceMime ?? null,
      sourceFileName: input.sourceFileName ?? null,
      extractionWarning: input.extractionWarning ?? null,
    },
  );

  if (!row) {
    throw new Error("Failed to save VerificationReport");
  }

  return serializeNeo4jValue(row.verificationId) as string;
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
