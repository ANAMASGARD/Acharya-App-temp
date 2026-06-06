/**
 * Server-only AI configuration.
 *
 * Model IDs and API keys are read from `.env` only — never hardcode model
 * names in API routes, hooks, or components. Import from this module.
 */

/** Environment variable names for AI services (values live in `.env` only). */
export const AI_ENV = {
  OPENROUTER_API_KEY: "OPENROUTER_API_KEY",
  OPENROUTER_MODEL: "OPENROUTER_MODEL",
  SARVAM_API_KEY: "SARVAM_API_KEY",
  SARVAM_STT_MODEL: "SARVAM_STT_MODEL",
} as const;

export type OpenRouterConfig = Readonly<{
  apiKey: string;
  model: string;
}>;

export type SarvamConfig = Readonly<{
  apiKey: string;
  sttModel: string;
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
 * OpenRouter LLM settings for teaching analysis (`lib/openrouter.ts`).
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
 * Sarvam STT settings (`lib/sarvam.ts`).
 * Requires SARVAM_API_KEY and SARVAM_STT_MODEL in server `.env`.
 */
export function getSarvamConfig(): SarvamConfig | null {
  const apiKey = readEnv(AI_ENV.SARVAM_API_KEY);
  const sttModel = readEnv(AI_ENV.SARVAM_STT_MODEL);

  if (!apiKey) {
    return null;
  }

  if (!sttModel) {
    throw new AiConfigError(
      "sarvam",
      "Speech-to-text model is not configured. Add SARVAM_STT_MODEL to .env and restart the server.",
    );
  }

  return { apiKey, sttModel };
}
