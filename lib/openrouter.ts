import {
  AiConfigError,
  getOpenRouterChatboxConfig,
  OpenRouterConfigError,
} from "@/lib/ai-config";
import {
  buildClassNotesPrompt,
  CLASS_NOTES_SYSTEM_PROMPT,
} from "@/lib/prompts/class-notes";
import {
  buildTeachingAnalysisPrompt,
  TEACHING_ANALYSIS_SYSTEM_PROMPT,
} from "@/lib/prompts/teaching-analysis";
import { sarvamChatCompletion } from "@/lib/sarvam";
import {
  type OpenRouterErrorCode,
  type TeachingReport,
} from "@/types/recorder";

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

function pickString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function normalizeTeachingReport(value: unknown): TeachingReport | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nested =
    typeof record.report === "object" && record.report !== null
      ? (record.report as Record<string, unknown>)
      : record;

  const classroomEnvironment = pickString(
    nested,
    "classroomEnvironment",
    "classroom_environment",
    "environment",
  );
  const whatWentWrong = pickString(
    nested,
    "whatWentWrong",
    "what_went_wrong",
    "issues",
  );
  const areasToImprove = pickString(
    nested,
    "areasToImprove",
    "areas_to_improve",
    "improvements",
  );
  const topicSpecificFeedback = pickString(
    nested,
    "topicSpecificFeedback",
    "topic_specific_feedback",
    "topicFeedback",
    "topic_feedback",
  );
  const score = Number(
    nested.overallScore ?? nested.overall_score ?? nested.score,
  );

  if (
    !classroomEnvironment ||
    !whatWentWrong ||
    !areasToImprove ||
    !topicSpecificFeedback ||
    !Number.isFinite(score)
  ) {
    return null;
  }

  const overallScore = Math.round(Math.min(100, Math.max(0, score)));

  return {
    classroomEnvironment,
    whatWentWrong,
    areasToImprove,
    topicSpecificFeedback,
    overallScore,
  };
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```[\s\S]*$/m, "")
      .trim();
    return JSON.parse(withoutFence);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("Coach returned an invalid report.");
  }
}

function stripNotesPreamble(notes: string): string {
  let text = notes.trim();

  const preamble =
    /^(?:sure[!,.]?|certainly[!,.]?|of course[!,.]?|here(?:'s| are)[^\n]*|let me[^\n]*|i(?:'ll| will)[^\n]*)\s*\n+/i;

  while (preamble.test(text)) {
    text = text.replace(preamble, "").trim();
  }

  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:\w+)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
  }

  return text;
}

function mapConfigError(error: OpenRouterConfigError): MappedOpenRouterError {
  return {
    code: "auth_config",
    httpStatus: 500,
    userMessage: error.message,
  };
}

const ANALYSIS_MAX_ATTEMPTS = 3;

function invalidReportError(): Error {
  return Object.assign(new Error("Coach returned an invalid report."), {
    mapped: {
      code: "schema_invalid" as const,
      httpStatus: 502,
      userMessage: "Coach returned an invalid report. Tap Retry.",
    },
  });
}

export async function analyzeTeachingTranscript(input: {
  transcript: string;
  subject: string;
  topic: string;
  classLevel: string;
}): Promise<TeachingReport> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ANALYSIS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const content = await sarvamChatCompletion({
        messages: [
          { role: "system", content: TEACHING_ANALYSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildTeachingAnalysisPrompt(
              input.transcript,
              input.subject,
              input.topic,
              input.classLevel,
            ),
          },
        ],
        maxTokens: 4096,
        temperature: attempt === 0 ? 0.1 : 0.2,
        contentOnly: true,
      });

      let parsed: unknown;

      try {
        parsed = parseJsonContent(content);
      } catch {
        throw invalidReportError();
      }

      const report = normalizeTeachingReport(parsed);

      if (!report) {
        throw invalidReportError();
      }

      return report;
    } catch (error) {
      lastError = error;
      const mapped = (error as { mapped?: MappedOpenRouterError }).mapped;

      if (mapped?.code !== "schema_invalid") {
        throw error;
      }
    }
  }

  throw lastError ?? invalidReportError();
}

export async function generateClassNotes(input: {
  transcript: string;
  subject: string;
  topic: string;
  classLevel: string;
}): Promise<string> {
  const notes = stripNotesPreamble(
    await sarvamChatCompletion({
      messages: [
        { role: "system", content: CLASS_NOTES_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildClassNotesPrompt(
            input.transcript,
            input.subject,
            input.topic,
            input.classLevel,
          ),
        },
      ],
      maxTokens: 4096,
      temperature: 0.3,
      contentOnly: true,
    }),
  );

  if (!notes) {
    throw Object.assign(new Error("Notes generator returned an empty response."), {
      mapped: {
        code: "schema_invalid" as const,
        httpStatus: 502,
        userMessage: "Notes could not be generated. Tap Retry.",
      },
    });
  }

  return notes;
}

export type OpenRouterChatMessage = Readonly<{
  role: "system" | "user" | "assistant";
  content: string;
}>;

export async function streamChatCompletion(input: {
  messages: OpenRouterChatMessage[];
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  let config: ReturnType<typeof getOpenRouterChatboxConfig>;

  try {
    config = getOpenRouterChatboxConfig();
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      throw Object.assign(new Error(error.message), {
        mapped: mapConfigError(error),
      });
    }

    throw error;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://acharya.app",
      "X-Title": "Acharya Chat Coach",
    },
    body: JSON.stringify({
      model: config.model,
      messages: input.messages,
      stream: true,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const mapped = mapOpenRouterError(response.status, payload);
    throw Object.assign(new Error(mapped.userMessage), { mapped });
  }

  const reader = response.body?.getReader();

  if (!reader) {
    throw Object.assign(new Error("Chat stream is unavailable."), {
      mapped: {
        code: "provider_unreachable" as const,
        httpStatus: 502,
        userMessage: "Chat stream is unavailable. Try again.",
      },
    });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    if (input.signal?.aborted) {
      throw new DOMException("Chat stream aborted", "AbortError");
    }

    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const data = trimmed.replace(/^data:\s*/, "");

      if (data === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;

        if (typeof delta === "string" && delta.length > 0) {
          fullText += delta;
          input.onDelta(delta);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }

  if (input.signal?.aborted) {
    throw new DOMException("Chat stream aborted", "AbortError");
  }

  if (!fullText.trim()) {
    throw Object.assign(new Error("Coach returned an empty response."), {
      mapped: {
        code: "schema_invalid" as const,
        httpStatus: 502,
        userMessage: "Coach returned an empty response. Try again.",
      },
    });
  }

  return fullText;
}

export function getOpenRouterMappedError(error: unknown): MappedOpenRouterError {
  if (error instanceof OpenRouterConfigError) {
    return mapConfigError(error);
  }

  if (error instanceof AiConfigError) {
    return {
      code: "auth_config",
      httpStatus: 500,
      userMessage: error.message,
    };
  }

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
