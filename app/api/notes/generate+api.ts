import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { getBookTitles } from "@/lib/graph/curriculum";
import { saveVerificationReport } from "@/lib/graph/notes";
import { generateQuestionPaper } from "@/lib/rag/generate-evaluate";
import { sampleCurriculumChunksForGeneration } from "@/lib/rag/retrieve";
import type { Difficulty, PaperType } from "@/types/question-paper";

type GenerateBody = Readonly<{
  classLevel?: string;
  classId?: string;
  subject?: string;
  subjectId?: string;
  bookIds?: string[];
  paperType?: PaperType;
  difficulty?: Difficulty;
  chapterIds?: string[];
}>;

const PAPER_TYPES: PaperType[] = [
  "unit_test",
  "half_yearly",
  "surprise_quiz",
  "model_paper",
];

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard", "mixed"];

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as GenerateBody;

    const classLevel = (body.classLevel ?? body.classId ?? "").trim();
    const subject = (body.subject ?? body.subjectId ?? "english").trim();
    const bookIds = body.bookIds?.filter(Boolean) ?? [];
    const paperType = body.paperType ?? "unit_test";
    const difficulty = body.difficulty ?? "moderate";

    if (!classLevel || bookIds.length === 0) {
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "classLevel and bookIds are required",
          },
        },
        { status: 400 },
      );
    }

    if (!PAPER_TYPES.includes(paperType)) {
      return Response.json(
        { error: { code: "invalid_request", message: "Invalid paperType" } },
        { status: 400 },
      );
    }

    if (!DIFFICULTIES.includes(difficulty)) {
      return Response.json(
        { error: { code: "invalid_request", message: "Invalid difficulty" } },
        { status: 400 },
      );
    }

    const retrievedChunks = await sampleCurriculumChunksForGeneration({
      bookIds,
      classLevel,
      subject,
      chapterIds: body.chapterIds,
    });

    const bookTitles = await getBookTitles(bookIds);

    const paper = await generateQuestionPaper({
      classLevel,
      subject,
      bookTitles,
      paperType,
      difficulty,
      retrievedChunks,
    });

    const verificationId = await saveVerificationReport({
      clerkId: userId,
      mode: "generate",
      classLevel,
      subject,
      bookIds,
      generatedPaper: paper,
      paperType: paper.paperType,
      difficulty: paper.difficulty,
      totalMarks: paper.totalMarks,
    });

    return Response.json({ verificationId, paper });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiAuthError") {
      return authErrorResponse(error);
    }

    const message = error instanceof Error ? error.message : "Generation failed";
    return Response.json({ error: { code: "server_error", message } }, { status: 500 });
  }
}
