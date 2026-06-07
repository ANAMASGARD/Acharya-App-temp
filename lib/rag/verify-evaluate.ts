import {
  getOpenRouterConfig,
  getOpenRouterVisionConfig,
  OpenRouterConfigError,
} from "@/lib/ai-config";
import {
  buildVerifyPrompt,
  QUESTION_PAPER_VERIFY_JSON_SCHEMA,
} from "@/lib/prompts/question-paper-verify";
import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type { VerificationGap } from "@/types/notes-verification";
import type { ChapterCoverage, ExtractionWarning } from "@/types/question-paper";

type VerifyLlmResult = Readonly<{
  alignmentScore: number;
  difficultySummary: string;
  chapterCoverage: ChapterCoverage;
  gaps: VerificationGap[];
}>;

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

function isVerifyResult(value: unknown): value is VerifyLlmResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const coverage = record.chapterCoverage as Record<string, unknown> | undefined;
  const gaps = record.gaps;

  return (
    typeof record.alignmentScore === "number" &&
    typeof record.difficultySummary === "string" &&
    typeof coverage === "object" &&
    coverage !== null &&
    Array.isArray(coverage.covered) &&
    Array.isArray(coverage.missing) &&
    Array.isArray(gaps)
  );
}

export async function evaluateQuestionPaper(input: {
  classLevel: string;
  subject: string;
  bookTitles: readonly string[];
  paperText?: string;
  imageBuffer?: Buffer;
  imageMime?: string;
  retrievedChunks: readonly RetrievedChunk[];
  extractionWarning?: ExtractionWarning;
}): Promise<VerifyLlmResult> {
  const isImage = Boolean(input.imageBuffer && input.imageMime);
  const prompt = buildVerifyPrompt({
    classLevel: input.classLevel,
    subject: input.subject,
    bookTitles: input.bookTitles,
    paperText: input.paperText,
    retrievedChunks: input.retrievedChunks,
    isImage,
  });

  let apiKey: string;
  let model: string;

  try {
    if (isImage) {
      const vision = getOpenRouterVisionConfig();
      apiKey = vision.apiKey;
      model = vision.model;
    } else {
      const config = getOpenRouterConfig();
      apiKey = config.apiKey;
      model = config.model;
    }
  } catch (error) {
    if (error instanceof OpenRouterConfigError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const userContent: unknown = isImage
    ? [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${input.imageMime};base64,${input.imageBuffer!.toString("base64")}`,
          },
        },
      ]
    : prompt;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://acharya.app",
      "X-Title": "Acharya Question Paper Verify",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: userContent }],
      response_format: {
        type: "json_schema",
        json_schema: QUESTION_PAPER_VERIFY_JSON_SCHEMA,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Verify LLM failed (${response.status})`);
  }

  const content = payload?.choices?.[0]?.message?.content ?? "";

  if (!content) {
    throw new Error("Verify LLM returned empty response");
  }

  const parsed = parseJsonContent(content);

  if (!isVerifyResult(parsed)) {
    throw new Error("Verify LLM returned invalid JSON shape");
  }

  return {
    alignmentScore: Math.max(0, Math.min(100, parsed.alignmentScore)),
    difficultySummary: parsed.difficultySummary,
    chapterCoverage: {
      covered: parsed.chapterCoverage.covered.map(String),
      missing: parsed.chapterCoverage.missing.map(String),
    },
    gaps: parsed.gaps.map((gap, index) => ({
      id: gap.id || `gap-${index + 1}`,
      title: gap.title,
      body: gap.body,
      variant: gap.variant,
    })),
  };
}
