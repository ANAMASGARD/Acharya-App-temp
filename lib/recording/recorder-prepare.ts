import type { AudioRecorder } from "expo-audio";

/**
 * Prepares the recorder only when needed. expo-audio rejects a second
 * prepareToRecordAsync() while a session is already prepared.
 */
export async function ensureRecorderPrepared(
  recorder: AudioRecorder,
): Promise<void> {
  const status = recorder.getStatus();

  if (status.isRecording) {
    await recorder.stop();
  }

  const refreshed = recorder.getStatus();

  if (refreshed.canRecord) {
    return;
  }

  await recorder.prepareToRecordAsync();
}
