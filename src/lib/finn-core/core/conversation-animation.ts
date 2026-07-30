/**
 * ConversationAnimation — Phase 11 conversation-lifecycle animator.
 *
 * The ExecutiveAIOrchestrator already emits the primary transitions
 * (thinking → speaking → success/error). This module handles the
 * lightweight lifecycle around them:
 *
 *   • Avatar open/close mirrors FinnMode changes
 *   • Turn cancelled / failed → return to idle cleanly
 *   • Duplicate signals are suppressed
 */
import { avatarBrain } from "./avatar-brain";
import { useFinnStore } from "../state/finn-store";
import type { FinnMode, FinnTurn } from "../types/finn";

class ConversationAnimation {
  private unsub: (() => void) | null = null;
  private lastMode: FinnMode | null = null;
  private lastTurnStatus: FinnTurn["status"] | null = null;

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = useFinnStore.subscribe((s) => {
      this.handleMode(s.mode);
      this.handleTurn(s.activeTurn);
    });
    // Prime lastMode without triggering onOpen at mount.
    this.lastMode = useFinnStore.getState().mode;
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
    this.lastMode = null;
    this.lastTurnStatus = null;
  }

  private handleMode(mode: FinnMode): void {
    if (mode === this.lastMode) return;
    const prev = this.lastMode;
    this.lastMode = mode;
    if (mode === "collapsed" && prev !== null) {
      avatarBrain.onClose();
    } else if (mode !== "collapsed" && (prev === "collapsed" || prev === null)) {
      avatarBrain.onOpen();
    }
  }

  private handleTurn(turn: FinnTurn | null): void {
    const status = turn?.status ?? null;
    if (status === this.lastTurnStatus) return;
    this.lastTurnStatus = status;
    if (status === "cancelled" || status === "failed") {
      avatarBrain.onListeningEnd();
    }
  }
}

export const conversationAnimation = new ConversationAnimation();
