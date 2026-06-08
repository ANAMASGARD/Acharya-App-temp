import {
  countPendingChunks,
  hasFailedChunks,
  isTranscriptComplete,
  rebuildMergedTranscript,
} from "@/lib/recording/transcript-state";
import type {
  ChunkSttStatus,
  RecorderChunk,
  RecorderPipelineStatus,
  TeachingReport,
} from "@/types/recorder";
import { create } from "zustand";

type RecorderStoreState = Readonly<{
  status: RecorderPipelineStatus;
  sessionId: string | null;
  topic: string;
  subject: string;
  classLevel: string;
  startedAt: string | null;
  elapsedSeconds: number;
  chunks: RecorderChunk[];
  mergedTranscript: string;
  transcriptComplete: boolean;
  allowPartialSend: boolean;
  pendingUploadCount: number;
  errorMessage: string | null;
  analysisError: string | null;
  report: TeachingReport | null;
  classNotes: string | null;
  setMetadata: (fields: {
    topic?: string;
    subject?: string;
    classLevel?: string;
  }) => void;
  setElapsedSeconds: (seconds: number) => void;
  startSession: (sessionId: string) => void;
  setStatus: (status: RecorderPipelineStatus) => void;
  addLocalChunk: (index: number, localUri: string) => void;
  markChunkProcessing: (index: number) => void;
  markChunkSuccess: (
    index: number,
    text: string,
    chunkId: string,
    localUri: string,
  ) => void;
  markChunkFailed: (index: number, message: string, permanent: boolean) => void;
  setError: (message: string | null) => void;
  setAnalysisError: (message: string | null) => void;
  setReport: (report: TeachingReport | null) => void;
  setClassNotes: (classNotes: string | null) => void;
  setAllowPartialSend: (value: boolean) => void;
  reset: () => void;
  recomputeDerived: () => void;
}>;

const initialState = {
  status: "idle" as RecorderPipelineStatus,
  sessionId: null,
  topic: "",
  subject: "",
  classLevel: "",
  startedAt: null,
  elapsedSeconds: 0,
  chunks: [] as RecorderChunk[],
  mergedTranscript: "",
  transcriptComplete: false,
  allowPartialSend: false,
  pendingUploadCount: 0,
  errorMessage: null,
  analysisError: null,
  report: null,
  classNotes: null,
};

function recompute(chunks: readonly RecorderChunk[]): Pick<
  RecorderStoreState,
  "mergedTranscript" | "transcriptComplete" | "pendingUploadCount"
> {
  return {
    mergedTranscript: rebuildMergedTranscript(chunks),
    transcriptComplete: isTranscriptComplete(chunks),
    pendingUploadCount: countPendingChunks(chunks),
  };
}

export const useRecorderStore = create<RecorderStoreState>((set, get) => ({
  ...initialState,
  setMetadata: (fields) => set((state) => ({ ...state, ...fields })),
  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),
  startSession: (sessionId) =>
    set({
      sessionId,
      status: "recording",
      startedAt: new Date().toISOString(),
      chunks: [],
      mergedTranscript: "",
      transcriptComplete: false,
      allowPartialSend: false,
      pendingUploadCount: 0,
      errorMessage: null,
      analysisError: null,
      report: null,
      classNotes: null,
      elapsedSeconds: 0,
    }),
  setStatus: (status) => set({ status }),
  addLocalChunk: (index, localUri) =>
    set((state) => {
      if (state.chunks.some((chunk) => chunk.index === index)) {
        return state;
      }

      const chunks: RecorderChunk[] = [
        ...state.chunks,
        {
          index,
          localUri,
          uploadStatus: "pending",
          sttStatus: "pending",
          text: "",
          auraAcked: false,
          localFileDeleted: false,
        },
      ];

      return { chunks, ...recompute(chunks) };
    }),
  markChunkProcessing: (index) =>
    set((state) => {
      const chunks = state.chunks.map((chunk) =>
        chunk.index === index
          ? {
              ...chunk,
              uploadStatus: "uploading" as const,
              sttStatus: "processing" as const,
            }
          : chunk,
      );

      return { chunks, ...recompute(chunks) };
    }),
  markChunkSuccess: (index, text, chunkId, localUri) =>
    set((state) => {
      const chunks = state.chunks.map((chunk) => {
        if (chunk.index !== index) {
          return chunk;
        }

        const trimmed = text.trim();

        return {
          ...chunk,
          uploadStatus: "done" as const,
          sttStatus: (trimmed ? "done" : "empty") as ChunkSttStatus,
          text: trimmed || "[inaudible]",
          chunkId,
          auraAcked: true,
          localFileDeleted: chunk.localUri === localUri,
        };
      });

      return { chunks, ...recompute(chunks) };
    }),
  markChunkFailed: (index, message, permanent) =>
    set((state) => {
      const chunks = state.chunks.map((chunk) =>
        chunk.index === index
          ? {
              ...chunk,
              uploadStatus: "failed" as const,
              sttStatus: (permanent ? "failed" : "pending") as ChunkSttStatus,
            }
          : chunk,
      );

      return {
        chunks,
        errorMessage: permanent ? message : state.errorMessage,
        ...recompute(chunks),
      };
    }),
  setError: (message) => set({ errorMessage: message }),
  setAnalysisError: (message) => set({ analysisError: message }),
  setReport: (report) => set({ report, status: report ? "completed" : get().status }),
  setClassNotes: (classNotes) => set({ classNotes }),
  setAllowPartialSend: (value) => set({ allowPartialSend: value }),
  reset: () => set({ ...initialState }),
  recomputeDerived: () => {
    const { chunks } = get();
    set(recompute(chunks));
  },
}));

export function canSendTranscript(state: RecorderStoreState): boolean {
  if (!state.mergedTranscript.trim()) {
    return false;
  }

  if (state.status === "analyzing" || state.status === "recording") {
    return false;
  }

  if (state.allowPartialSend) {
    return true;
  }

  if (state.status === "ready" || state.status === "completed") {
    return state.transcriptComplete || state.allowPartialSend;
  }

  if (state.status === "draining") {
    return false;
  }

  return false;
}

export function canStartRecording(state: RecorderStoreState): boolean {
  return (
    state.topic.trim().length > 0 &&
    state.subject.trim().length > 0 &&
    state.classLevel.trim().length > 0 &&
    (state.status === "idle" ||
      state.status === "ready" ||
      state.status === "completed" ||
      state.status === "failed")
  );
}

export function getStatusMessage(state: RecorderStoreState): string {
  if (state.status === "starting") {
    return "Starting";
  }

  if (state.status === "recording") {
    if (state.pendingUploadCount > 0) {
      return `Recording… (${state.pendingUploadCount} chunk${state.pendingUploadCount === 1 ? "" : "s"} pending)`;
    }

    return "Recording…";
  }

  if (state.status === "stopping" || state.status === "draining") {
    return `Finishing transcription… (${state.pendingUploadCount} pending)`;
  }

  if (state.status === "analyzing") {
    return "Analyzing class…";
  }

  if (state.status === "completed") {
    return "Report ready";
  }

  if (state.status === "failed" && state.errorMessage) {
    return state.errorMessage;
  }

  if (state.status === "ready") {
    if (!state.mergedTranscript.trim()) {
      return "Transcription finished with no text";
    }

    if (hasFailedChunks(state.chunks) && !state.transcriptComplete) {
      return "Partial transcript — review before sending";
    }

    return "Ready to send";
  }

  if (!canStartRecording(state)) {
    return "Fill topic, subject, and class to start";
  }

  return "Ready to record";
}
