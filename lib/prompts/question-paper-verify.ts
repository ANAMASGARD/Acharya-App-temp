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
    },
    required: ["alignmentScore", "difficultySummary", "chapterCoverage", "gaps"],
    additionalProperties: false,
  },
} as const;

export function buildVerifyPrompt(input: {
  classLevel: string;
  subject: string;
  bookTitles: readonly string[];
  paperText?: string;
  retrievedChunks: readonly RetrievedChunk[];
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

  return `You are Acharya — an expert CBSE curriculum reviewer for Indian school teachers.

Analyze whether the teacher's question paper aligns with NCERT curriculum for:
- Class: ${input.classLevel}
- Subject: ${input.subject}
- Selected NCERT books: ${input.bookTitles.join(", ")}

${paperSection}

Retrieved NCERT reference context from the graph database:
${context || "(no context retrieved)"}

Return JSON with:
- alignmentScore (0-100): overall curriculum alignment
- difficultySummary: easy/moderate/hard mix assessment in 1-2 sentences
- chapterCoverage: which chapters from the selected books are covered vs missing
- gaps: 3-6 actionable cards for the teacher (in-syllabus praise, out-of-context warnings, missing chapters, suggested questions to add). Use variant coral for problems, coralLight for suggestions, neutral for praise.

Be practical for a teacher making unit tests, half-yearly papers, or quizzes.`;
}
