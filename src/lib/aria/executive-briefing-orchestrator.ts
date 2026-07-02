/**
 * Executive Briefing Orchestrator — additive, singleton.
 *
 * Coordinates a synchronized ~30–40s spoken KPI briefing:
 *  - Fetches a script from /api/public/aria-ask with [KPI:x] markers, or
 *    falls back to a local template composed from live KPI values.
 *  - Splits the script into segments {kpi, text} and feeds them one at a
 *    time to the existing ariaVoice queue (no changes to its internals),
 *    advancing the "active KPI" as each segment starts playing.
 *  - If TTS is disabled/unavailable, runs the same sequence silently on a
 *    per-segment timer.
 *
 * Consumers (KpiTile wrappers, ExecutiveBriefingBar, header button, ARIA
 * chip) subscribe via `useBriefingState()` / `useBriefingHighlight(key)`.
 */
import { useSyncExternalStore } from "react";
import { ariaVoice } from "@/lib/aria/voice-queue";

/** Canonical KPI tokens the model is allowed to emit as [KPI:xxx]. */
export const KPI_TOKENS = [
  "risk",
  "critical_incidents",
  "mttr",
  "resolution_rate",
  "open_wo",
  "preventive",
  "projects",
] as const;
export type KpiToken = (typeof KPI_TOKENS)[number];

/** Cards actually rendered by MissionControlStrip. */
export type CardKey =
  | "risk"
  | "compliance"
  | "incidents"
  | "wo"
  | "preventive"
  | "projects";

/** Map model tokens → visual card highlight target. */
const TOKEN_TO_CARD: Record<KpiToken, CardKey> = {
  risk: "risk",
  critical_incidents: "incidents",
  mttr: "compliance",
  resolution_rate: "compliance",
  open_wo: "wo",
  preventive: "preventive",
  projects: "projects",
};

export type BriefingMode = "hero" | "exec";

export type BriefingKpis = {
  risk_label: string;
  critical_24h: number;
  mttr_min: number;
  resolution_pct: number;
  open_wo: number;
  preventive_wo: number;
  active_projects: number;
};

type Segment = { kpi: KpiToken | null; text: string };

export type BriefingSnap = {
  active: boolean;
  paused: boolean;
  mode: BriefingMode | null;
  activeCard: CardKey | null;
  transcript: string;
  totalSegments: number;
  segmentIndex: number;
  progressKpis: KpiToken[]; // ordered list of segments with a kpi
};

const EMPTY_SNAP: BriefingSnap = {
  active: false,
  paused: false,
  mode: null,
  activeCard: null,
  transcript: "",
  totalSegments: 0,
  segmentIndex: 0,
  progressKpis: [],
};

// ---------------------------------------------------------------------------
// Script parsing & fallback template
// ---------------------------------------------------------------------------

const MARKER_RE = /\[KPI:([a-z_]+)\]/g;

export function parseScriptToSegments(raw: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  let currentKpi: KpiToken | null = null;
  const src = raw.trim();
  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const marks: Array<{ pos: number; end: number; kpi: KpiToken | null }> = [];
  while ((m = MARKER_RE.exec(src))) {
    const tok = m[1] as KpiToken;
    marks.push({
      pos: m.index,
      end: m.index + m[0].length,
      kpi: (KPI_TOKENS as readonly string[]).includes(tok) ? tok : null,
    });
  }
  if (marks.length === 0) {
    // No markers — treat as one big untagged segment.
    return src ? [{ kpi: null, text: src.replace(MARKER_RE, "").trim() }] : [];
  }
  // Text before the first marker (intro/preamble) → untagged segment.
  const preamble = src.slice(0, marks[0].pos).trim();
  if (preamble) out.push({ kpi: null, text: preamble });
  for (let i = 0; i < marks.length; i++) {
    currentKpi = marks[i].kpi;
    const start = marks[i].end;
    const end = i + 1 < marks.length ? marks[i + 1].pos : src.length;
    const chunk = src.slice(start, end).replace(MARKER_RE, "").trim();
    if (chunk) out.push({ kpi: currentKpi, text: chunk });
    last = end;
  }
  void last;
  return out;
}

