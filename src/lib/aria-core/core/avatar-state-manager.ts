/**
 * AvatarStateManager — canonical state machine for the ARIA Avatar Brain.
 *
 * Owns the current AvatarState + Emotion and the list of allowed transitions.
 * Pure, deterministic, no side effects, no LLM calls, no business logic.
 * Singleton — imported everywhere as `avatarStateManager`.
 */
export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "explaining"
  | "warning"
  | "success"
  | "closed";

export type Emotion =
  | "neutral"
  | "executive"
  | "friendly"
  | "confident"
  | "focused"
  | "concerned"
  | "critical"
  | "success";

export interface AvatarEvent {
  id: string;
  state: AvatarState;
  emotion: Emotion;
  source: "conversation" | "voice" | "navigation" | "system";
  priority: "low" | "medium" | "high" | "critical";
  timestamp: number;
}

type Listener = (ev: AvatarEvent) => void;

// Every state can move to every other state — the AvatarBrain arbitrates
// priority, we don't want the FSM to silently refuse a critical transition.
const ALLOWED: Record<AvatarState, ReadonlyArray<AvatarState>> = {
  idle: ["listening", "thinking", "speaking", "explaining", "warning", "success", "closed"],
  listening: ["idle", "thinking", "speaking", "warning", "closed"],
  thinking: ["idle", "listening", "speaking", "explaining", "warning", "closed"],
  speaking: ["idle", "listening", "thinking", "explaining", "warning", "success", "closed"],
  explaining: ["idle", "speaking", "thinking", "success", "warning", "closed"],
  warning: ["idle", "thinking", "speaking", "success", "closed"],
  success: ["idle", "listening", "closed"],
  closed: ["idle"],
};

class AvatarStateManager {
  private state: AvatarState = "closed";
  private emotion: Emotion = "neutral";
  private lastEvent: AvatarEvent | null = null;
  private listeners = new Set<Listener>();
  private counter = 0;

  getState(): AvatarState { return this.state; }
  getEmotion(): Emotion { return this.emotion; }
  getLastEvent(): AvatarEvent | null { return this.lastEvent; }

  canTransition(to: AvatarState): boolean {
    return ALLOWED[this.state].includes(to);
  }

  transition(
    to: AvatarState,
    emotion: Emotion,
    source: AvatarEvent["source"],
    priority: AvatarEvent["priority"] = "medium",
  ): AvatarEvent | null {
    if (to === this.state && emotion === this.emotion) return null;
    if (!this.canTransition(to)) return null;
    this.state = to;
    this.emotion = emotion;
    const ev: AvatarEvent = {
      id: `avt_${Date.now().toString(36)}_${(++this.counter).toString(36)}`,
      state: to,
      emotion,
      source,
      priority,
      timestamp: Date.now(),
    };
    this.lastEvent = ev;
    this.listeners.forEach((l) => { try { l(ev); } catch { /* isolate */ } });
    return ev;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(): void {
    this.state = "closed";
    this.emotion = "neutral";
    this.lastEvent = null;
  }
}

export const avatarStateManager = new AvatarStateManager();
