import { AiConfigError, requireSarvamConfig } from "@/lib/ai-config";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import type { OpenRouterErrorCode } from "@/types/recorder";
import { SarvamAIClient, type SarvamAI } from "sarvamai";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SarvamTranscribeOptions = Readonly<{
  languageCode?: string;
  mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
}>;

export type SarvamTranscribeResult = Readonly<{
  transcript: string;
  languageCode?: string;
  languageProbability?: number;
}>;

function shouldAutoDetectLanguage(languageCode?: string): boolean {
  return (
    !languageCode ||
    languageCode === STT_AUTO_DETECT ||
    languageCode === "unknown"
  );
}

export type SarvamSynthesizeOptions = Readonly<{
  languageCode?: string;
  speaker?: string;
}>;

export type SarvamSynthesizeResult = Readonly<{
  audioBase64: string;
  mimeType: string;
}>;

export type SarvamChatMessage = Readonly<{
  role: "user" | "system" | "assistant";
  content: string;
}>;

export type MappedSarvamError = Readonly<{
  code: OpenRouterErrorCode;
  userMessage: string;
  httpStatus: number;
}>;

function mapSarvamApiError(error: unknown): MappedSarvamError {
  const status =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;

  if (status === 401 || status === 403) {
    return {
      code: "auth_config",
      httpStatus: status,
      userMessage: "Coach service is not configured. Contact support.",
    };
  }

  if (status === 404) {
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

  if (status === 502 || status === 503) {
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

function extractChatContent(
  message: SarvamAI.ChatCompletionResponseMessage,
  contentOnly: boolean,
): string {
  const content = (message.content ?? "").trim();

  if (content) {
    return content;
  }

  if (contentOnly) {
    return "";
  }

  const reasoning = (message.reasoning_content ?? "").trim();
  return reasoning ? reasoning.slice(0, 4000) : "";
}

export async function sarvamChatCompletion(input: {
  messages: SarvamChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** When true (default), only use message.content — never reasoning_content. Required for JSON outputs. */
  contentOnly?: boolean;
}): Promise<string> {
  const config = requireSarvamConfig();
  const client = new SarvamAIClient({ apiSubscriptionKey: config.apiKey });
  const contentOnly = input.contentOnly ?? true;

  try {
    const response = await client.chat.completions({
      model: config.llmModel as SarvamAI.SarvamModelIds,
      messages: input.messages,
      max_tokens: input.maxTokens ?? 2048,
      temperature: input.temperature ?? 0.3,
      stream: false,
      // Sarvam defaults to reasoning mode, which leaves content empty on longer prompts.
      reasoning_effort: null,
    } as unknown as SarvamAI.ChatCompletionsRequest & { stream?: false });

    const message = response.choices[0]?.message;

    if (!message) {
      throw Object.assign(new Error("Coach returned an empty response."), {
        mapped: {
          code: "schema_invalid" as const,
          httpStatus: 502,
          userMessage: "Coach returned an invalid report. Tap Retry.",
        },
      });
    }

    const content = extractChatContent(message, contentOnly);

    if (!content) {
      throw Object.assign(new Error("Coach returned an empty response."), {
        mapped: {
          code: "schema_invalid" as const,
          httpStatus: 502,
          userMessage: "Coach returned an invalid report. Tap Retry.",
        },
      });
    }

    return content;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "mapped" in error &&
      typeof (error as { mapped?: MappedSarvamError }).mapped === "object"
    ) {
      throw error;
    }

    if (error instanceof AiConfigError) {
      throw Object.assign(new Error(error.message), {
        mapped: {
          code: "auth_config" as const,
          httpStatus: 500,
          userMessage: error.message,
        },
      });
    }

    const mapped = mapSarvamApiError(error);
    throw Object.assign(
      new Error(mapped.userMessage),
      { mapped },
    );
  }
}

export async function transcribeChatAudioBuffer(
  buffer: Buffer,
  extension: string,
  options: SarvamTranscribeOptions = {},
): Promise<SarvamTranscribeResult> {
  const config = requireSarvamConfig();
  const autoDetect = shouldAutoDetectLanguage(options.languageCode);

  const client = new SarvamAIClient({ apiSubscriptionKey: config.apiKey });
  const tempDir = path.join(os.tmpdir(), `sarvam-chat-${randomUUID()}`);
  const inputFilePath = path.join(tempDir, `voice${extension}`);

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.writeFile(inputFilePath, buffer);

    const response = await client.speechToText.transcribe({
      file: fs.createReadStream(inputFilePath),
      model: config.sttModel as SarvamAI.SpeechToTextModel,
      mode: options.mode ?? "transcribe",
      ...(autoDetect
        ? {}
        : {
            language_code:
              options.languageCode as SarvamAI.SpeechToTextLanguage,
          }),
    });

    return {
      transcript: response.transcript ?? "",
      languageCode: response.language_code ?? options.languageCode,
      languageProbability: response.language_probability ?? undefined,
    };
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {
      // ignore cleanup errors
    });
  }
}

export async function synthesizeSpeech(
  text: string,
  options: SarvamSynthesizeOptions = {},
): Promise<SarvamSynthesizeResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new AiConfigError("sarvam", "Nothing to read aloud.");
  }

  const config = requireSarvamConfig();
  const client = new SarvamAIClient({ apiSubscriptionKey: config.apiKey });

  const response = await client.textToSpeech.convert({
    text: trimmed.slice(0, 2500),
    target_language_code: (options.languageCode ?? "en-IN") as SarvamAI.TextToSpeechLanguage,
    model: config.ttsModel as SarvamAI.TextToSpeechModel,
    speaker: (options.speaker ?? "priya") as SarvamAI.TextToSpeechSpeaker,
  });

  const audioBase64 = response.audios?.[0];

  if (!audioBase64) {
    throw new AiConfigError("sarvam", "Voice playback failed. Try again.");
  }

  return {
    audioBase64,
    mimeType: "audio/wav",
  };
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  extension: string,
  options: SarvamTranscribeOptions = {},
): Promise<SarvamTranscribeResult> {
  const config = requireSarvamConfig();
  const autoDetect = shouldAutoDetectLanguage(options.languageCode);

  const client = new SarvamAIClient({ apiSubscriptionKey: config.apiKey });
  const tempDir = path.join(os.tmpdir(), `sarvam-${randomUUID()}`);
  const inputFilePath = path.join(tempDir, `chunk${extension}`);

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.writeFile(inputFilePath, buffer);

    const response = await client.speechToText.transcribe({
      file: fs.createReadStream(inputFilePath),
      model: config.sttModel as SarvamAI.SpeechToTextModel,
      mode: options.mode ?? "transcribe",
      ...(autoDetect
        ? {}
        : {
            language_code:
              options.languageCode as SarvamAI.SpeechToTextLanguage,
          }),
    });

    return {
      transcript: response.transcript ?? "",
      languageCode: response.language_code ?? options.languageCode,
      languageProbability: response.language_probability ?? undefined,
    };
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {
      // ignore cleanup errors
    });
  }
}
