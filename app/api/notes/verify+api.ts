import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import { getNotesMaxUploadBytes, isRagDebugEnabled } from "@/lib/ai-config";
import { getBookTitles, getChapterWeights } from "@/lib/graph/curriculum";
import {
  hashText,
  linkCurriculumMatches,
  saveTeacherChunks,
  saveVerificationReport,
} from "@/lib/graph/notes";
import { chunkText } from "@/lib/rag/chunk-text";
import { embedText } from "@/lib/rag/embeddings";
import {
  extractDocumentText,
  extractImageSeedText,
  isImageMime,
} from "@/lib/rag/extract-text";
import { hybridRetrieveCurriculumChunks } from "@/lib/rag/retrieve";
import { evaluateQuestionPaper } from "@/lib/rag/verify-evaluate";
import { computeWeightage } from "@/lib/rag/weightage";

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const form = (await request.formData()) as unknown as globalThis.FormData;
    const fileValue = form.get("file");

    if (!(fileValue instanceof Blob)) {
      return Response.json(
        { error: { code: "invalid_request", message: "file is required" } },
        { status: 400 },
      );
    }

    const file = fileValue;
    const classLevel = String(
      form.get("classLevel") ?? form.get("classId") ?? "",
    ).trim();
    const subject = String(
      form.get("subject") ?? form.get("subjectId") ?? "english",
    ).trim();
    const bookIds = form
      .getAll("bookIds")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const chapterIds = form
      .getAll("chapterIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!classLevel || bookIds.length === 0) {
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "classLevel and at least one bookId are required",
          },
        },
        { status: 400 },
      );
    }

    const maxBytes = getNotesMaxUploadBytes();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > maxBytes) {
      return Response.json(
        { error: { code: "too_large", message: "File is too large" } },
        { status: 413 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name || "upload";

    let paperText = "";
    let extractionWarning = undefined as "image_unclear" | "text_too_short" | undefined;
    let isImage = false;
    let imageBuffer: Buffer | undefined;
    let imageMime: string | undefined;

    if (isImageMime(mimeType)) {
      isImage = true;
      imageBuffer = buffer;
      imageMime = mimeType;
      const seed = await extractImageSeedText(buffer, mimeType);
      paperText = seed.text;
      extractionWarning = seed.warning;
    } else {
      const doc = await extractDocumentText(buffer, mimeType, fileName);
      paperText = doc.text;
      extractionWarning = doc.warning;
    }

    const queryText = paperText || fileName;
    const textChunks = chunkText(queryText);
    const embedSource = textChunks[0] ?? queryText;
    const embedding = await embedText(embedSource);

    const { matches, debug } = await hybridRetrieveCurriculumChunks({
      embedding,
      bookIds,
      classLevel,
      subject,
      queryText,
    });

    const bookTitles = await getBookTitles(bookIds);
    const inScopeChapters = await getChapterWeights(
      bookIds,
      chapterIds.length > 0 ? chapterIds : undefined,
    );

    const llmResult = await evaluateQuestionPaper({
      classLevel,
      subject,
      bookTitles,
      paperText: isImage ? undefined : paperText,
      imageBuffer,
      imageMime,
      retrievedChunks: matches,
      inScopeChapters,
      extractionWarning,
    });

    const weightage =
      computeWeightage({
        questions: llmResult.questions,
        chapters: inScopeChapters,
      }) ?? undefined;

    const verificationId = await saveVerificationReport({
      clerkId: userId,
      mode: "verify",
      classLevel,
      subject,
      bookIds,
      alignmentScore: llmResult.alignmentScore,
      chapterCoverage: llmResult.chapterCoverage,
      gaps: llmResult.gaps,
      difficultySummary: llmResult.difficultySummary,
      weightage,
      sourceMime: mimeType,
      sourceFileName: fileName,
      extractionWarning: extractionWarning ?? null,
    });

    const teacherChunks = textChunks.map((text, index) => ({
      chunkId: `${verificationId}-teacher-${index}`,
      text,
      index,
    }));

    await saveTeacherChunks({
      clerkId: userId,
      verificationId,
      chunks: teacherChunks,
      sourceFileName: fileName,
      textHash: hashText(queryText),
    });

    if (teacherChunks[0]) {
      await linkCurriculumMatches({
        teacherChunkId: teacherChunks[0].chunkId,
        matches,
      });
    }

    return Response.json({
      verificationId,
      alignmentScore: llmResult.alignmentScore,
      chapterCoverage: llmResult.chapterCoverage,
      gaps: llmResult.gaps,
      difficultySummary: llmResult.difficultySummary,
      weightage,
      extractionWarning,
      retrievalDebug: isRagDebugEnabled() ? { matches: debug } : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiAuthError") {
      return authErrorResponse(error);
    }

    const message = error instanceof Error ? error.message : "Verification failed";
    return Response.json({ error: { code: "server_error", message } }, { status: 500 });
  }
}
