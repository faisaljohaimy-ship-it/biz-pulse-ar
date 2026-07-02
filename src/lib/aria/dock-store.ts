// Module-level store — survives route navigation without adding backend state.
export type DockTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  page?: string;
  pending?: boolean;
  error?: string;
};

type Listener = () => void;

const STATE = {
  turns: [] as DockTurn[],
  draft: "",
};

const listeners = new Set<Listener>();

export const dockStore = {
  getTurns: () => STATE.turns,
  getDraft: () => STATE.draft,
  setDraft(v: string) {
    STATE.draft = v;
    // draft is intentionally not broadcast to avoid re-renders on every keystroke
  },
  push(t: DockTurn) {
    STATE.turns = [...STATE.turns, t];
    listeners.forEach((l) => l());
  },
  patch(id: string, patch: Partial<DockTurn>) {
    STATE.turns = STATE.turns.map((x) => (x.id === id ? { ...x, ...patch } : x));
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
