import type { VerificationGap } from "@/types/notes-verification";

export type PaperType =
  | "unit_test"
  | "half_yearly"
  | "surprise_quiz"
  | "model_paper";

export type Difficulty = "easy" | "moderate" | "hard" | "mixed";

export type UploadKind = "document" | "image";

export type ExtractionWarning = "image_unclear" | "text_too_short";

export type CurriculumBookSummary = Readonly<{
  bookId: string;
  title: string;
  classLevel: string;
  subject: string;
  chapterCount: number;
  isPreloaded: boolean;
  chapters?: readonly CurriculumChapterSummary[];
}>;

export type CurriculumChapterSummary = Readonly<{
  chapterId: string;
  title: string;
  index: number;
}>;

export type ChapterCoverage = Readonly<{
  covered: readonly string[];
  missing: readonly string[];
}>;

export type RetrievalDebugMatch = Readonly<{
  chunkId: string;
  chapterTitle: string;
  bookTitle: string;
  vectorScore: number;
  keywordBoost: number;
  finalScore: number;
  survivedGraphFilter: boolean;
}>;

export type RetrievalDebug = Readonly<{
  matches: readonly RetrievalDebugMatch[];
}>;

export type QuestionPaperVerifyResult = Readonly<{
  verificationId: string;
  alignmentScore: number;
  chapterCoverage: ChapterCoverage;
  gaps: readonly VerificationGap[];
  difficultySummary: string;
  extractionWarning?: ExtractionWarning;
  retrievalDebug?: RetrievalDebug;
}>;

export type GeneratedPaperSection = Readonly<{
  title: string;
  marks: number;
  questions: readonly Readonly<{
    number: number;
    text: string;
    marks: number;
    difficulty: Difficulty;
  }>[];
}>;

export type GeneratedPaper = Readonly<{
  title: string;
  paperType: PaperType;
  difficulty: Difficulty;
  totalMarks: number;
  sections: readonly GeneratedPaperSection[];
}>;

export type QuestionPaperGenerateResult = Readonly<{
  verificationId: string;
  paper: GeneratedPaper;
}>;

export type CurriculumBooksResponse = Readonly<{
  books: readonly CurriculumBookSummary[];
}>;
