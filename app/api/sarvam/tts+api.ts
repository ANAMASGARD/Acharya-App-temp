import { requireAuth } from "@/lib/api-auth";
import { ttsBodySchema } from "@/lib/api-schemas";
import { AiConfigError } from "@/lib/ai-config";
import { synthesizeSpeech } from "@/lib/sarvam";

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuth(request);

    const parsed = ttsBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Text must be between 1 and 2500 characters" }, { status: 422 });
    }
    const body = parsed.data;
    const text = body.text;

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
