import { z } from "zod";

export const MAX_STT_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_STT_AUDIO_BASE64_CHARS = Math.ceil((MAX_STT_AUDIO_BYTES * 4) / 3);

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export const audioBase64Schema = z
  .string()
  .min(4)
  .max(MAX_STT_AUDIO_BASE64_CHARS)
  .refine((value) => base64Pattern.test(value), "audioBase64 must be valid base64");

export const recorderSttBodySchema = z.object({
  sessionId: z.string().uuid(),
  chunkIndex: z.number().int().nonnegative(),
  languageCode: z.string().max(16).optional(),
  audioBase64: audioBase64Schema,
  mimeType: z.enum(["audio/mp4", "audio/m4a", "audio/wav", "audio/webm"]).optional(),
});

export const chatSttBodySchema = z.object({
  audioBase64: audioBase64Schema,
  mimeType: z.enum(["audio/mp4", "audio/m4a", "audio/wav", "audio/webm"]).optional(),
  languageCode: z.string().max(16).optional(),
});

export const ttsBodySchema = z.object({
  text: z.string().trim().min(1).max(2500),
  languageCode: z.string().max(16).optional(),
  speaker: z.string().max(64).optional(),
});

export function hasAllowedAudioSize(buffer: Buffer): boolean {
  return buffer.byteLength > 0 && buffer.byteLength <= MAX_STT_AUDIO_BYTES;
}
