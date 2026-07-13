import "@/lib/server-polyfills";

import { getOpenRouterVisionConfig } from "@/lib/ai-config";
import mammoth from "mammoth";

const IMAGE_SEED_MIN_CHARS = 40;
const IMAGE_SEED_MAX_TOKENS = 120;

const IMAGE_SEED_PROMPT =
  "List only visible chapter titles, topic names, and question stems from this question paper image. Plain text, comma-separated, under 80 words. No commentary.";

export type ExtractedDocument = Readonly<{
  text: string;
  kind: "document" | "image";
  warning?: "image_unclear" | "text_too_short";
}>;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

export async function extractDocumentText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedDocument> {
  const lower = fileName.toLowerCase();
  let text = "";

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    text = await extractPdfText(buffer);
  } else if (
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/msword" ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    text = await extractDocxText(buffer);
  } else {
    throw new Error("Unsupported document type");
  }

  const warning = text.length < IMAGE_SEED_MIN_CHARS ? "text_too_short" : undefined;

  return { text, kind: "document", warning };
}

export async function extractImageSeedText(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedDocument> {
  const { apiKey, seedModel } = getOpenRouterVisionConfig();
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://acharya.app",
      "X-Title": "Acharya Image Seed",
    },
    body: JSON.stringify({
      model: seedModel,
      max_tokens: IMAGE_SEED_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IMAGE_SEED_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Image seed failed (${response.status})`);
  }

  const text = payload?.choices?.[0]?.message?.content?.trim() ?? "";
  const warning = text.length < IMAGE_SEED_MIN_CHARS ? "image_unclear" : undefined;

  return { text, kind: "image", warning };
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
