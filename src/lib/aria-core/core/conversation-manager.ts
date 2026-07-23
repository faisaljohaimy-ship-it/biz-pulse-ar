/**
 * ConversationManager — turn lifecycle for the ONE FINN conversation.
 *
 * Messages themselves live inside the singleton `useChat` — this manager only
 * owns per-turn metadata (id, status, abort controller, dedupe guard). It
 * mirrors status into the store so any component can read via useFinn().
 */
import type { FinnIntent, FinnTurn } from "../types/aria";
import { useFinnStore } from "../state/aria-store";

let activeController: AbortController | null = null;
let activeTurnId: string | null = null;
let lastSubmittedText: string | null = null;
let lastSubmittedAt = 0;

const DEDUPE_WINDOW_MS = 800;

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const conversationManager = {
  /** Returns null when the request is a duplicate inside the dedupe window. */
  beginTurn(text: string, intent: FinnIntent): FinnTurn | null {
    const now = Date.now();
    if (lastSubmittedText === text && now - lastSubmittedAt < DEDUPE_WINDOW_MS) {
      return null;
    }
    lastSubmittedText = text;
    lastSubmittedAt = now;

    // Cancel a still-pending turn — one active request at a time.
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    activeController = new AbortController();

    const turn: FinnTurn = {
      id: newId(),
      startedAt: new Date(now).toISOString(),
      status: "queued",
      intent,
    };
    activeTurnId = turn.id;
    useFinnStore.getState().setActiveTurn(turn);
    return turn;
  },
  markStreaming(turnId: string) {
    if (turnId !== activeTurnId) return;
    const current = useFinnStore.getState().activeTurn;
    if (!current) return;
    useFinnStore.getState().setActiveTurn({ ...current, status: "streaming" });
  },
  completeTurn(turnId: string) {
    if (turnId !== activeTurnId) return;
    const current = useFinnStore.getState().activeTurn;
    if (!current) return;
    useFinnStore.getState().setActiveTurn({
      ...current,
      status: "completed",
      endedAt: new Date().toISOString(),
    });
    activeController = null;
    activeTurnId = null;
  },
  failTurn(turnId: string, error: string) {
    if (turnId !== activeTurnId) return;
    const current = useFinnStore.getState().activeTurn;
    if (!current) return;
    useFinnStore.getState().setActiveTurn({
      ...current,
      status: "failed",
      error,
      endedAt: new Date().toISOString(),
    });
    activeController = null;
    activeTurnId = null;
  },
  cancel() {
    if (!activeController) return;
    activeController.abort();
    const current = useFinnStore.getState().activeTurn;
    if (current) {
      useFinnStore.getState().setActiveTurn({
        ...current,
        status: "cancelled",
        endedAt: new Date().toISOString(),
      });
    }
    activeController = null;
    activeTurnId = null;
  },
  signal(): AbortSignal | undefined {
    return activeController?.signal;
  },
};
