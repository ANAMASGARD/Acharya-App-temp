import { authErrorResponse, requireAuth } from "@/lib/api-auth";
import {
  getOpenRouterMappedError,
  analyzeTeachingTranscript,
  generateClassNotes,
} from "@/lib/openrouter";
import { getCanonicalTranscript, saveTranscriptReportAndNotes } from "@/lib/graph/recorder";
import { z } from "zod";

const MIN_TRANSCRIPT_LENGTH = 50;
const analyzeBodySchema = z.object({
  sessionId: z.string().uuid(),
  allowPartial: z.boolean().optional().default(false),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const parsed = analyzeBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: { code: "invalid_request", message: "A valid sessionId is required." } },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const canonical = await getCanonicalTranscript(userId, body.sessionId, body.allowPartial);

    if (!canonical) {
      return Response.json(
        { error: { code: "not_found", message: "Session not found." } },
        { status: 404 },
      );
    }

    if (!canonical.isComplete && !body.allowPartial) {
      return Response.json(
        { error: { code: "transcript_processing", message: "Transcription is still finishing." } },
        { status: 409 },
      );
    }

    const transcript = canonical.text.trim();

    if (!transcript) {
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "Transcript is empty. Record a class before sending.",
          },
        },
        { status: 400 },
      );
    }

    if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
      return Response.json(
        {
          error: {
            code: "transcript_too_short",
            message: "Transcript too short to analyze. Record a longer class.",
          },
        },
        { status: 422 },
      );
    }

    const analysisInput = {
      transcript,
      subject: canonical.subject,
      topic: canonical.topic,
      classLevel: canonical.classLevel,
    };

    const report = await analyzeTeachingTranscript(analysisInput);
    const classNotes = await generateClassNotes(analysisInput);

    await saveTranscriptReportAndNotes(
      userId,
      body.sessionId,
      transcript,
      canonical.isComplete,
      canonical.chunkCount,
      report,
      classNotes,
    );

    return Response.json({ report, classNotes });
  } catch (error) {
    if (error instanceof Error && error.name === "ApiAuthError") {
      return authErrorResponse(error);
    }
    const mapped = getOpenRouterMappedError(error);

    if (mapped.code === "auth_config") {
      return Response.json(
        { error: { code: mapped.code, message: mapped.userMessage } },
        { status: mapped.httpStatus },
      );
    }

    if (
      mapped.code === "provider_unreachable" ||
      mapped.code === "model_unavailable" ||
      mapped.code === "rate_limit" ||
      mapped.code === "timeout"
    ) {
      return Response.json(
        { error: { code: mapped.code, message: mapped.userMessage } },
        { status: mapped.httpStatus >= 400 ? mapped.httpStatus : 503 },
      );
    }

    if (mapped.code === "schema_invalid") {
      return Response.json(
        { error: { code: mapped.code, message: mapped.userMessage } },
        { status: 502 },
      );
    }

    return Response.json(
      { error: { code: mapped.code, message: mapped.userMessage } },
      { status: 500 },
    );
  }
}
