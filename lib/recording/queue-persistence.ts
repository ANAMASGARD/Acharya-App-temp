import AsyncStorage from "@react-native-async-storage/async-storage";
import { RECORDER_QUEUE_STORAGE_KEY } from "@/lib/recording/constants";

export type PersistedQueueItem = Readonly<{
  sessionId: string;
  index: number;
  uri: string;
  attempt: number;
  nextAttemptAt: number | null;
}>;

export type PersistedQueue = Readonly<{
  sessionId: string;
  items: PersistedQueueItem[];
}>;

export async function loadPersistedQueue(): Promise<PersistedQueue | null> {
  try {
    const raw = await AsyncStorage.getItem(RECORDER_QUEUE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PersistedQueue;
  } catch {
    return null;
  }
}

export async function savePersistedQueue(queue: PersistedQueue | null): Promise<void> {
  if (!queue || queue.items.length === 0) {
    await AsyncStorage.removeItem(RECORDER_QUEUE_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(RECORDER_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function clearPersistedQueue(): Promise<void> {
  await AsyncStorage.removeItem(RECORDER_QUEUE_STORAGE_KEY);
}
