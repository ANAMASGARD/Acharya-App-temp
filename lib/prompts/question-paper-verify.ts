import type { RetrievedChunk } from "@/lib/rag/retrieve";

export const QUESTION_PAPER_VERIFY_JSON_SCHEMA = {
  name: "question_paper_verify",
  strict: true,
  schema: {
    type: "object",
    properties: {
      alignmentScore: { type: "number", description: "0-100 curriculum alignment" },
      difficultySummary: { type: "string" },
      chapterCoverage: {
        type: "object",
        properties: {
          covered: { type: "array", items: { type: "string" } },
          missing: { type: "array", items: { type: "string" } },
        },
        required: ["covered", "missing"],
        additionalProperties: false,
      },
      gaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
            variant: { type: "string", enum: ["coral", "coralLight", "neutral"] },
          },
          required: ["id", "title", "body", "variant"],
          additionalProperties: false,
        },
      },
      questions: {
        type: "array",
        description:
          "One entry per question in the paper, with its marks and the in-scope chapter it belongs to (exact title) or 'Out of syllabus'.",
        items: {
          type: "object",
          properties: {
            marks: { type: "number", description: "Marks allotted to this question" },
            chapter: {
              type: "string",
              description: "Exact in-scope chapter title, or 'Out of syllabus'",
            },
          },
          required: ["marks", "chapter"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "alignmentScore",
      "difficultySummary",
      "chapterCoverage",
      "gaps",
      "questions",
    ],
    additionalProperties: false,
  },
} as const;

export function buildVerifyPrompt(input: {
  classLevel: string;
  subject: string;
  bookTitles: readonly string[];
  paperText?: string;
  retrievedChunks: readonly RetrievedChunk[];
  inScopeChapters: readonly string[];
  isImage: boolean;
}): string {
  const context = input.retrievedChunks
    .map(
      (chunk, index) =>
        `[${index + 1}] Book: ${chunk.bookTitle} | Chapter: ${chunk.chapterTitle}\n${chunk.text.slice(0, 900)}`,
    )
    .join("\n\n");

  const paperSection = input.isImage
    ? "The teacher uploaded a PHOTO of their question paper (attached as image). Read the image directly."
    : `Question paper text:\n${input.paperText ?? "(empty)"}`;

  const chapterList =
    input.inScopeChapters.length > 0
      ? input.inScopeChapters.map((title) => `- ${title}`).join("\n")
      : "(no specific chapters provided)";

  return `You are Acharya — an expert CBSE curriculum reviewer for Indian school teachers.

Analyze whether the teacher's question paper aligns with NCERT curriculum for:
- Class: ${input.classLevel}
- Subject: ${input.subject}
- Selected NCERT books: ${input.bookTitles.join(", ")}

In-scope chapters for this exam (use these EXACT titles when attributing questions):
${chapterList}

${paperSection}

Retrieved NCERT reference context from the graph database:
${context || "(no context retrieved)"}

Return JSON with:
- alignmentScore (0-100): overall curriculum alignment
- difficultySummary: easy/moderate/hard mix assessment in 1-2 sentences
- chapterCoverage: which chapters from the selected books are covered vs missing
- gaps: 3-6 actionable cards for the teacher (in-syllabus praise, out-of-context warnings, missing chapters, suggested questions to add). Use variant coral for problems, coralLight for suggestions, neutral for praise.
- questions: one entry per question in the paper. For each, give its marks (number) and the single in-scope chapter it tests, using EXACTLY one of the chapter titles listed above. If a question does not belong to any in-scope chapter, set chapter to "Out of syllabus". If marks are not printed, estimate a sensible value (e.g. 1 for MCQ/fill-in, more for long answers).

Be practical for a teacher making unit tests, half-yearly papers, or quizzes.`;
}
