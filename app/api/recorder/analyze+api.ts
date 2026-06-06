import { requireAuth } from "@/lib/api-auth";
import {
  getOpenRouterMappedError,
  analyzeTeachingTranscript,
} from "@/lib/openrouter";
import { saveTranscriptAndReport } from "@/lib/graph/recorder";

const MIN_TRANSCRIPT_LENGTH = 50;

type AnalyzeBody = Readonly<{
  sessionId?: string;
  transcript?: string;
  topic?: string;
  subject?: string;
  classLevel?: string;
  durationSeconds?: number;
  isComplete?: boolean;
  chunkCount?: number;
}>;

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const body = (await request.json()) as AnalyzeBody;

    if (!body.sessionId?.trim()) {
      return Response.json(
        { error: { code: "invalid_request", message: "sessionId is required" } },
        { status: 400 },
      );
    }

    const transcript = body.transcript?.trim() ?? "";

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

    const chunkCount =
      typeof body.chunkCount === "number" && body.chunkCount > 0
        ? Math.floor(body.chunkCount)
        : 1;

    const report = await analyzeTeachingTranscript({
      transcript,
      subject: body.subject ?? "",
      topic: body.topic ?? "",
      classLevel: body.classLevel ?? "",
    });

    await saveTranscriptAndReport(
      userId,
      body.sessionId,
      transcript,
      body.isComplete ?? true,
      chunkCount,
      report,
    );

    return Response.json({ report });
  } catch (error) {
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
