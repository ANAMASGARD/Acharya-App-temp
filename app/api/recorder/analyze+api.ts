import { requireAuth } from "@/lib/api-auth";
import {
  getOpenRouterMappedError,
  analyzeTeachingTranscript,
} from "@/lib/openrouter";
import { saveTranscriptAndReport } from "@/lib/graph/recorder";

type AnalyzeBody = Readonly<{
  sessionId?: string;
  transcript?: string;
  topic?: string;
  subject?: string;
  classLevel?: string;
  durationSeconds?: number;
  isComplete?: boolean;
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

    if (!body.transcript?.trim()) {
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

    const report = await analyzeTeachingTranscript({
      transcript: body.transcript,
      subject: body.subject ?? "",
      topic: body.topic ?? "",
      classLevel: body.classLevel ?? "",
    });

    await saveTranscriptAndReport(
      userId,
      body.sessionId,
      body.transcript,
      body.isComplete ?? true,
      body.transcript.split(/\s+/).filter(Boolean).length,
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
