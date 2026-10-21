import { create } from "zustand";

/** UI visibility only. Authorization is always rechecked by the owner chat/server. */
export const useFnnChatStore = create<{
  ownerId: string | null;
  openFor: (ownerId: string) => void;
  close: () => void;
}>((set) => ({
  ownerId: null,
  openFor: (ownerId) => set({ ownerId }),
  close: () => set({ ownerId: null }),
}));
