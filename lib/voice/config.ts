import { AiConfigError } from "@/lib/ai-config";
import Constants from "expo-constants";

export const VOICE_ENV = {
  GATEWAY_WSS_URL: "VOICE_GATEWAY_WSS_URL",
  SESSION_SIGNING_SECRET: "VOICE_SESSION_SIGNING_SECRET",
  AGENT_WEBHOOK_SECRET: "VOICE_AGENT_WEBHOOK_SECRET",
  LIVEKIT_URL: "LIVEKIT_URL",
  LIVEKIT_API_KEY: "LIVEKIT_API_KEY",
  LIVEKIT_API_SECRET: "LIVEKIT_API_SECRET",
  LIVEKIT_AGENT_NAME: "LIVEKIT_AGENT_NAME",
} as const;

export type VoiceConfig = Readonly<{
  gatewayWssUrl: string;
  sessionSigningSecret: string;
  agentWebhookSecret: string;
}>;

export type VoiceSecrets = Readonly<{
  sessionSigningSecret: string;
  agentWebhookSecret: string;
}>;

export type LiveKitConfig = Readonly<{
  url: string;
  apiKey: string;
  apiSecret: string;
  agentName: string;
}>;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getVoiceConfig(): VoiceConfig | null {
  const gatewayWssUrl = readEnv(VOICE_ENV.GATEWAY_WSS_URL);
  const sessionSigningSecret = readEnv(VOICE_ENV.SESSION_SIGNING_SECRET);
  const agentWebhookSecret = readEnv(VOICE_ENV.AGENT_WEBHOOK_SECRET);

  if (!gatewayWssUrl || !sessionSigningSecret || !agentWebhookSecret) {
    return null;
  }

  return { gatewayWssUrl, sessionSigningSecret, agentWebhookSecret };
}

export function requireVoiceConfig(): VoiceConfig {
  const config = getVoiceConfig();

  if (!config) {
    throw new AiConfigError(
      "sarvam",
      "Voice agent is not configured. Add VOICE_GATEWAY_WSS_URL, VOICE_SESSION_SIGNING_SECRET, and VOICE_AGENT_WEBHOOK_SECRET to .env.",
    );
  }

  return config;
}

export function requireVoiceSecrets(): VoiceSecrets {
  const sessionSigningSecret = readEnv(VOICE_ENV.SESSION_SIGNING_SECRET);
  const agentWebhookSecret = readEnv(VOICE_ENV.AGENT_WEBHOOK_SECRET);

  if (!sessionSigningSecret || !agentWebhookSecret) {
    throw new AiConfigError(
      "sarvam",
      "Voice agent is not configured. Add VOICE_SESSION_SIGNING_SECRET and VOICE_AGENT_WEBHOOK_SECRET to .env.",
    );
  }

  return { sessionSigningSecret, agentWebhookSecret };
}

export function getLiveKitConfig(): LiveKitConfig | null {
  const url = readEnv(VOICE_ENV.LIVEKIT_URL);
  const apiKey = readEnv(VOICE_ENV.LIVEKIT_API_KEY);
  const apiSecret = readEnv(VOICE_ENV.LIVEKIT_API_SECRET);
  const agentName = readEnv(VOICE_ENV.LIVEKIT_AGENT_NAME) ?? "acharya-voice-agent";

  if (!url || !apiKey || !apiSecret) {
    return null;
  }

  return { url, apiKey, apiSecret, agentName };
}

export function requireLiveKitConfig(): LiveKitConfig {
  const config = getLiveKitConfig();

  if (!config) {
    throw new AiConfigError(
      "sarvam",
      "LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to .env.",
    );
  }

  return config;
}

export function isLiveKitConfigured(): boolean {
  return getLiveKitConfig() !== null;
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function isVoiceAgentConfigured(): boolean {
  return getVoiceConfig() !== null || isLiveKitConfigured();
}