function localTemplate(kpis: BriefingKpis, ar: boolean, mode: BriefingMode): string {
  const {
    risk_label,
    critical_24h,
    mttr_min,
    resolution_pct,
    open_wo,
    preventive_wo,
    active_projects,
  } = kpis;
  if (ar) {
    const parts = [
      `[KPI:risk] مستوى المخاطر الحالي ${risk_label}.`,
      `[KPI:critical_incidents] سجّلنا ${critical_24h} حادثاً حرجاً خلال الأربع والعشرين ساعة الماضية.`,
      `[KPI:mttr] متوسط زمن الاستجابة ${mttr_min} دقيقة.`,
      `[KPI:resolution_rate] نسبة الإغلاق بلغت ${resolution_pct} بالمئة.`,
      `[KPI:open_wo] لدينا ${open_wo} أمر عمل مفتوح.`,
    ];
    if (mode === "exec") {
      parts.push(`[KPI:preventive] الصيانة الوقائية النشطة ${preventive_wo} أمراً.`);
      parts.push(`[KPI:projects] المشاريع الجارية ${active_projects} مشروعاً.`);
    }
    parts.push(
      critical_24h > 2
        ? "توصيتي: تفعيل غرفة إدارة الأزمة ومراجعة الفرق الميدانية فوراً."
        : "توصيتي: الحفاظ على وتيرة الاستجابة الحالية مع مراجعة أوامر الصيانة الوقائية اليوم.",
    );
    return parts.join(" ");
  }
  const parts = [
    `[KPI:risk] Current risk level is ${risk_label}.`,
    `[KPI:critical_incidents] We logged ${critical_24h} critical incidents in the last twenty-four hours.`,
    `[KPI:mttr] Mean time to respond stands at ${mttr_min} minutes.`,
    `[KPI:resolution_rate] Resolution rate is at ${resolution_pct} percent.`,
    `[KPI:open_wo] There are ${open_wo} open work orders.`,
  ];
  if (mode === "exec") {
    parts.push(`[KPI:preventive] Preventive maintenance in flight, ${preventive_wo} orders.`);
    parts.push(`[KPI:projects] ${active_projects} active projects are in progress.`);
  }
  parts.push(
    critical_24h > 2
      ? "My recommendation: activate the crisis room and review field teams immediately."
      : "My recommendation: hold the current response tempo and clear today's preventive backlog.",
  );
  return parts.join(" ");
}

async function fetchScript(
  kpis: BriefingKpis,
  ar: boolean,
  mode: BriefingMode,
  signal: AbortSignal,
): Promise<string> {
  const lang = ar ? "ar" : "en";
  const kpiList = KPI_TOKENS.join(", ");
  const question = ar
    ? `اكتب إحاطة تنفيذية شفهية بحوالي ${mode === "exec" ? 110 : 90} كلمة، بأسلوب رئيس ديوان هادئ. غطِّ بالترتيب: مستوى المخاطر → الحوادث الحرجة آخر ٢٤ ساعة → متوسط زمن الاستجابة → نسبة الإغلاق → أوامر العمل المفتوحة${mode === "exec" ? " → الصيانة الوقائية → المشاريع الجارية" : ""} ثم جملة توصية واحدة. قبل كل جملة تخص مؤشراً، ضع علامة على شكل [KPI:xxx] حيث xxx واحد من: ${kpiList}. القيم الحيّة الآن: مخاطر=${kpis.risk_label}، حرج24س=${kpis.critical_24h}، MTTR=${kpis.mttr_min} دقيقة، نسبة الإغلاق=${kpis.resolution_pct}%، أوامر مفتوحة=${kpis.open_wo}، وقائية=${kpis.preventive_wo}، مشاريع=${kpis.active_projects}. أرقام منطوقة بوضوح. لا تضف مقدمة ولا خاتمة خارج المحتوى.`
    : `Write a spoken executive briefing of roughly ${mode === "exec" ? 110 : 90} words in a calm chief-of-staff tone. Cover in order: risk level → critical incidents last 24h → MTTR → resolution rate → open work orders${mode === "exec" ? " → preventive maintenance → active projects" : ""} then a single-sentence recommendation. Prefix every sentence that discusses a KPI with a marker of the form [KPI:xxx] where xxx is one of: ${kpiList}. Current live values: risk=${kpis.risk_label}, critical24h=${kpis.critical_24h}, MTTR=${kpis.mttr_min}min, resolution=${kpis.resolution_pct}%, open_wo=${kpis.open_wo}, preventive=${kpis.preventive_wo}, projects=${kpis.active_projects}. Speak numbers clearly. No preamble or sign-off outside the content.`;

  const res = await fetch("/api/public/aria-ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, lang }),
    signal,
  });
  if (!res.ok) throw new Error(`aria_ask_${res.status}`);
  const j = (await res.json()) as { text_ar?: string; text_en?: string };
  const text = ar ? j.text_ar : j.text_en;
  if (!text || !text.trim()) throw new Error("empty_script");
  return text.trim();
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

