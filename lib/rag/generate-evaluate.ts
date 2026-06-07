import { getOpenRouterConfig, OpenRouterConfigError } from "@/lib/ai-config";
import {
  buildGeneratePrompt,
  QUESTION_PAPER_GENERATE_JSON_SCHEMA,
} from "@/lib/prompts/question-paper-generate";
import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type { Difficulty, GeneratedPaper, PaperType } from "@/types/question-paper";

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

function isGeneratedPaper(value: unknown): value is GeneratedPaper {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    typeof record.paperType === "string" &&
    typeof record.difficulty === "string" &&
    typeof record.totalMarks === "number" &&
    Array.isArray(record.sections)
  );
}

export async function generateQuestionPaper(input: {
  classLevel: string;
  subject: string;
  bookTitles: readonly string[];
  paperType: PaperType;
  difficulty: Difficulty;
  retrievedChunks: readonly RetrievedChunk[];
}): Promise<GeneratedPaper> {
  let config: ReturnType<typeof getOpenRouterConfig>;

  try {
    config = getOpenRouterConfig();
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const prompt = buildGeneratePrompt(input);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://acharya.app",
      "X-Title": "Acharya Question Paper Generate",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: QUESTION_PAPER_GENERATE_JSON_SCHEMA,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Generate LLM failed (${response.status})`);
  }

  const content = payload?.choices?.[0]?.message?.content ?? "";

  if (!content) {
    throw new Error("Generate LLM returned empty response");
  }

  const parsed = parseJsonContent(content) as { paper?: unknown };

  if (!parsed.paper || !isGeneratedPaper(parsed.paper)) {
    throw new Error("Generate LLM returned invalid paper JSON");
  }

  return parsed.paper;
}
