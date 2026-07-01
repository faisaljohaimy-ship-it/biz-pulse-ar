/**
 * ARIA Executive Auto-Scan (client-only, silent).
 *
 * Polls the public briefing endpoint in the background so ARIA is
 * proactive rather than reactive. Pushes the greeting once per session
 * as an assistant turn (Executive Greeting) and appends new
 * high-severity priorities as anchored assistant turns so any existing
 * surface that reads ariaSessionMemory (Dock, HUD, voice layer) picks
 * them up without a UI redesign.
 *
 * Zero DOM output. SSR-safe. Idempotent — dedupes by priority
 * signature and enforces a minimum interval between notices.
 */
import { useEffect, useRef } from "react";
import { ariaSessionMemory } from "./session-memory";

const POLL_MS = 90_000;
const MIN_NOTICE_INTERVAL_MS = 5 * 60_000;
const GREETING_KEY = "nexios.aria.exec-greeting.v1";
const SEEN_KEY = "nexios.aria.exec-seen.v1";

interface BriefingPriority {
  title_en: string;
  title_ar: string;
  severity: "critical" | "elevated" | "watch" | "info";
  evidence: string;
  recommendation_en: string;
  recommendation_ar: string;
  priority: 1 | 2 | 3;
  confidence: number;
  expected_impact_en: string;
  expected_impact_ar: string;
  next_actions: string[];
}

interface Briefing {
  generatedAt: string;
  health: {
    openIncidents: number;
    alerts24h: number;
    overdueWorkOrders: number;
    patrolsPlannedToday: number;
    patrolsDoneToday: number;
    reportsLast24h: number;
  };
  approvals: { kind: string; id: string; label: string; due_at?: string }[];
  priorities: BriefingPriority[];
  greeting_en: string;
  greeting_ar: string;
  sources: string[];
  insightCount: number;
}

interface WindowWithAriaBriefing {
  __aria_briefing?: {
    latest: Briefing | null;
    fetchedAt: string | null;
    refresh: () => Promise<Briefing | null>;
  };
}

function sig(p: BriefingPriority): string {
  return `${p.severity}:${p.title_en}`;
}

function readSeen(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeSeen(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    // Cap at 100 entries to bound growth.
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 100);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

function greetedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(GREETING_KEY) === "1";
  } catch {
    return true;
  }
}

function markGreeted() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GREETING_KEY, "1");
  } catch {
    /* ignore */
  }
}

async function fetchBriefing(signal: AbortSignal): Promise<Briefing | null> {
  try {
    const r = await fetch("/api/public/aria-briefing", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as Briefing;
  } catch {
    return null;
  }
}

function publish(briefing: Briefing) {
  if (typeof window === "undefined") return;
  const w = window as unknown as WindowWithAriaBriefing;
  w.__aria_briefing = {
    latest: briefing,
    fetchedAt: new Date().toISOString(),
    refresh: async () => briefing,
  };
  try {
    window.dispatchEvent(
      new CustomEvent("aria:briefing", { detail: briefing }),
    );
  } catch {
    /* ignore */
  }
}

function processBriefing(briefing: Briefing) {
  publish(briefing);

  // Executive Greeting: fire once per browser session.
  if (!greetedThisSession() && briefing.greeting_en) {
    ariaSessionMemory.push({
      role: "assistant",
      text: briefing.greeting_en,
      anchors: [{ kind: "greeting", id: "session-start", label: "Executive greeting" }],
    });
    markGreeted();
  }

  // Proactive insight notices: only surface new high-severity items,
  // debounced so the dock isn't spammed.
  const now = Date.now();
  const seen = readSeen();
  const newlyPushed: string[] = [];
  for (const p of briefing.priorities) {
    if (p.severity !== "critical" && p.severity !== "elevated") continue;
    const key = sig(p);
    const last = seen[key] ?? 0;
    if (now - last < MIN_NOTICE_INTERVAL_MS) continue;
    seen[key] = now;
    newlyPushed.push(key);
    const notice =
      `[Proactive · ${p.severity.toUpperCase()}] ${p.title_en}\n` +
      `Evidence: ${p.evidence}\n` +
      `Recommendation: ${p.recommendation_en}\n` +
      `Expected impact: ${p.expected_impact_en}\n` +
      `Confidence: ${Math.round(p.confidence * 100)}%`;
    ariaSessionMemory.push({
      role: "assistant",
      text: notice,
      anchors: [
        {
          kind: "insight",
          id: key,
          label: p.title_en.slice(0, 80),
        },
      ],
    });
  }
  if (newlyPushed.length) writeSeen(seen);
}

/**
 * Start the silent background scanner. Runs once at mount, then on an
 * interval. Also refreshes on tab focus. Never renders anything.
 */
export function useAriaAutoScan() {
  const startedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (startedRef.current) return;
    startedRef.current = true;

    const ctrl = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;
    let running = false;

    const tick = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const b = await fetchBriefing(ctrl.signal);
        if (b) processBriefing(b);
      } finally {
        running = false;
      }
    };

    // Kick off after a brief delay so the shell mounts first.
    const kickoff = window.setTimeout(() => {
      void tick();
      timer = setInterval(() => void tick(), POLL_MS);
    }, 800);

    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ctrl.abort();
      window.clearTimeout(kickoff);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