class BriefingOrchestrator {
  private listeners = new Set<() => void>();
  private snap: BriefingSnap = EMPTY_SNAP;
  private segments: Segment[] = [];
  private abort: AbortController | null = null;
  private timer: number | null = null;
  private unsubVoice: (() => void) | null = null;
  private lastSpeaking = false;
  private silent = false;
  private ar = false;

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  getSnapshot(): BriefingSnap {
    return this.snap;
  }
  private emit(next: Partial<BriefingSnap>): void {
    this.snap = { ...this.snap, ...next };
    this.listeners.forEach((f) => f());
  }

  isActive(): boolean {
    return this.snap.active;
  }

  async start(opts: { mode: BriefingMode; ar: boolean; kpis: BriefingKpis }): Promise<void> {
    // Prevent overlap.
    if (this.snap.active) this.stop();
    this.ar = opts.ar;
    this.abort = new AbortController();

    // Resolve script (server → local fallback).
    let script: string;
    try {
      script = await fetchScript(opts.kpis, opts.ar, opts.mode, this.abort.signal);
    } catch {
      script = localTemplate(opts.kpis, opts.ar, opts.mode);
    }
    if (this.abort.signal.aborted) return;

    const segments = parseScriptToSegments(script);
    if (!segments.length) return;
    this.segments = segments;
    const progressKpis = segments
      .map((s) => s.kpi)
      .filter((k): k is KpiToken => !!k);

    this.emit({
      active: true,
      paused: false,
      mode: opts.mode,
      activeCard: null,
      transcript: "",
      totalSegments: segments.length,
      segmentIndex: 0,
      progressKpis,
    });

    // Decide voice vs silent based on the ariaVoice user preference.
    this.silent = !ariaVoice.isEnabled();

    // Global escape / navigation stop hooks.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") this.stop();
    };
    window.addEventListener("keydown", onKey);
    // Store an unsub via unsubVoice slot (reused).
    const prevUnsub = this.unsubVoice;
    prevUnsub?.();

    if (this.silent) {
      this.unsubVoice = () => window.removeEventListener("keydown", onKey);
      this.playSegmentSilent(0);
      return;
    }

    // Subscribe to ariaVoice state transitions to advance to next segment
    // when the current chunk finishes playing.
    this.lastSpeaking = false;
    const unsubState = ariaVoice.subscribeState(() => {
      if (!this.snap.active) return;
      const s = ariaVoice.getSnapshot();
      // Advance when we transition from "was speaking" → not speaking &
      // not paused (queue drained for the segment we enqueued).
      if (this.lastSpeaking && !s.speaking && !s.paused) {
        this.advanceToNext();
      }
      this.lastSpeaking = s.speaking;
      this.emit({ paused: s.paused });
    });
    this.unsubVoice = () => {
      unsubState();
      window.removeEventListener("keydown", onKey);
    };

