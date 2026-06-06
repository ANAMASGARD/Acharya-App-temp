import { getSarvamConfig } from "@/lib/ai-config";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import { SarvamAIClient, type SarvamAI } from "sarvamai";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SarvamTranscribeOptions = Readonly<{
  languageCode?: string;
  mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
}>;

export type SarvamTranscribeResult = Readonly<{
  transcript: string;
  languageCode?: string;
  languageProbability?: number;
}>;

function shouldAutoDetectLanguage(languageCode?: string): boolean {
  return (
    !languageCode ||
    languageCode === STT_AUTO_DETECT ||
    languageCode === "unknown"
  );
}

export async function transcribeAudioBuffer(
  buffer: Buffer,
  extension: string,
  options: SarvamTranscribeOptions = {},
): Promise<SarvamTranscribeResult> {
  const config = getSarvamConfig();
  const autoDetect = shouldAutoDetectLanguage(options.languageCode);

  if (!config) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      transcript:
        "[Mock transcript] Good morning class, today we will learn about gravity.",
      languageCode: autoDetect ? "en-IN" : (options.languageCode ?? "hi-IN"),
    };
  }

  const client = new SarvamAIClient({ apiSubscriptionKey: config.apiKey });
  const tempDir = path.join(os.tmpdir(), `sarvam-${randomUUID()}`);
  const inputFilePath = path.join(tempDir, `chunk${extension}`);

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await fs.promises.writeFile(inputFilePath, buffer);

    const response = await client.speechToText.transcribe({
      file: fs.createReadStream(inputFilePath),
      model: config.sttModel as SarvamAI.SpeechToTextModel,
      mode: options.mode ?? "transcribe",
      ...(autoDetect
        ? {}
        : {
            language_code:
              options.languageCode as SarvamAI.SpeechToTextLanguage,
          }),
    });

    return {
      transcript: response.transcript ?? "",
      languageCode: response.language_code ?? options.languageCode,
      languageProbability: response.language_probability ?? undefined,
    };
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {
      // ignore cleanup errors
    });
  }
}
