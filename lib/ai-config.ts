/**
 * Server-only AI configuration.
 *
 * Model IDs and API keys are read from `.env` only — never hardcode model
 * names in API routes, hooks, or components. Import from this module.
 */

/** Environment variable names for AI services (values live in `.env` only). */
export const AI_ENV = {
  OPENROUTER_API_KEY: "OPENROUTER_API_KEY",
  /** Recorder transcript analysis and other non-chat LLM flows */
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  /** Chat Acharya inbox only (`app/api/chat/completions+api.ts`) */
  OPENROUTER_CHATBOX_MODEL: "OPENROUTER_CHATBOX_MODEL",
  OPENROUTER_EMBEDDING_MODEL: "OPENROUTER_EMBEDDING_MODEL",
  OPENROUTER_VISION_MODEL: "OPENROUTER_VISION_MODEL",
  OPENROUTER_VISION_SEED_MODEL: "OPENROUTER_VISION_SEED_MODEL",
  SARVAM_API_KEY: "SARVAM_API_KEY",
  SARVAM_STT_MODEL: "SARVAM_STT_MODEL",
  /** Recorder teaching analysis + class notes (`lib/sarvam.ts` chat helper) */
  SARVAM_LLM_MODEL: "SARVAM_LLM_MODEL",
  SARVAM_TTS_MODEL: "SARVAM_TTS_MODEL",
  NOTES_MAX_UPLOAD_BYTES: "NOTES_MAX_UPLOAD_BYTES",
  RAG_DEBUG: "RAG_DEBUG",
} as const;

export type OpenRouterConfig = Readonly<{
  apiKey: string;
  model: string;
}>;

export type OpenRouterEmbeddingConfig = Readonly<{
  apiKey: string;
  model: string;
}>;

export type OpenRouterVisionConfig = Readonly<{
  apiKey: string;
  model: string;
  seedModel: string;
}>;

export type SarvamConfig = Readonly<{
  apiKey: string;
  sttModel: string;
  llmModel: string;
  ttsModel: string;
}>;

export class AiConfigError extends Error {
  readonly code: "auth_config";
  readonly service: "openrouter" | "sarvam";

  constructor(service: "openrouter" | "sarvam", message: string) {
    super(message);
    this.name = "AiConfigError";
    this.code = "auth_config";
    this.service = service;
  }
}

/** @deprecated Use AiConfigError — kept for existing OpenRouter imports */
export class OpenRouterConfigError extends AiConfigError {
  constructor(message: string) {
    super("openrouter", message);
    this.name = "OpenRouterConfigError";
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * OpenRouter LLM settings for RAG, community seed, and vision fallbacks.
 * Requires OPENROUTER_API_KEY and OPENROUTER_MODEL in server `.env`.
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = readEnv(AI_ENV.OPENROUTER_API_KEY);
  const model = readEnv(AI_ENV.OPENROUTER_MODEL);

  if (!apiKey) {
    throw new OpenRouterConfigError(
      "Teaching coach is not configured. Add OPENROUTER_API_KEY to .env and restart the server.",
    );
  }

  if (!model) {
    throw new OpenRouterConfigError(
      "Teaching coach model is not configured. Add OPENROUTER_MODEL to .env and restart the server.",
    );
  }

  return { apiKey, model };
}

/**
 * OpenRouter LLM settings for Chat Acharya (`streamChatCompletion` only).
 * Requires OPENROUTER_API_KEY and OPENROUTER_CHATBOX_MODEL in server `.env`.
 */
export function getOpenRouterChatboxConfig(): OpenRouterConfig {
  const apiKey = readEnv(AI_ENV.OPENROUTER_API_KEY);
  const model = readEnv(AI_ENV.OPENROUTER_CHATBOX_MODEL);

  if (!apiKey) {
    throw new OpenRouterConfigError(
      "Chat coach is not configured. Add OPENROUTER_API_KEY to .env and restart the server.",
    );
  }

  if (!model) {
    throw new OpenRouterConfigError(
      "Chat coach model is not configured. Add OPENROUTER_CHATBOX_MODEL to .env and restart the server.",
    );
  }

  return { apiKey, model };
}

/**
 * OpenRouter embeddings for RAG (must match Aura ingestion model).
 */
export function getOpenRouterEmbeddingConfig(): OpenRouterEmbeddingConfig {
  const apiKey = readEnv(AI_ENV.OPENROUTER_API_KEY);
  const model = readEnv(AI_ENV.OPENROUTER_EMBEDDING_MODEL);

  if (!apiKey) {
    throw new OpenRouterConfigError(
      "Embeddings are not configured. Add OPENROUTER_API_KEY to .env.",
    );
  }

  if (!model) {
    throw new OpenRouterConfigError(
      "Embedding model is not configured. Add OPENROUTER_EMBEDDING_MODEL to .env after Aura introspection.",
    );
  }

  return { apiKey, model };
}

/**
 * OpenRouter vision models for image seed + multimodal verify.
 */
export function getOpenRouterVisionConfig(): OpenRouterVisionConfig {
  const apiKey = readEnv(AI_ENV.OPENROUTER_API_KEY);
  const model =
    readEnv(AI_ENV.OPENROUTER_VISION_MODEL) ??
    readEnv(AI_ENV.OPENROUTER_MODEL);
  const seedModel =
    readEnv(AI_ENV.OPENROUTER_VISION_SEED_MODEL) ?? model;

  if (!apiKey) {
    throw new OpenRouterConfigError(
      "Vision service is not configured. Add OPENROUTER_API_KEY to .env.",
    );
  }

  if (!model) {
    throw new OpenRouterConfigError(
      "Vision model is not configured. Add OPENROUTER_VISION_MODEL or OPENROUTER_MODEL to .env.",
    );
  }

  return { apiKey, model, seedModel: seedModel ?? model };
}

export function getNotesMaxUploadBytes(): number {
  const raw = readEnv(AI_ENV.NOTES_MAX_UPLOAD_BYTES);
  const parsed = raw ? Number.parseInt(raw, 10) : 10_485_760;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_485_760;
}

export function isRagDebugEnabled(): boolean {
  const raw = readEnv(AI_ENV.RAG_DEBUG);
  return raw === "true" || raw === "1";
}

/**
 * Sarvam STT settings (`lib/sarvam.ts`).
 * Requires SARVAM_API_KEY and SARVAM_STT_MODEL in server `.env`.
 */
export function getSarvamConfig(): SarvamConfig | null {
  const apiKey = readEnv(AI_ENV.SARVAM_API_KEY);
  const sttModel = readEnv(AI_ENV.SARVAM_STT_MODEL);
  const llmModel = readEnv(AI_ENV.SARVAM_LLM_MODEL) ?? "sarvam-30b";
  const ttsModel = readEnv(AI_ENV.SARVAM_TTS_MODEL) ?? "bulbul:v3";

  if (!apiKey) {
    return null;
  }

  if (!sttModel) {
    throw new AiConfigError(
      "sarvam",
      "Speech-to-text model is not configured. Add SARVAM_STT_MODEL to .env and restart the server.",
    );
  }

  return { apiKey, sttModel, llmModel, ttsModel };
}

/**
 * Sarvam settings for chat voice features — throws when API key is missing.
 */
export function requireSarvamConfig(): SarvamConfig {
  const config = getSarvamConfig();

  if (!config) {
    throw new AiConfigError(
      "sarvam",
      "Voice service is not configured. Add SARVAM_API_KEY to .env and restart the server.",
    );
  }

  return config;
}
