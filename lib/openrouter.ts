import {
  TEACHING_REPORT_JSON_SCHEMA,
  type OpenRouterErrorCode,
  type TeachingReport,
} from "@/types/recorder";

const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";

type OpenRouterErrorBody = Readonly<{
  error?: {
    message?: string;
    code?: string | number;
    metadata?: Record<string, unknown>;
  };
}>;

export type MappedOpenRouterError = Readonly<{
  code: OpenRouterErrorCode;
  userMessage: string;
  httpStatus: number;
}>;

export function mapOpenRouterError(
  status: number,
  body: unknown,
): MappedOpenRouterError {
  const parsed = (body ?? {}) as OpenRouterErrorBody;
  const providerMessage = parsed.error?.message ?? "";
  const providerCode = String(parsed.error?.code ?? "");

  if (status === 401 || status === 403) {
    return {
      code: "auth_config",
      httpStatus: status,
      userMessage: "Coach service is not configured. Contact support.",
    };
  }

  if (status === 404 || providerCode.includes("model")) {
    return {
      code: "model_unavailable",
      httpStatus: status,
      userMessage: "Teaching coach model is unavailable. Try again later.",
    };
  }

  if (status === 429) {
    return {
      code: "rate_limit",
      httpStatus: status,
      userMessage: "Coach quota reached. Try again later.",
    };
  }

  if (status === 408 || status === 524) {
    return {
      code: "timeout",
      httpStatus: status,
      userMessage: "Analysis timed out. Try again with a shorter transcript.",
    };
  }

  if (status === 502 || status === 503 || providerMessage.toLowerCase().includes("provider")) {
    return {
      code: "provider_unreachable",
      httpStatus: status,
      userMessage:
        "AI provider is temporarily unreachable. Try again in a few minutes.",
    };
  }

  return {
    code: "unknown",
    httpStatus: status,
    userMessage: "Analysis failed. Please try again.",
  };
}

function buildAnalysisPrompt(
  transcript: string,
  subject: string,
  topic: string,
  classLevel: string,
): string {
  return `YOU ARE A TRUTH SEEKING expert teacher coach and education quality analyst for rural Indian schools.
You have received a full transcript of a classroom session.

Context:
- Subject: ${subject || "Unknown"}
- Topic: ${topic || "Unknown"}
- Class/Grade: ${classLevel || "Unknown"}

TRANSCRIPT:
"""
${transcript}
"""

Analyze this teaching session thoroughly and return JSON with these exact keys:
classroomEnvironment, whatWentWrong, areasToImprove, topicSpecificFeedback.

Rules:
- Be a TRUTH SEEKING coach. Don't flatter if they were wrong.
- Use simple English mixed with Hindi terms where natural.
- Be specific and quote the transcript when making a point.`;
}

function isTeachingReport(value: unknown): value is TeachingReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.classroomEnvironment === "string" &&
    typeof record.whatWentWrong === "string" &&
    typeof record.areasToImprove === "string" &&
    typeof record.topicSpecificFeedback === "string"
  );
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
}

export async function analyzeTeachingTranscript(input: {
  transcript: string;
  subject: string;
  topic: string;
  classLevel: string;
}): Promise<TeachingReport> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const allowFallback = process.env.OPENROUTER_ALLOW_TEXT_FALLBACK === "true";
  void allowFallback;

  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      classroomEnvironment:
        "Mock: engaged classroom with active student participation.",
      whatWentWrong:
        "Mock: a few oversimplified explanations that could confuse advanced learners.",
      areasToImprove:
        "Mock: use more checks for understanding every 5–7 minutes.",
      topicSpecificFeedback:
        "Mock: revisit key definitions with concrete local examples.",
    };
  }

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content: buildAnalysisPrompt(
          input.transcript,
          input.subject,
          input.topic,
          input.classLevel,
        ),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: TEACHING_REPORT_JSON_SCHEMA,
    },
  };

  const callModel = async (): Promise<TeachingReport> => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://acharya.app",
        "X-Title": "Acharya Teaching Coach",
      },
      body: JSON.stringify(requestBody),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const mapped = mapOpenRouterError(response.status, payload);
      throw Object.assign(new Error(mapped.userMessage), {
        mapped,
      });
    }

    const content =
      typeof payload === "object" &&
      payload !== null &&
      "choices" in payload &&
      Array.isArray((payload as { choices: unknown[] }).choices)
        ? ((payload as { choices: { message?: { content?: string } }[] }).choices[0]
            ?.message?.content ?? "")
        : "";

    if (!content) {
      throw Object.assign(new Error("Coach returned an empty response."), {
        mapped: {
          code: "schema_invalid" as const,
          httpStatus: 502,
          userMessage: "Coach returned an invalid report. Tap Retry.",
        },
      });
    }

    const parsed = parseJsonContent(content);

    if (!isTeachingReport(parsed)) {
      throw Object.assign(new Error("Coach returned an invalid report."), {
        mapped: {
          code: "schema_invalid" as const,
          httpStatus: 502,
          userMessage: "Coach returned an invalid report. Tap Retry.",
        },
      });
    }

    return parsed;
  };

  try {
    return await callModel();
  } catch (error) {
    const mapped = (error as { mapped?: MappedOpenRouterError }).mapped;

    if (mapped?.code === "schema_invalid") {
      return await callModel();
    }

    throw error;
  }
}

export function getOpenRouterMappedError(error: unknown): MappedOpenRouterError {
  if (
    typeof error === "object" &&
    error !== null &&
    "mapped" in error &&
    typeof (error as { mapped?: MappedOpenRouterError }).mapped === "object"
  ) {
    return (error as { mapped: MappedOpenRouterError }).mapped;
  }

  return {
    code: "unknown",
    httpStatus: 500,
    userMessage:
      error instanceof Error ? error.message : "Analysis failed. Please try again.",
  };
}
