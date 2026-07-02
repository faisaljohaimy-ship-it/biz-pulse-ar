// Deterministic motion state machine with allowed transitions.
import type { MotionState } from "./types";

const T: Record<MotionState, readonly MotionState[]> = {
  idle:        ["listening","thinking","greeting","speaking","warning","success","error"],
  greeting:    ["idle","listening","speaking"],
  listening:   ["idle","thinking","interrupted"],
  thinking:    ["speaking","interrupted","idle","explaining"],
  speaking:    ["idle","interrupted","explaining","listening","warning","success","error"],
  explaining:  ["speaking","idle","listening"],
  interrupted: ["idle","listening"],
  warning:     ["idle","speaking"],
  success:     ["idle","speaking"],
  error:       ["idle","speaking"],
};

export class MotionStateMachine {
  private state: MotionState = "idle";
  private history: { from: MotionState; to: MotionState; ts: number }[] = [];
  private listeners = new Set<(s: MotionState) => void>();

  get current(): MotionState { return this.state; }
  canTransition(to: MotionState): boolean { return T[this.state].includes(to); }

  transition(to: MotionState, ts: number = Date.now()): boolean {
    if (!this.canTransition(to)) return false;
    const from = this.state;
    this.state = to;
    this.history.push({ from, to, ts });
    if (this.history.length > 200) this.history.shift();
    for (const l of this.listeners) { try { l(to); } catch { /* isolated */ } }
    return true;
  }

  subscribe(l: (s: MotionState) => void): () => void {
    this.listeners.add(l); return () => { this.listeners.delete(l); };
  }

  recent(n = 20): readonly { from: MotionState; to: MotionState; ts: number }[] {
    return this.history.slice(-n);
  }
}
