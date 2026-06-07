import { getOpenRouterEmbeddingConfig } from "@/lib/ai-config";

type EmbeddingResponse = Readonly<{
  data?: ReadonlyArray<Readonly<{ embedding?: number[] }>>;
}>;

export async function embedTexts(texts: readonly string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const { apiKey, model } = getOpenRouterEmbeddingConfig();

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://acharya.app",
      "X-Title": "Acharya RAG Embeddings",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  const payload = (await response.json().catch(() => null)) as EmbeddingResponse | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error?: { message?: string } }).error?.message ?? "Embedding failed")
        : `Embedding request failed (${response.status})`;
    throw new Error(message);
  }

  const vectors = payload?.data?.map((row) => row.embedding).filter(Boolean) as number[][] | undefined;

  if (!vectors || vectors.length !== texts.length) {
    throw new Error("Embedding response count mismatch");
  }

  return vectors;
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
