import { AudioQuality, IOSOutputFormat, type RecordingOptions } from "expo-audio";

/** Mono 16 kHz — suitable for Sarvam REST STT. */
export const CLASSROOM_RECORDING_PRESET: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    outputFormat: "mpeg4",
    audioEncoder: "aac",
    /** Unprocessed mic — best classroom capture; mixWithOthers keeps media audio audible. */
    audioSource: "unprocessed",
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 64000,
  },
};
