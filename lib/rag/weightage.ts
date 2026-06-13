import type {
  ChapterWeight,
  QuestionAttribution,
  WeightageChapter,
  WeightageReport,
  WeightageStatus,
} from "@/types/question-paper";

/**
 * Deterministic per-chapter weightage analysis for an uploaded question paper.
 *
 * The "expected" target is an EVEN split across the in-scope chapters (the
 * teacher's mental model: "5 chapters in a half-yearly -> ~20% each"). The
 * actual distribution comes from the LLM's per-question {marks, chapter}
 * attribution. All percentage math lives here (not in the LLM) so the result is
 * stable and explainable. A graph-derived content-depth insight (chunk counts)
 * is surfaced separately as guidance, without changing the even-split target.
 */

/** Marker the verify prompt uses for questions outside the selected scope. */
export const OUT_OF_SYLLABUS = "Out of syllabus";

const ALIGNMENT_TOLERANCE_FLOOR = 5;
const ALIGNMENT_TOLERANCE_FACTOR = 0.4;
/** A chapter is "heaviest" worth surfacing only if it exceeds even share by this. */
const CONTENT_INSIGHT_MIN_LEAD = 1.25;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function normalizeChapterKey(value: string): string {
  return value.trim().toLowerCase();
}

function statusFor(delta: number, marks: number, tolerance: number): WeightageStatus {
  if (marks <= 0) {
    return "missing";
  }
  if (Math.abs(delta) <= tolerance) {
    return "aligned";
  }
  return delta > 0 ? "over" : "under";
}

/**
 * Build a content-depth hint from the graph chunk counts. Returns null when the
 * heaviest chapter is not meaningfully heavier than an even share (nothing
 * useful to say) or when there are too few chapters to compare.
 */
function buildContentInsight(chapters: readonly ChapterWeight[]): string | null {
  if (chapters.length < 2) {
    return null;
  }

  const totalChunks = chapters.reduce((sum, chapter) => sum + chapter.chunkCount, 0);

  if (totalChunks <= 0) {
    return null;
  }

  const heaviest = chapters.reduce((max, chapter) =>
    chapter.chunkCount > max.chunkCount ? chapter : max,
  );

  const evenShare = totalChunks / chapters.length;

  if (heaviest.chunkCount < evenShare * CONTENT_INSIGHT_MIN_LEAD) {
    return null;
  }

  const sharePct = round((heaviest.chunkCount / totalChunks) * 100);

  return `By NCERT content depth, "${heaviest.title}" is the heaviest chapter (about ${sharePct}% of the syllabus content) — consider giving it more marks.`;
}

export function computeWeightage(input: {
  questions: readonly QuestionAttribution[];
  chapters: readonly ChapterWeight[];
}): WeightageReport | null {
  const { chapters } = input;

  // Without an in-scope chapter list there is nothing to compare against.
  if (chapters.length === 0) {
    return null;
  }

  const questions = input.questions.filter(
    (question) => Number.isFinite(question.marks) && question.marks > 0,
  );

  // No usable marks extracted from the paper -> let the caller fall back to the
  // existing alignment/coverage result without a weightage block.
  if (questions.length === 0) {
    return null;
  }

  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  const expectedPct = 100 / chapters.length;

  const chapterKeys = new Set(chapters.map((chapter) => normalizeChapterKey(chapter.title)));

  // Sum marks per chapter; anything not matching a known chapter is out of syllabus.
  const marksByChapter = new Map<string, number>();
  let outOfSyllabusMarks = 0;

  for (const question of questions) {
    const key = normalizeChapterKey(question.chapter);

    if (chapterKeys.has(key)) {
      marksByChapter.set(key, (marksByChapter.get(key) ?? 0) + question.marks);
    } else {
      outOfSyllabusMarks += question.marks;
    }
  }

  const tolerance = Math.max(ALIGNMENT_TOLERANCE_FLOOR, expectedPct * ALIGNMENT_TOLERANCE_FACTOR);

  const chapterReports: WeightageChapter[] = chapters.map((chapter) => {
    const marks = marksByChapter.get(normalizeChapterKey(chapter.title)) ?? 0;
    const actualPct = clampPct((marks / totalMarks) * 100);
    const delta = actualPct - expectedPct;

    return {
      chapterTitle: chapter.title,
      expectedPct: round(expectedPct),
      actualPct: round(actualPct),
      marks,
      delta: round(delta),
      status: statusFor(delta, marks, tolerance),
    };
  });

  const outOfSyllabusPct = clampPct((outOfSyllabusMarks / totalMarks) * 100);

  // Balance score: complement of total-variation distance between the actual
  // distribution (chapters + out-of-syllabus bucket) and the even-split target.
  const totalDeviation =
    chapterReports.reduce(
      (sum, chapter) => sum + Math.abs(chapter.expectedPct - chapter.actualPct),
      0,
    ) + outOfSyllabusPct;

  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - 0.5 * totalDeviation)));

  return {
    totalMarks,
    balanceScore,
    chapters: chapterReports,
    outOfSyllabusMarks,
    outOfSyllabusPct: round(outOfSyllabusPct),
    contentInsight: buildContentInsight(chapters),
  };
}
