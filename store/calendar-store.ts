import { preferencesPersistStorage } from "@/lib/preferences-persist-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const CALENDAR_BOOKMARKS_PERSIST_KEY = "acharya-calendar-bookmarks";

type CalendarState = {
  bookmarkedSessionIds: string[];
  toggleBookmark: (sessionId: string) => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      bookmarkedSessionIds: [],
      toggleBookmark: (sessionId) => {
        const current = get().bookmarkedSessionIds;

        set({
          bookmarkedSessionIds: current.includes(sessionId)
            ? current.filter((id) => id !== sessionId)
            : [...current, sessionId],
        });
      },
    }),
    {
      name: CALENDAR_BOOKMARKS_PERSIST_KEY,
      storage: createJSONStorage(() => preferencesPersistStorage),
      partialize: (state) => ({
        bookmarkedSessionIds: state.bookmarkedSessionIds,
      }),
    },
  ),
);
