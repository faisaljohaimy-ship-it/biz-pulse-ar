/**
 * ConversationAnimation — Phase 11 conversation-lifecycle animator.
 *
 * The ExecutiveAIOrchestrator already emits the primary transitions
 * (thinking → speaking → success/error). This module handles the
 * lightweight lifecycle around them:
 *
 *   • Avatar open/close mirrors SadeedMode changes
 *   • Turn cancelled / failed → return to idle cleanly
 *   • Duplicate signals are suppressed
 */
import { avatarBrain } from "./avatar-brain";
import { useSadeedStore } from "../state/sadeed-store";
import type { SadeedMode, SadeedTurn } from "../types/sadeed";

class ConversationAnimation {
  private unsub: (() => void) | null = null;
  private lastMode: SadeedMode | null = null;
  private lastTurnStatus: SadeedTurn["status"] | null = null;

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = useSadeedStore.subscribe((s) => {
      this.handleMode(s.mode);
      this.handleTurn(s.activeTurn);
    });
    // Prime lastMode without triggering onOpen at mount.
    this.lastMode = useSadeedStore.getState().mode;
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

  private handleMode(mode: SadeedMode): void {
    if (mode === this.lastMode) return;
    const prev = this.lastMode;
    this.lastMode = mode;
    if (mode === "collapsed" && prev !== null) {
      avatarBrain.onClose();
    } else if (mode !== "collapsed" && (prev === "collapsed" || prev === null)) {
      avatarBrain.onOpen();
    }
  }

  private handleTurn(turn: SadeedTurn | null): void {
    const status = turn?.status ?? null;
    if (status === this.lastTurnStatus) return;
    this.lastTurnStatus = status;
    if (status === "cancelled" || status === "failed") {
      avatarBrain.onListeningEnd();
    }
  }
}

export const conversationAnimation = new ConversationAnimation();
