/**
 * ARIA Executive Session Memory.
 *
 * Lightweight rolling history of Q/A turns and referenceable "anchors"
 * (last incident, last report, last selected object) so ARIA can resolve
 * follow-up references like "this", "that report", "the previous
 * incident" without asking again.
 *
 * Persisted to `localStorage` per-browser. Never touches the network.
 * SSR-safe (all storage access guarded by `typeof window`).
 */

export interface AriaTurn {
  role: "user" | "assistant";
  text: string;
  page?: string;
  /** Named anchors this turn touched: `{ kind: "incident", id, label }`. */
  anchors?: AriaAnchor[];
  ts: string;
}

export interface AriaAnchor {
  kind: string;
  id: string;
  label?: string;
}

const STORAGE_KEY = "nexios.aria.session-memory.v1";
const MAX_TURNS = 24;
const MAX_ANCHORS = 12;

interface MemoryShape {
  turns: AriaTurn[];
  anchors: AriaAnchor[];
}

function empty(): MemoryShape {
  return { turns: [], anchors: [] };
}

function readStore(): MemoryShape {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<MemoryShape>;
    return {
      turns: Array.isArray(parsed.turns) ? parsed.turns.slice(-MAX_TURNS) : [],
      anchors: Array.isArray(parsed.anchors)
        ? parsed.anchors.slice(-MAX_ANCHORS)
        : [],
    };
  } catch {
    return empty();
  }
}

function writeStore(m: MemoryShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* quota / private mode — ignore */
  }
}

export const ariaSessionMemory = {
  list(): AriaTurn[] {
    return readStore().turns;
  },
  anchors(): AriaAnchor[] {
    return readStore().anchors;
  },
  push(turn: Omit<AriaTurn, "ts">) {
    const m = readStore();
    m.turns.push({ ...turn, ts: new Date().toISOString() });
    if (turn.anchors?.length) {
      const merged = [...m.anchors, ...turn.anchors];
      const seen = new Set<string>();
      m.anchors = merged
        .reverse()
        .filter((a) => {
          const k = `${a.kind}:${a.id}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .reverse()
        .slice(-MAX_ANCHORS);
    }
    m.turns = m.turns.slice(-MAX_TURNS);
    writeStore(m);
  },
  clear() {
    writeStore(empty());
  },
};
