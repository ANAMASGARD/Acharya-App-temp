import {
  getOpenRouterConfig,
  OpenRouterConfigError,
} from "@/lib/ai-config";
import { buildTeachingAnalysisPrompt } from "@/lib/prompts/teaching-analysis";
import {
  TEACHING_REPORT_JSON_SCHEMA,
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

function isTeachingReport(value: unknown): value is TeachingReport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.classroomEnvironment === "string" &&
    typeof record.whatWentWrong === "string" &&
    typeof record.areasToImprove === "string" &&
    typeof record.topicSpecificFeedback === "string" &&
    typeof record.overallScore === "number" &&
    record.overallScore >= 0 &&
    record.overallScore <= 100
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

function mapConfigError(error: OpenRouterConfigError): MappedOpenRouterError {
  return {
    code: "auth_config",
    httpStatus: 500,
    userMessage: error.message,
  };
}

export async function analyzeTeachingTranscript(input: {
  transcript: string;
  subject: string;
  topic: string;
  classLevel: string;
}): Promise<TeachingReport> {
  let config: ReturnType<typeof getOpenRouterConfig>;

  try {
    config = getOpenRouterConfig();
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      throw Object.assign(new Error(error.message), {
        mapped: mapConfigError(error),
      });
    }

    throw error;
  }

  const { apiKey, model } = config;

  const requestBody = {
    model,
    messages: [
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

export type OpenRouterChatMessage = Readonly<{
  role: "system" | "user" | "assistant";
  content: string;
}>;

export async function streamChatCompletion(input: {
  messages: OpenRouterChatMessage[];
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  let config: ReturnType<typeof getOpenRouterConfig>;

  try {
    config = getOpenRouterConfig();
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
