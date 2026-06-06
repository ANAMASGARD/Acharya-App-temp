import { requireAuth } from "@/lib/api-auth";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import { transcribeChatAudioBuffer } from "@/lib/sarvam";
import { AiConfigError } from "@/lib/ai-config";

type JsonSttBody = Readonly<{
  audioBase64?: string;
  mimeType?: string;
  languageCode?: string;
}>;

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuth(request);

    const body = (await request.json()) as JsonSttBody;

    if (!body.audioBase64?.trim()) {
      return Response.json({ error: "Missing audioBase64" }, { status: 400 });
    }

    const mimeType = body.mimeType ?? "audio/mp4";
    const extension = mimeType.includes("wav") ? ".wav" : ".m4a";
    const buffer = Buffer.from(body.audioBase64, "base64");

    if (buffer.byteLength === 0) {
      return Response.json({ error: "Audio file is empty" }, { status: 400 });
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
