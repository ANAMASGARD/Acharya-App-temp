import Constants from "expo-constants";
import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (Platform.OS === "web") {
    return "";
  }

  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8081`;
  }

  return "";
}

type ApiFetchOptions = Readonly<{
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token: string | null;
  body?: unknown;
}>;

export async function apiFetch<T>(
  path: string,
  { method = "GET", token, body }: ApiFetchOptions,
): Promise<T> {
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return payload as T;
}
