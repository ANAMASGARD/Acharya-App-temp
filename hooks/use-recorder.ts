import { apiFetch } from "@/lib/api-client";
import {
  ChunkRecorderSession,
  stopActiveSegment,
} from "@/lib/recording/chunk-recorder";
import { ChunkUploadQueue } from "@/lib/recording/chunk-upload-queue";
import { clearPersistedQueue } from "@/lib/recording/queue-persistence";
import { apiAnalyzeTranscript } from "@/lib/recording/recorder-api";
import { STT_AUTO_DETECT } from "@/lib/recording/constants";
import type { ChunkReadyEvent } from "@/lib/recording/chunk-recorder";
import { CLASSROOM_RECORDING_PRESET } from "@/lib/recording/recording-preset";
import { hasFailedChunks } from "@/lib/recording/transcript-state";
import {
  canSendTranscript,
  canStartRecording,
  getStatusMessage,
  useRecorderStore,
} from "@/store/recorder-store";
import type { CreateSessionInput, SessionNode } from "@/types/graph";
import type { AnalyzeResponse, TeachingReport } from "@/types/recorder";
import { useAuth } from "@clerk/expo";
import {
  AudioModule,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

export function formatRecorderTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type UseRecorderResult = Readonly<{
  topic: string;
  subject: string;
  classLevel: string;
  isRecording: boolean;
  isStarting: boolean;
  isTranscribing: boolean;
  timerLabel: string;
  canStartRecording: boolean;
  canSend: boolean;
  statusMessage: string;
  mergedTranscript: string;
  report: TeachingReport | null;
  classNotes: string | null;
  analysisError: string | null;
  allowPartialSend: boolean;
  setTopic: (value: string) => void;
  setSubject: (value: string) => void;
  setClassLevel: (value: string) => void;
  toggleRecording: () => void;
  sendForAnalysis: () => Promise<void>;
  confirmPartialSend: () => void;
  retryAnalysis: () => Promise<void>;
}>;

function finishDraining(): void {
  const state = useRecorderStore.getState();

  if (state.status !== "draining" || !state.transcriptComplete) {
    return;
  }

  if (state.mergedTranscript.trim()) {
    useRecorderStore.setState({ status: "ready" });
    return;
  }

  if (state.chunks.length === 0) {
    useRecorderStore.setState({
      status: "failed",
      errorMessage: "No audio was captured. Try recording again.",
    });
    return;
  }

  if (hasFailedChunks(state.chunks)) {
    useRecorderStore.setState({
      status: "failed",
      errorMessage:
        "Could not transcribe your class. Check microphone and network, then try again.",
    });
    return;
  }

  useRecorderStore.setState({
    status: "failed",
    errorMessage: "Transcript was empty. Speak clearly and try again.",
  });
}

export function useRecorder(): UseRecorderResult {
  const { getToken } = useAuth();
  const recorder = useAudioRecorder(CLASSROOM_RECORDING_PRESET);
  const recordingActiveRef = useRef(false);
  const queueRef = useRef<ChunkUploadQueue | null>(null);
  const sessionRef = useRef<ChunkRecorderSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingChunksRef = useRef<ChunkReadyEvent[]>([]);

  const store = useRecorderStore();

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    queueRef.current = new ChunkUploadQueue({
      getToken: getAuthToken,
      onChunkProcessing: (index) => {
        store.markChunkProcessing(index);
      },
      onChunkSuccess: (response, localUri) => {
        store.markChunkSuccess(
          response.chunkIndex,
          response.transcript,
          response.chunkId,
          localUri,
        );
        finishDraining();
      },
      onChunkFailed: (index, message, permanent) => {
        store.markChunkFailed(index, message, permanent);
        finishDraining();
      },
      onQueueIdle: () => {
        finishDraining();
      },
    });
  }, [getAuthToken, store]);

  useEffect(() => {
    void (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        store.setError("Microphone permission is required to record class.");
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        allowsBackgroundRecording: true,
        interruptionMode: "mixWithOthers",
      });
    })();
  }, [store]);

  useEffect(() => {
    const state = useRecorderStore.getState();

    if (!canStartRecording(state)) {
      return;
    }

    void getAuthToken();
  }, [getAuthToken, store.topic, store.subject, store.classLevel]);

  useEffect(() => {
    if (store.status !== "recording") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    timerRef.current = setInterval(() => {
      store.setElapsedSeconds(useRecorderStore.getState().elapsedSeconds + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [store]);

  const enqueueChunk = useCallback(
    (index: number, uri: string) => {
      const sessionId = useRecorderStore.getState().sessionId;

      if (!sessionId) {
        return;
      }

      store.addLocalChunk(index, uri);
      queueRef.current?.enqueue({
        sessionId,
        index,
        localUri: uri,
        languageCode: STT_AUTO_DETECT,
      });
    },
    [store],
  );

  const flushPendingChunks = useCallback(() => {
    const sessionId = useRecorderStore.getState().sessionId;

    if (!sessionId || pendingChunksRef.current.length === 0) {
      return;
    }

    const pending = [...pendingChunksRef.current];
    pendingChunksRef.current = [];

    for (const chunk of pending) {
      enqueueChunk(chunk.index, chunk.uri);
    }
  }, [enqueueChunk]);

  const startRecording = useCallback(async () => {
    const state = useRecorderStore.getState();

    if (!canStartRecording(state)) {
      return;
    }

    store.setStatus("starting");
    store.setError(null);
    recordingActiveRef.current = true;
    pendingChunksRef.current = [];

    const token = await getAuthToken();

    if (!token) {
      recordingActiveRef.current = false;
      store.setError("Sign in to record a class session.");
      store.setStatus("failed");
      return;
    }

    if (!recordingActiveRef.current) {
      return;
    }

    try {
      const latest = useRecorderStore.getState();
      const body: CreateSessionInput = {
        topic: latest.topic.trim(),
        subject: latest.subject.trim(),
        classLevel: latest.classLevel.trim(),
        durationSeconds: 0,
      };

      sessionRef.current = new ChunkRecorderSession();

      const sessionPromise = apiFetch<{ session: SessionNode }>("/api/sessions", {
        method: "POST",
        token,
        body,
      });

      const onChunkReady = ({ index, uri }: ChunkReadyEvent): void => {
        const sessionId = useRecorderStore.getState().sessionId;

        if (sessionId) {
          enqueueChunk(index, uri);
          return;
        }

        pendingChunksRef.current.push({ index, uri, durationMs: 0 });
      };

      await sessionRef.current.start(
        recorder,
        onChunkReady,
        () => recordingActiveRef.current,
      );

      useRecorderStore.setState({
        status: "recording",
        sessionId: null,
        startedAt: new Date().toISOString(),
        elapsedSeconds: 0,
        chunks: [],
        mergedTranscript: "",
        transcriptComplete: false,
        allowPartialSend: false,
        pendingUploadCount: 0,
        errorMessage: null,
        analysisError: null,
        report: null,
        classNotes: null,
      });

      const response = await sessionPromise;

      if (!recordingActiveRef.current) {
        return;
      }

      useRecorderStore.setState({ sessionId: response.session.sessionId });
      flushPendingChunks();
    } catch (error) {
      recordingActiveRef.current = false;
      pendingChunksRef.current = [];

      if (recorder.isRecording) {
        await stopActiveSegment(recorder);
      }

      store.setError(
        error instanceof Error ? error.message : "Could not start session",
      );
      store.setStatus("failed");
    }
  }, [enqueueChunk, flushPendingChunks, getAuthToken, recorder, store]);

  const stopRecording = useCallback(async () => {
    recordingActiveRef.current = false;
    store.setStatus("stopping");

    try {
      await sessionRef.current?.stop(recorder);
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "Could not stop recording",
      );
    }

    store.setStatus("draining");

    const state = useRecorderStore.getState();
    const token = await getAuthToken();

    if (token && state.sessionId) {
      try {
        await apiFetch<{ sessionId: string }>("/api/sessions", {
          method: "PATCH",
          token,
          body: {
            sessionId: state.sessionId,
            durationSeconds: state.elapsedSeconds,
          },
        });
      } catch {
        // Session metadata update is best-effort on stop.
      }
    }

    await queueRef.current?.drain();
    finishDraining();
  }, [getAuthToken, recorder, store]);

  const toggleRecording = useCallback(() => {
    if (store.status === "recording") {
      void stopRecording();
      return;
    }

    void startRecording();
  }, [startRecording, stopRecording, store.status]);

  const sendForAnalysis = useCallback(async () => {
    const state = useRecorderStore.getState();

    if (!canSendTranscript(state) || !state.sessionId) {
      return;
    }

    const token = await getAuthToken();

    if (!token) {
      store.setAnalysisError("Sign in to analyze the transcript.");
      return;
    }

    store.setStatus("analyzing");
    store.setAnalysisError(null);

    const payload = {
      sessionId: state.sessionId,
      transcript: state.mergedTranscript,
      topic: state.topic.trim(),
      subject: state.subject.trim(),
      classLevel: state.classLevel.trim(),
      durationSeconds: state.elapsedSeconds,
      isComplete: state.transcriptComplete,
      chunkCount: state.chunks.length,
    };

    let response: AnalyzeResponse;

    try {
      response = await apiAnalyzeTranscript(token, payload);
    } catch (error) {
      // A network-level failure (offline / DNS) rejects fetch before a
      // structured error can be returned — don't leave status stuck on "analyzing".
      store.setAnalysisError(
        error instanceof Error ? error.message : "Could not analyze the class. Try again.",
      );
      store.setStatus("ready");
      return;
    }

    if ("error" in response) {
      store.setAnalysisError(response.error.message);
      store.setStatus("ready");
      return;
    }

    store.setReport(response.report);
    store.setClassNotes(response.classNotes);
    await clearPersistedQueue();
  }, [getAuthToken, store]);

  const confirmPartialSend = useCallback(() => {
    store.setAllowPartialSend(true);
  }, [store]);

  const retryAnalysis = useCallback(async () => {
    await sendForAnalysis();
  }, [sendForAnalysis]);

  const snapshot = useRecorderStore();

  return {
    topic: snapshot.topic,
    subject: snapshot.subject,
    classLevel: snapshot.classLevel,
    isRecording: snapshot.status === "recording",
    isStarting: snapshot.status === "starting",
    isTranscribing:
      snapshot.status === "stopping" || snapshot.status === "draining",
    timerLabel: formatRecorderTimer(snapshot.elapsedSeconds),
    canStartRecording: canStartRecording(snapshot),
    canSend: canSendTranscript(snapshot),
    statusMessage: getStatusMessage(snapshot),
    mergedTranscript: snapshot.mergedTranscript,
    report: snapshot.report,
    classNotes: snapshot.classNotes,
    analysisError: snapshot.analysisError,
    allowPartialSend: snapshot.allowPartialSend,
    setTopic: (value) => store.setMetadata({ topic: value }),
    setSubject: (value) => store.setMetadata({ subject: value }),
    setClassLevel: (value) => store.setMetadata({ classLevel: value }),
    toggleRecording,
    sendForAnalysis,
    confirmPartialSend,
    retryAnalysis,
  };
}
