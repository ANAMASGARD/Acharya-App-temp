import { requireAuth } from "@/lib/api-auth";
import { chatSttBodySchema, hasAllowedAudioSize } from "@/lib/api-schemas";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import { transcribeChatAudioBuffer } from "@/lib/sarvam";
import { AiConfigError } from "@/lib/ai-config";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuth(request);

    const parsed = chatSttBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid audio upload request" }, { status: 400 });
    }
    const body = parsed.data;

    const mimeType = body.mimeType ?? "audio/mp4";
    const extension = mimeType.includes("wav") ? ".wav" : ".m4a";
    const buffer = Buffer.from(body.audioBase64, "base64");

    if (!hasAllowedAudioSize(buffer)) {
      return Response.json({ error: "Audio file is empty or too large" }, { status: 413 });
    }

    const sttResult = await transcribeChatAudioBuffer(buffer, extension, {
      languageCode: body.languageCode ?? STT_AUTO_DETECT,
      mode: "transcribe",
    });

    const transcript = sttResult.transcript?.trim() ?? "";

    if (!transcript) {
      return Response.json(
        { error: "Could not hear you. Speak clearly and try again." },
        { status: 422 },
      );
    }

    return Response.json({
      transcript,
      languageCode: sttResult.languageCode,
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "STT failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
