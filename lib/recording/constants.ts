/** Sarvam REST limit is 30s — keep segments safely under that. */
export const CHUNK_DURATION_SEC = 22;

/** Omit fixed language — Saaras v3 auto-detects among 23 Indian languages + English. */
export const STT_AUTO_DETECT = "auto";

export const CHUNK_RETRY_DELAYS_MS = [1000, 4000, 16000] as const;

export const RECORDER_QUEUE_STORAGE_KEY = "acharya-recorder-queue";

export const RECORDER_TEMP_DIR = "acharya-recorder-chunks";
