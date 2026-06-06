import { getApiBaseUrl } from "@/lib/api-client";
import type { AnalyzeResponse, SttChunkResponse } from "@/types/recorder";

type ApiErrorPayload = Readonly<{
  error?: string | { code?: string; message?: string };
}>;

function parseApiError(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const errorValue = (payload as ApiErrorPayload).error;

    if (typeof errorValue === "string") {
      return errorValue;
    }

    if (
      typeof errorValue === "object" &&
      errorValue !== null &&
      "message" in errorValue &&
      typeof errorValue.message === "string"
    ) {
      return errorValue.message;
    }
  }

  return `Request failed (${status})`;
}

export type SttUploadBody = Readonly<{
  sessionId: string;
  chunkIndex: number;
  languageCode?: string;
  audioBase64: string;
  mimeType: string;
}>;

export async function apiUploadSttChunk(
  token: string,
  body: SttUploadBody,
): Promise<SttChunkResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/sarvam/stt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(payload, response.status));
  }

  return payload as SttChunkResponse;
}

export async function apiPostJson<T>(
  path: string,
  token: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(payload, response.status));
  }

  return payload as T;
}

export async function apiAnalyzeTranscript(
  token: string,
  body: unknown,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/recorder/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as AnalyzeResponse;

  if (!response.ok) {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "object" &&
      payload.error !== null &&
      "message" in payload.error
    ) {
      return payload;
    }

    return {
      error: {
        code: "unknown",
        message: parseApiError(payload, response.status),
      },
    };
  }

  return payload;
}
