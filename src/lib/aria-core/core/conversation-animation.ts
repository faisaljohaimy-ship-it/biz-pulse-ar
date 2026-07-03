/**
 * ConversationAnimation — Phase 11 conversation-lifecycle animator.
 *
 * The ExecutiveAIOrchestrator already emits the primary transitions
 * (thinking → speaking → success/error). This module handles the
 * lightweight lifecycle around them:
 *
 *   • Avatar open/close mirrors AriaMode changes
 *   • Turn cancelled / failed → return to idle cleanly
 *   • Duplicate signals are suppressed
 */
import { avatarBrain } from "./avatar-brain";
import { useAriaStore } from "../state/aria-store";
import type { AriaMode, AriaTurn } from "../types/aria";

class ConversationAnimation {
  private unsub: (() => void) | null = null;
  private lastMode: AriaMode | null = null;
  private lastTurnStatus: AriaTurn["status"] | null = null;

  start(): () => void {
    if (this.unsub) return () => this.stop();
    this.unsub = useAriaStore.subscribe((s) => {
      this.handleMode(s.mode);
      this.handleTurn(s.activeTurn);
    });
    // Prime lastMode without triggering onOpen at mount.
    this.lastMode = useAriaStore.getState().mode;
    return () => this.stop();
  }

  stop(): void {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.lastMode = null;
    this.lastTurnStatus = null;
  }

  private handleMode(mode: AriaMode): void {
    if (mode === this.lastMode) return;
    const prev = this.lastMode;
    this.lastMode = mode;
    if (mode === "collapsed" && prev !== null) {
      avatarBrain.onClose();
    } else if (mode !== "collapsed" && (prev === "collapsed" || prev === null)) {
      avatarBrain.onOpen();
    }
  }

  private handleTurn(turn: AriaTurn | null): void {
    const status = turn?.status ?? null;
    if (status === this.lastTurnStatus) return;
    this.lastTurnStatus = status;
    if (status === "cancelled" || status === "failed") {
      avatarBrain.onListeningEnd();
    }
  }
}

export const conversationAnimation = new ConversationAnimation();
