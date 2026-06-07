import { requireAuth } from "@/lib/api-auth";
import { AiConfigError } from "@/lib/ai-config";
import { synthesizeSpeech } from "@/lib/sarvam";

type TtsBody = Readonly<{
  text?: string;
  languageCode?: string;
  speaker?: string;
}>;

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuth(request);

    const body = (await request.json()) as TtsBody;
    const text = body.text?.trim() ?? "";

    if (!text) {
      return Response.json({ error: "Text cannot be empty" }, { status: 422 });
    }

    const result = await synthesizeSpeech(text, {
      languageCode: body.languageCode,
      speaker: body.speaker,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AiConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "TTS failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
