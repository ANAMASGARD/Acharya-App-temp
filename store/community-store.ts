import { create } from "zustand";

type CommunityDraft = Readonly<{
  title: string;
  body: string;
  subjectTag: string;
  linkUrl: string;
  groupId: string;
}>;

type CommunityStoreState = Readonly<{
  draftPost: CommunityDraft;
  setDraftPost: (patch: Partial<CommunityDraft>) => void;
  clearDraftPost: () => void;
}>;

const EMPTY_DRAFT: CommunityDraft = {
  title: "",
  body: "",
  subjectTag: "General",
  linkUrl: "",
  groupId: "",
};

export const useCommunityStore = create<CommunityStoreState>((set) => ({
  draftPost: EMPTY_DRAFT,
  setDraftPost: (patch) =>
    set((state) => ({
      draftPost: { ...state.draftPost, ...patch },
    })),
  clearDraftPost: () => set({ draftPost: EMPTY_DRAFT }),
}));
