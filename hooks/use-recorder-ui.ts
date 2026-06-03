import { useCallback, useEffect, useMemo, useState } from "react";

export function formatRecorderTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type UseRecorderUiResult = Readonly<{
  topic: string;
  subject: string;
  classLevel: string;
  isRecording: boolean;
  elapsedSeconds: number;
  timerLabel: string;
  canStartRecording: boolean;
  setTopic: (value: string) => void;
  setSubject: (value: string) => void;
  setClassLevel: (value: string) => void;
  toggleRecording: () => void;
}>;

export function useRecorderUi(): UseRecorderUiResult {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const canStartRecording = useMemo(
    () =>
      topic.trim().length > 0 &&
      subject.trim().length > 0 &&
      classLevel.trim().length > 0,
    [classLevel, subject, topic],
  );

  const startRecording = useCallback((): void => {
    if (!canStartRecording) {
      return;
    }
    setElapsedSeconds(0);
    setIsRecording(true);
  }, [canStartRecording]);

  const stopRecording = useCallback((): void => {
    setIsRecording(false);
    setElapsedSeconds(0);
  }, []);

  const toggleRecording = useCallback((): void => {
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isRecording]);

  const timerLabel = formatRecorderTimer(elapsedSeconds);

  return {
    topic,
    subject,
    classLevel,
    isRecording,
    elapsedSeconds,
    timerLabel,
    canStartRecording,
    setTopic,
    setSubject,
    setClassLevel,
    toggleRecording,
  };
}
