/**
 * AriaLiveBriefing — always-on executive newsroom & operations watch.
 *
 * Additive layer on top of the existing ARIA context engine.
 * Zero fabrication: every update is derived from real widget snapshots
 * registered via `useRegisterWidget` (KPIs, tables, notifications, etc.).
 *
 * Rules honoured:
 *  - Silent by default. Visual only. No auto-voice.
 *  - Single instance (mounted once in __root).
 *  - Hides when the authenticated AriaDock owns the screen (`window.__aria_dock`).
 *  - Hides when the GlobalAriaCopilot panel is open (avoid two ARIA surfaces).
 *  - Persists acknowledgements + mute preference in localStorage.
 *  - Mobile-clean: collapses to a compact pill; expands on tap.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  Radio,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useAriaSnapshot, type AriaWidgetSnapshot } from "@/lib/aria/context-engine";

type Priority = "critical" | "high" | "medium" | "low" | "info";
type UpdateKind = "breaking" | "risk" | "gap" | "change" | "health";

interface BriefingItem {
  readonly id: string;
  readonly priority: Priority;
  readonly kind: UpdateKind;
  readonly title_ar: string;
  readonly title_en: string;
  readonly detail_ar?: string;
  readonly detail_en?: string;
  readonly at: number;
  readonly source: string;
}

const MUTE_KEY = "aria-briefing-muted-v1";
const ACK_KEY = "aria-briefing-ack-v1";
const OPEN_KEY = "aria-briefing-open-v1";
const MAX_ITEMS = 40;

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 4, high: 3, medium: 2, low: 1, info: 0,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "border-red-500/60 bg-red-500/10 text-red-200",
  high:     "border-amber-400/60 bg-amber-500/10 text-amber-200",
  medium:   "border-cyan-400/50 bg-cyan-500/10 text-cyan-100",
  low:      "border-slate-500/40 bg-slate-500/10 text-slate-200",
  info:     "border-slate-600/40 bg-slate-700/10 text-slate-300",
};

const PRIORITY_LABEL_AR: Record<Priority, string> = {
  critical: "حرج", high: "عالي", medium: "متوسط", low: "منخفض", info: "معلومة",
};
const PRIORITY_LABEL_EN: Record<Priority, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info",
};

// ---------------------------------------------------------------------------
// Derivation — pure functions over the current widget snapshot.
// ---------------------------------------------------------------------------

function classifyWidget(w: AriaWidgetSnapshot): Priority {
  const hay = `${w.label ?? ""} ${w.hint ?? ""}`.toLowerCase();
  const v = typeof w.value === "number" ? w.value : Number(w.value);
  if (/critical|حرج/.test(hay) && Number.isFinite(v) && v > 0) return "critical";
  if (/(incident|بلاغ).*open|(open|مفتوح).*(incident|بلاغ)/.test(hay) && v > 0) return "high";
  if (/(overdue|متأخر|late)/.test(hay) && v > 0) return "high";
  if (/(risk|مخاطر)/.test(hay) && v > 0) return "medium";
  if (/(alert|تنبيه|cctv)/.test(hay) && v > 0) return "medium";
  return "info";
}

function toKind(w: AriaWidgetSnapshot): UpdateKind {
  const hay = `${w.label ?? ""} ${w.hint ?? ""}`.toLowerCase();
  if (/(risk|مخاطر)/.test(hay)) return "risk";
  if (/(overdue|متأخر|missing|ناقص|gap|فجوة)/.test(hay)) return "gap";
  if (/(critical|حرج|breaking|عاجل)/.test(hay)) return "breaking";
  if (/(health|صحة|uptime|جاهزية)/.test(hay)) return "health";
  return "change";
}

function signature(w: AriaWidgetSnapshot): string {
  const v = typeof w.value === "object" ? JSON.stringify(w.value) : String(w.value ?? "");
  return `${w.id}::${v}`;
}

function buildItem(w: AriaWidgetSnapshot, page: string): BriefingItem | null {
  const priority = classifyWidget(w);
  if (priority === "info") return null; // don't spam
  const kind = toKind(w);
  const val = typeof w.value === "number" || typeof w.value === "string" ? String(w.value) : "";
  return {
    id: `${w.id}::${signature(w)}::${Date.now()}`,
    priority,
    kind,
    title_ar: `${w.label ?? "تحديث"} — ${val || "تغيّر"}`,
    title_en: `${w.label ?? "Update"} — ${val || "changed"}`,
    detail_ar: w.hint,
    detail_en: w.hint,
    at: Date.now(),
    source: page,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AriaLiveBriefing() {
  const snap = useAriaSnapshot();
  const [mounted, setMounted] = useState(false);
  const [hiddenForDock, setHiddenForDock] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [items, setItems] = useState<BriefingItem[]>([]);
  const [ack, setAck] = useState<Set<string>>(new Set());
  const lastSigRef = useRef<Map<string, string>>(new Map());

  // Hydrate prefs.
  useEffect(() => {
    setMounted(true);
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
      const raw = localStorage.getItem(ACK_KEY);
      if (raw) setAck(new Set(JSON.parse(raw) as string[]));
      const htmlLang = document.documentElement.getAttribute("lang");
      if (htmlLang === "ar" || document.documentElement.dir === "rtl") setLang("ar");
    } catch { /* noop */ }
  }, []);

  // Persist prefs.
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* noop */ }
  }, [muted, mounted]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ }
  }, [open, mounted]);
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(ACK_KEY, JSON.stringify(Array.from(ack).slice(-200))); } catch { /* noop */ }
  }, [ack, mounted]);

  // Probe for the authenticated dock + copilot presence.
  useEffect(() => {
    const probe = () => {
      try {
        const w = window as unknown as { __aria_dock?: boolean; __aria_copilot_open?: boolean };
        setHiddenForDock(Boolean(w.__aria_dock));
        setCopilotOpen(Boolean(w.__aria_copilot_open));
      } catch { /* noop */ }
    };
    probe();
    const id = setInterval(probe, 1200);
    return () => clearInterval(id);
  }, []);

  // Continuously watch widget snapshot for real changes.
  useEffect(() => {
    const path = snap.page.path;
    const nextItems: BriefingItem[] = [];
    for (const w of snap.widgets) {
      const sig = signature(w);
      const prev = lastSigRef.current.get(w.id);
      if (prev === sig) continue;
      lastSigRef.current.set(w.id, sig);
      if (prev === undefined) continue; // first sighting isn't "news"
      const it = buildItem(w, path);
      if (it) nextItems.push(it);
    }
    if (nextItems.length === 0) return;
    setItems((prev) => [...nextItems, ...prev].slice(0, MAX_ITEMS));
  }, [snap]);

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => !ack.has(i.id))
        .sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] || b.at - a.at),
    [items, ack],
  );

  const criticalCount = visibleItems.filter((i) => i.priority === "critical").length;
  const highCount = visibleItems.filter((i) => i.priority === "high").length;

  const acknowledge = useCallback((id: string) => {
    setAck((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAck((s) => {
      const next = new Set(s);
      for (const it of visibleItems) next.add(it.id);
      return next;
    });
  }, [visibleItems]);

  const askAria = useCallback((prompt: string) => {
    try {
      window.dispatchEvent(new CustomEvent("aria:open", { detail: { prompt } }));
    } catch { /* noop */ }
  }, []);

  // Hide surface: unmounted, blocked by dock, muted (still keeps state), or copilot expanded.
  if (!mounted || hiddenForDock || copilotOpen) return null;

  const ar = lang === "ar";
  const totalNew = visibleItems.length;
  const hasBreaking = criticalCount > 0;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-none fixed inset-x-3 bottom-24 z-40 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-6 sm:end-24 sm:w-[360px]"
      aria-live="polite"
    >
      {/* Collapsed pill */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`pointer-events-auto group flex items-center gap-2 self-end rounded-full border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur transition ${
            hasBreaking
              ? "border-red-500/70 bg-red-500/20 text-red-100 animate-pulse"
              : totalNew > 0
                ? "border-cyan-400/60 bg-[#061A2E]/90 text-cyan-100"
                : "border-slate-600/50 bg-[#061A2E]/85 text-slate-300"
          }`}
          aria-label={ar ? "لوحة ARIA التنفيذية" : "ARIA Live Briefing"}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>{ar ? "ARIA — البث التنفيذي" : "ARIA Live"}</span>
          {totalNew > 0 && (
            <span className={`ms-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${hasBreaking ? "bg-red-500 text-white" : "bg-cyan-400 text-[#061A2E]"}`}>
              {totalNew}
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="pointer-events-auto rounded-2xl border border-cyan-400/40 bg-[#061A2E]/95 shadow-2xl backdrop-blur-md">
          <header className="flex items-center justify-between gap-2 border-b border-cyan-400/20 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Radio className={`h-4 w-4 ${hasBreaking ? "text-red-400 animate-pulse" : "text-cyan-300"}`} />
              <span>{ar ? "لوحة ARIA التنفيذية" : "ARIA Live Briefing"}</span>
              {hasBreaking && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {ar ? "عاجل" : "Breaking"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
                className="rounded-md border border-cyan-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-500/10"
                aria-label="Toggle language"
              >
                {ar ? "EN" : "AR"}
              </button>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="rounded-md p-1 text-cyan-200 hover:bg-cyan-500/10"
                aria-label={muted ? "Unmute non-urgent" : "Mute non-urgent"}
                title={muted ? (ar ? "تشغيل التنبيهات غير العاجلة" : "Unmute non-urgent") : (ar ? "كتم غير العاجل" : "Mute non-urgent")}
              >
                {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-cyan-200 hover:bg-cyan-500/10"
                aria-label="Collapse"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Meta strip */}
          <div className="flex items-center justify-between gap-2 border-b border-cyan-400/10 px-3 py-1.5 text-[10px] text-cyan-200/80">
            <span>
              {ar ? "حرج" : "Critical"}: <b className="text-red-300">{criticalCount}</b>
              {" · "}
              {ar ? "عالي" : "High"}: <b className="text-amber-300">{highCount}</b>
              {" · "}
              {ar ? "الكل" : "All"}: <b>{totalNew}</b>
            </span>
            <button
              type="button"
              onClick={() => askAria(ar ? "أعطني ملخصاً تنفيذياً لآخر التحديثات." : "Give me an executive summary of the latest updates.")}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 px-2 py-0.5 font-semibold text-cyan-200 hover:bg-cyan-500/10"
            >
              <Sparkles className="h-3 w-3" />
              {ar ? "ملخص تنفيذي" : "Summary"}
            </button>
          </div>

          {/* Timeline */}
          <div className="max-h-[52vh] overflow-y-auto px-2 py-2">
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-center text-xs text-cyan-200/60">
                <ShieldAlert className="h-4 w-4 opacity-60" />
                <span>{ar ? "لا توجد مستجدات الآن. ARIA تراقب بهدوء." : "No updates. ARIA is quietly monitoring."}</span>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {visibleItems
                  .filter((i) => !muted || i.priority === "critical" || i.priority === "high")
                  .map((it) => (
                    <li
                      key={it.id}
                      className={`rounded-lg border px-2.5 py-2 text-xs ${PRIORITY_STYLES[it.priority]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full border border-current/40 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide">
                              {ar ? PRIORITY_LABEL_AR[it.priority] : PRIORITY_LABEL_EN[it.priority]}
                            </span>
                            {it.kind === "risk" && <AlertTriangle className="h-3 w-3" />}
                            <span className="truncate text-[11px] font-semibold">
                              {ar ? it.title_ar : it.title_en}
                            </span>
                          </div>
                          {(ar ? it.detail_ar : it.detail_en) && (
                            <p className="mt-0.5 line-clamp-2 text-[10.5px] opacity-80">
                              {ar ? it.detail_ar : it.detail_en}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[9.5px] opacity-60">
                            <span>{new Date(it.at).toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>·</span>
                            <span className="truncate">{it.source}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => acknowledge(it.id)}
                            className="rounded p-1 hover:bg-white/10"
                            aria-label={ar ? "تم الاطلاع" : "Acknowledge"}
                            title={ar ? "تم الاطلاع" : "Acknowledge"}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              askAria(
                                (ar
                                  ? `اشرح لي هذا التحديث واقترح إجراءً: ${it.title_ar}`
                                  : `Explain this update and suggest an action: ${it.title_en}`),
                              )
                            }
                            className="rounded p-1 hover:bg-white/10"
                            aria-label={ar ? "اسأل ARIA" : "Ask ARIA"}
                            title={ar ? "اسأل ARIA" : "Ask ARIA"}
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Footer actions */}
          <footer className="flex items-center justify-between gap-2 border-t border-cyan-400/20 px-3 py-2 text-[10.5px]">
            <button
              type="button"
              onClick={acknowledgeAll}
              disabled={visibleItems.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-400/30 px-2 py-1 font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-40"
            >
              <X className="h-3 w-3" />
              {ar ? "مسح الكل" : "Clear all"}
            </button>
            <button
              type="button"
              onClick={() =>
                askAria(
                  ar
                    ? "ما الأولوية الآن؟ وما الذي قد يسبب مشكلة قريباً؟"
                    : "What is the top priority right now, and what may cause a problem soon?",
                )
              }
              className="inline-flex items-center gap-1 rounded-md bg-cyan-400/90 px-2.5 py-1 font-bold text-[#061A2E] hover:bg-cyan-300"
            >
              <ChevronUp className="h-3 w-3" />
              {ar ? "استشر ARIA" : "Consult ARIA"}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

export default AriaLiveBriefing;
