import type { PaperType, Difficulty } from "@/types/question-paper";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

export const QUESTION_PAPER_GENERATE_JSON_SCHEMA = {
  name: "question_paper_generate",
  strict: true,
  schema: {
    type: "object",
    properties: {
      paper: {
        type: "object",
        properties: {
          title: { type: "string" },
          paperType: {
            type: "string",
            enum: ["unit_test", "half_yearly", "surprise_quiz", "model_paper"],
          },
          difficulty: {
            type: "string",
            enum: ["easy", "moderate", "hard", "mixed"],
          },
          totalMarks: { type: "number" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                marks: { type: "number" },
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      number: { type: "number" },
                      text: { type: "string" },
                      marks: { type: "number" },
                      difficulty: {
                        type: "string",
                        enum: ["easy", "moderate", "hard", "mixed"],
                      },
                    },
                    required: ["number", "text", "marks", "difficulty"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "marks", "questions"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "paperType", "difficulty", "totalMarks", "sections"],
        additionalProperties: false,
      },
    },
    required: ["paper"],
    additionalProperties: false,
  },
} as const;

export function buildGeneratePrompt(input: {
  classLevel: string;
  subject: string;
  bookTitles: readonly string[];
  paperType: PaperType;
  difficulty: Difficulty;
  retrievedChunks: readonly RetrievedChunk[];
}): string {
  const context = input.retrievedChunks
    .map(
      (chunk) =>
        `Book: ${chunk.bookTitle} | Chapter: ${chunk.chapterTitle}\n${chunk.text.slice(0, 700)}`,
    )
    .join("\n\n");

  return `You are Acharya — create a practical NCERT-aligned question paper for an Indian school teacher.

Class: ${input.classLevel}
Subject: ${input.subject}
Books: ${input.bookTitles.join(", ")}
Paper type: ${input.paperType}
Target difficulty: ${input.difficulty}

Use ONLY topics from this retrieved NCERT context:
${context}

Generate a complete paper with sections, numbered questions, marks per question, and total marks.
Paper should be classroom-ready for CBSE-style assessment.`;
}
