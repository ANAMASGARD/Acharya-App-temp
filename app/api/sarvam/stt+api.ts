import { requireAuth } from "@/lib/api-auth";
import { hasAllowedAudioSize, recorderSttBodySchema } from "@/lib/api-schemas";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import { upsertAudioChunk } from "@/lib/graph/recorder";
import { transcribeAudioBuffer } from "@/lib/sarvam";

function readFormString(formData: globalThis.FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function readFormFile(formData: globalThis.FormData, key: string): File | Blob | null {
  const value = formData.get(key);

  if (value instanceof Blob) {
    return value;
  }

  return null;
}

async function parseAudioRequest(request: Request): Promise<{
  buffer: Buffer;
  sessionId: string;
  chunkIndex: number;
  languageCode?: string;
  extension: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = recorderSttBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new Error("Invalid audio upload request");
    }
    const body = parsed.data;
    const chunkIndex = body.chunkIndex;

    const mimeType = body.mimeType ?? "audio/mp4";
    const extension = mimeType.includes("wav") ? ".wav" : ".m4a";

    return {
      buffer: Buffer.from(body.audioBase64, "base64"),
      sessionId: body.sessionId,
      chunkIndex,
      languageCode: body.languageCode ?? STT_AUTO_DETECT,
      extension,
    };
  }

  const formData = (await request.formData()) as unknown as globalThis.FormData;
  const audio = readFormFile(formData, "audio");
  const sessionId = readFormString(formData, "sessionId");
  const chunkIndexRaw = readFormString(formData, "chunkIndex");
  const languageCode = readFormString(formData, "languageCode") ?? STT_AUTO_DETECT;

  if (!audio) {
    throw new Error("Missing audio file");
  }

  if (!sessionId?.trim()) {
    throw new Error("sessionId is required");
  }

  const chunkIndex = Number(chunkIndexRaw);

  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    throw new Error("chunkIndex must be a non-negative integer");
  }

  const arrayBuffer = await audio.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    sessionId: sessionId.trim(),
    chunkIndex,
    languageCode,
    extension: ".m4a",
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId } = await requireAuth(request);
    const { buffer, sessionId, chunkIndex, languageCode, extension } =
      await parseAudioRequest(request);

    if (!hasAllowedAudioSize(buffer)) {
      return Response.json({ error: "Audio file is empty or too large" }, { status: 413 });
    }

    const sttResult = await transcribeAudioBuffer(buffer, extension, {
      languageCode,
      mode: "transcribe",
    });

    const transcript = sttResult.transcript?.trim() ?? "";
    const sttStatus = transcript ? "done" : "empty";
    const detectedLanguage = sttResult.languageCode ?? languageCode;

    const chunk = await upsertAudioChunk(
      userId,
      sessionId,
      chunkIndex,
      transcript || "[inaudible]",
      sttStatus,
    );

    return Response.json({
      chunkIndex,
      transcript,
      chunkId: chunk.chunkId,
      languageCode: detectedLanguage,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Missing") ||
        error.message.includes("required") ||
        error.message.includes("chunkIndex")
      ) {
        return Response.json({ error: error.message }, { status: 400 });
      }

      if (error.message.includes("NEO4J") || error.message.includes("Neo4j")) {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error.message.includes("Failed to upsert")) {
        return Response.json({ error: error.message }, { status: 503 });
      }
    }

    const message = error instanceof Error ? error.message : "STT failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