    this.playSegmentVoice(0);
  }

  private playSegmentVoice(idx: number): void {
    if (idx >= this.segments.length) return this.finish();
    const seg = this.segments[idx];
    this.emit({
      segmentIndex: idx,
      activeCard: seg.kpi ? TOKEN_TO_CARD[seg.kpi] : null,
      transcript: seg.text,
    });
    ariaVoice.enqueue(seg.text);
  }

  private playSegmentSilent(idx: number): void {
    if (idx >= this.segments.length) return this.finish();
    const seg = this.segments[idx];
    this.emit({
      segmentIndex: idx,
      activeCard: seg.kpi ? TOKEN_TO_CARD[seg.kpi] : null,
      transcript: seg.text,
    });
    // Estimate duration by word count, min 1.6s, max 6s.
    const words = seg.text.split(/\s+/).length;
    const ms = Math.min(6000, Math.max(1600, words * 340));
    this.timer = window.setTimeout(() => {
      if (this.snap.paused) return; // resume() will re-arm
      this.playSegmentSilent(idx + 1);
    }, ms);
  }

  private advanceToNext(): void {
    const next = this.snap.segmentIndex + 1;
    if (next >= this.segments.length) return this.finish();
    this.playSegmentVoice(next);
  }

  pause(): void {
    if (!this.snap.active) return;
    if (this.silent) {
      if (this.timer) window.clearTimeout(this.timer);
      this.timer = null;
      this.emit({ paused: true });
    } else {
      ariaVoice.interrupt();
      this.emit({ paused: true });
    }
  }
  resume(): void {
    if (!this.snap.active) return;
    if (this.silent) {
      this.emit({ paused: false });
      this.playSegmentSilent(this.snap.segmentIndex);
    } else {
      ariaVoice.resume();
      this.emit({ paused: false });
    }
  }
  skip(): void {
    if (!this.snap.active) return;
    if (this.silent) {
      if (this.timer) window.clearTimeout(this.timer);
      this.timer = null;
      this.playSegmentSilent(this.snap.segmentIndex + 1);
    } else {
      ariaVoice.clear();
      // clear() will drop 'speaking'; our subscription would try to
      // advance — pre-emptively play the next segment ourselves.
      this.lastSpeaking = false;
      this.playSegmentVoice(this.snap.segmentIndex + 1);
    }
  }
  stop(): void {
    this.cleanup(false);
  }
  private finish(): void {
    this.cleanup(true);
  }
  private cleanup(natural: boolean): void {
    if (this.abort) {
      try { this.abort.abort(); } catch { /* ignore */ }
      this.abort = null;
    }
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.unsubVoice) {
      this.unsubVoice();
      this.unsubVoice = null;
    }
    if (!this.silent) {
      try { ariaVoice.clear(); } catch { /* ignore */ }
    }
    this.segments = [];
    this.lastSpeaking = false;
    this.emit({
      active: false,
      paused: false,
      mode: null,
      activeCard: null,
      transcript: natural
        ? this.ar ? "اكتملت الإحاطة." : "Briefing complete."
        : "",
    });
  }
}

const noop: BriefingOrchestrator = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAP,
  isActive: () => false,
  start: async () => {},
  pause: () => {},
  resume: () => {},
  skip: () => {},
  stop: () => {},
} as unknown as BriefingOrchestrator;

export const briefing: BriefingOrchestrator =
  typeof window !== "undefined" ? new BriefingOrchestrator() : noop;

// SSR snapshot must be stable-identity.
const SERVER_SNAP: BriefingSnap = EMPTY_SNAP;

export function useBriefingState(): BriefingSnap {
  return useSyncExternalStore(
    (cb) => briefing.subscribe(cb),
    () => briefing.getSnapshot(),
    () => SERVER_SNAP,
  );
}

/** Returns true if the given card should be highlighted right now. */
export function useBriefingHighlight(card: CardKey): boolean {
  const s = useBriefingState();
  return s.active && s.activeCard === card;
}

/** Auto-stop on route change: components mount a listener via useLocation. */
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (briefing.isActive()) briefing.stop();
  });
}
