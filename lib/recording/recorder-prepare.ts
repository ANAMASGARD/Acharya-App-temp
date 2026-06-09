import type { AudioRecorder } from "expo-audio";

export async function safeStopRecorder(recorder: AudioRecorder): Promise<void> {
  try {
    if (recorder.getStatus().isRecording) {
      await recorder.stop();
    }
  } catch {
    // Android can reject stop() if the native recorder is already torn down.
  }
}

/**
 * Prepares the recorder only when needed. expo-audio rejects a second
 * prepareToRecordAsync() while a session is already prepared.
 */
export async function ensureRecorderPrepared(
  recorder: AudioRecorder,
): Promise<void> {
  const status = recorder.getStatus();

  if (status.isRecording) {
    await safeStopRecorder(recorder);
  }

  const refreshed = recorder.getStatus();

  if (refreshed.canRecord) {
    return;
  }

  await recorder.prepareToRecordAsync();
}
