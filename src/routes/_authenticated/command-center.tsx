/**
 * مركز القيادة الذكي — AI Command Center
 *
 * ONE resilient state source (getCommandCenterState: live rows win, the
 * reference simulation serves silence) feeds every zone, and the header
 * counters are derived from the SAME arrays the boards render — a counter
 * can never contradict its board (constitution art. 6).
 *
 * Zones:
 *   1) KPI pulse — six live counters with severity halos + thin sparklines
 *   2) نبض المناطق — interactive peninsula map (regions.ts geometry) with
 *      severity-radiant sectors, pulsing asset dots, floating glass card
 *   3) خط الاعتماد — the constitutional identity: proposal → prepare →
 *      HUMAN approval (emerald lock finale); real pipeline dots, tappable
 *   4) مجلس الوكلاء — 8 geometric avatars glowing by status
 *   5) الأعمال العاجلة وSLA — countdown strips; overdue leads, red pulse
 *
 * ملخص آريا is generated locally from the SAME state (guaranteed-reply
 * doctrine) and spoken via Layan ONLY on click. Motion discipline: every
 * halo/pulse comes from the .holo-sev-* scale (transform/opacity only,
 * frozen under prefers-reduced-motion).
 */
import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PresentationToggle } from "@/components/executive/PresentationToggle";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, CheckCircle2, Loader2, Lock, Radio, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAriaSpeech } from "@/hooks/useAriaSpeech";
import { REGIONS, REGION_ACCENT_RGB, type RegionId } from "@/lib/regions";
import {
  getCommandCenterState,
  type CommandCenterState,
  type CommandSeverity,
} from "@/lib/exec/command-center.functions";

export const Route = createFileRoute("/_authenticated/command-center")({
  component: CommandCenterPage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/command-center" />
  ),
});

/* ═══════════════════════ Utilities ═══════════════════════ */

const SEV_CLASS: Record<CommandSeverity, string> = {
  critical: "holo-sev holo-sev-critical",
  high: "holo-sev holo-sev-high",
  medium: "holo-sev holo-sev-medium",
  healthy: "holo-sev holo-sev-healthy",
  idle: "holo-sev holo-sev-idle",
};
const SEV_RGB: Record<CommandSeverity, string> = {
  critical: "248,113,113",
  high: "251,191,36",
  medium: "34,211,238",
  healthy: "16,185,129",
  idle: "100,140,190",
};

function slaChip(due_at: string | null): {
  text: string;
  sev: CommandSeverity;
  ratio: number;
} {
  if (!due_at) return { text: "بدون موعد", sev: "idle", ratio: 0 };
  const ms = new Date(due_at).getTime() - Date.now();
  const absH = Math.floor(Math.abs(ms) / 3_600_000);
  const absM = Math.floor((Math.abs(ms) % 3_600_000) / 60_000);
  if (ms < 0) return { text: `تجاوز ${absH}س ${absM}د`, sev: "critical", ratio: 1 };
  if (ms < 4 * 3_600_000) return { text: `متبقٍ ${absH}س ${absM}د`, sev: "high", ratio: 0.9 };
  if (ms < 24 * 3_600_000) return { text: `متبقٍ ${absH}س`, sev: "medium", ratio: 0.55 };
  const d = Math.floor(ms / 86_400_000);
  return { text: `متبقٍ ${d} يوم`, sev: "healthy", ratio: 0.25 };
}

function relMinutes(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "آخر نبض قبل لحظات";
  if (m === 1) return "آخر نبض قبل دقيقة";
  if (m === 2) return "آخر نبض قبل دقيقتين";
  return `آخر نبض قبل ${m <= 10 ? `${m} دقائق` : `${m} دقيقة`}`;
}

function hijriGregorian(): string {
  const now = new Date();
  const g = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  try {
    const h = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
    return `${h} · ${g}`;
  } catch {
    return g;
  }
}

/** Deterministic tiny series for KPI sparklines (no Math.random). */
function miniSeries(seed: number, value: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const wave = Math.sin((i + seed) * 1.1) * 0.3 + 0.7;
    return Math.max(1, Math.round((value / 2) * wave));
  });
}

function MiniSpark({ points, rgb }: { points: number[]; rgb: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const path = points
    .map(
      (v, i) =>
        `${((i / (points.length - 1)) * 100).toFixed(1)},${(26 - (v / max) * 20).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 h-6 w-full" aria-hidden>
      <polyline
        points={path}
        fill="none"
        stroke={`rgba(${rgb},0.9)`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════ Interactive peninsula pulse map ═══════════════ */

const MAP_SECTORS: { id: RegionId; cx: number; cy: number; radii: number[] }[] = [
  { id: "western", cx: 310, cy: 584, radii: [112, 132, 120, 142, 116, 136, 124, 146] },
  { id: "central", cx: 551, cy: 445, radii: [150, 138, 162, 144, 156, 140, 150, 160] },
  { id: "eastern", cx: 660, cy: 372, radii: [120, 136, 114, 140, 126, 130, 120, 138] },
  { id: "southern", cx: 417, cy: 723, radii: [142, 120, 150, 130, 146, 124, 140, 132] },
];
const PENINSULA =
  "M 360 150 C 470 112, 590 120, 662 170 C 702 150, 744 176, 730 222 " +
  "C 802 272, 838 362, 800 452 C 776 542, 720 642, 620 722 " +
  "C 520 784, 398 772, 330 700 C 270 640, 246 540, 252 452 " +
  "C 236 372, 252 282, 302 222 C 316 186, 336 166, 360 150 Z";

function blobPath(cx: number, cy: number, radii: number[]): string {
  const n = radii.length;
  const pts: [number, number][] = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const mid = (p: [number, number], q: [number, number]): [number, number] => [
    (p[0] + q[0]) / 2,
    (p[1] + q[1]) / 2,
  ];
  let d = `M ${mid(pts[n - 1], pts[0]).join(" ")} `;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const m = mid(cur, pts[(i + 1) % n]);
    d += `Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]} `;
  }
  return d + "Z";
}

function PulseMap({
  regions,
  selected,
  onSelect,
}: {
  regions: CommandCenterState["regions"];
  selected: RegionId | null;
  onSelect: (r: RegionId | null) => void;
}) {
  const sectors = useMemo(
    () => MAP_SECTORS.map((s) => ({ ...s, d: blobPath(s.cx, s.cy, s.radii) })),
    [],
  );
  const byId = new Map(regions.map((r) => [r.region_id, r]));
  const sel = selected ? byId.get(selected) : null;
  const selMeta = selected ? REGIONS.find((r) => r.id === selected) : null;

  return (
    <div className="relative">
      <svg
        viewBox="140 90 720 720"
        className="h-[300px] w-full sm:h-[360px]"
        role="group"
        aria-label="نبض المناطق"
      >
        <path
          d={PENINSULA}
          fill="rgba(134,239,172,0.05)"
          stroke="rgba(134,239,172,0.25)"
          strokeWidth="1.5"
        />
        {sectors.map((s) => {
          const pulse = byId.get(s.id);
          const sev = pulse?.severity ?? "idle";
          const sevRgb = SEV_RGB[sev];
          const regionRgb = REGION_ACCENT_RGB[s.id];
          const active = selected === s.id;
          // 3–5 pulsing asset dots, deterministic ring placement.
          const dots = Array.from({ length: 3 + (s.cx % 3) }, (_, i) => {
            const a = (i / (3 + (s.cx % 3))) * Math.PI * 2 + s.cy;
            const rr = 40 + ((i * 37 + s.cx) % 45);
            return [s.cx + Math.cos(a) * rr, s.cy + Math.sin(a) * rr] as const;
          });
          return (
            <g key={s.id}>
              <path
                d={s.d}
                fill={`rgba(${regionRgb},${active ? 0.16 : 0.08})`}
                stroke={`rgba(${sevRgb},${active ? 1 : 0.75})`}
                strokeWidth={active ? 3 : 1.8}
                className={
                  sev === "critical"
                    ? "cc-sector-critical"
                    : sev === "healthy"
                      ? "cc-sector-healthy"
                      : undefined
                }
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(active ? null : s.id)}
              />
              {dots.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={3.2}
                  fill={`rgba(${sevRgb},0.95)`}
                  className="cc-dot"
                  style={{ animationDelay: `${i * 0.6}s` }}
                />
              ))}
            </g>
          );
        })}
        <style>{`
          .cc-dot { animation: ccDot 2.6s steps(14, jump-none) infinite; transform-box: fill-box; transform-origin: center; }
          .cc-sector-critical { animation: ccSectorCrit 1.2s ease-in-out infinite; }
          .cc-sector-healthy { animation: ccSectorCalm 4s steps(20, jump-none) infinite; }
          @keyframes ccDot { 0%,100% { opacity: .45; transform: scale(1);} 50% { opacity: 1; transform: scale(1.5);} }
          @keyframes ccSectorCrit { 0%,100% { stroke-opacity: .6; } 50% { stroke-opacity: 1; } }
          @keyframes ccSectorCalm { 0%,100% { stroke-opacity: .55; } 50% { stroke-opacity: .85; } }
          @media (prefers-reduced-motion: reduce) { .cc-dot, .cc-sector-critical, .cc-sector-healthy { animation: none !important; } }
        `}</style>
      </svg>

      {sel && selMeta && (
        <div
          className={`${SEV_CLASS[sel.severity]} absolute inset-x-4 bottom-3 rounded-2xl bg-[#061A2E]/90 p-4 backdrop-blur-md sm:inset-x-auto sm:end-4 sm:w-72`}
          role="dialog"
          aria-label={selMeta.labelAr}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold">{selMeta.labelAr}</div>
            <button
              onClick={() => onSelect(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-cyan-300">{sel.assets_active}</div>
              <div className="text-[10px] text-white/55">أصل نشط</div>
            </div>
            <div>
              <div
                className={`text-lg font-bold ${sel.incidents_open > 2 ? "text-rose-300" : "text-white"}`}
              >
                {sel.incidents_open}
              </div>
              <div className="text-[10px] text-white/55">بلاغ مفتوح</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-300">{sel.compliance_pct}%</div>
              <div className="text-[10px] text-white/55">امتثال</div>
            </div>
          </div>
          <div className="mt-2 text-center text-[10px] text-white/45">
            {relMinutes(sel.last_pulse_at)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ Page ═══════════════════════ */

function CommandCenterPage() {
  const fetchState = useServerFn(getCommandCenterState);
  // Doctrine («بيانات لا تفرغ»): the client never waits forever. The cap
  // must EXCEED the server's resilient() window (4s DB race + transport),
  // otherwise every first paint lands in the retry state — 9s guards a
  // truly hung network only; failure lands in an Arabic retry state,
  // never an eternal skeleton.
  const {
    data: state,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["command-center-state"],
    queryFn: () =>
      Promise.race([
        fetchState(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("command-center timeout")), 9000),
        ),
      ]),
    retry: 1,
    refetchInterval: 45_000,
  });

  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const { speak } = useAriaSpeech();
  const dateLabel = useMemo(hijriGregorian, []);

  const summaryText = useMemo(() => {
    if (!state) return "";
    const overdue = state.urgent.filter((u) => new Date(u.due_at).getTime() < Date.now()).length;
    const worstRegion = state.regions.find((r) => r.severity === "critical");
    return (
      [
        `${state.counters.agents_active} وكلاء نشطون`,
        `${state.counters.proposals_pending} مقترحات بانتظار اعتمادك`,
        overdue > 0
          ? `بند اتفاقية خدمة متجاوز${worstRegion ? ` في ${REGIONS.find((r) => r.id === worstRegion.region_id)?.shortAr}` : ""}`
          : "لا تجاوزات في اتفاقيات الخدمة",
        `متوسط الامتثال ${state.counters.compliance_avg}%`,
      ].join("، ") + "."
    );
  }, [state]);

  const speakSummary = async () => {
    if (!summaryText) return;
    setSummarizing(true);
    try {
      await speak(summaryText);
      toast.success("ملخص آريا", { description: summaryText });
    } catch {
      toast.message("ملخص آريا", { description: summaryText });
    } finally {
      setSummarizing(false);
    }
  };

  const sortedUrgent = useMemo(
    () =>
      [...(state?.urgent ?? [])].sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
      ),
    [state],
  );

  const STAGES = [
    { key: "proposed" as const, label: "اقتراح" },
    { key: "prepared" as const, label: "تجهيز" },
    { key: "approved" as const, label: "اعتماد بشري" },
  ];
  const proposalCard = state?.pipeline.find((p) => p.id === selectedProposal) ?? null;

  const kpis: Array<{ label: string; value: string; sev: CommandSeverity; seed: number }> = state
    ? [
        {
          label: "الوكلاء النشطون",
          value: String(state.counters.agents_active),
          sev: "healthy",
          seed: 2,
        },
        {
          label: "مقترحات بانتظار الاعتماد",
          value: String(state.counters.proposals_pending),
          sev: "medium",
          seed: 5,
        },
        {
          label: "الأعمال العاجلة المفتوحة",
          value: String(state.counters.urgent_open),
          sev: sortedUrgent.some((u) => new Date(u.due_at).getTime() < Date.now())
            ? "critical"
            : "medium",
          seed: 8,
        },
        {
          label: "طلبات مساندة قيد المعالجة",
          value: String(state.counters.support_processing),
          sev: "medium",
          seed: 11,
        },
        {
          label: "منجزات الوكلاء اليوم",
          value: String(state.counters.done_today),
          sev: "healthy",
          seed: 14,
        },
        {
          label: "متوسط الامتثال",
          value: `${state.counters.compliance_avg}%`,
          sev: "healthy",
          seed: 17,
        },
      ]
    : [];

  return (
    <div
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[#04101E] text-white"
    >
      {/* Ghost-fix (order §2.1): the old backdrop was a SCREENSHOT of a
          dashboard whose text bled through at 0.6. The city-map plate now
          comes from the app shell (page-backdrops.ts) — one backdrop layer
          instead of aurora + page duplicate. */}
      <header className="holo-card border-b border-emerald-400/15 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">مركز القيادة الذكي</h1>
            <p className="mt-1 text-xs text-white/50">{dateLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void speakSummary()}
              disabled={summarizing || !state}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-60"
            >
              {summarizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              ملخص آريا
            </button>
            {/* Drive a live briefing from this device or an external screen. */}
            <PresentationToggle ar />
          </div>
        </div>
        {state?.simulation && (
          <div className="mx-auto mt-2 max-w-[1600px] text-[10px] text-amber-300/90">
            محاكاة مرجعية — is_simulation = true
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        {isLoading && !state ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تجهيز مركز القيادة…
          </div>
        ) : state ? (
          <>
            {/* Zone 1 — KPI pulse */}
            <section
              aria-label="نبض المنظومة"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
            >
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className={`${SEV_CLASS[k.sev]} rounded-2xl bg-[#061A2E]/70 p-3`}
                >
                  <div className="text-[10px] text-white/55">{k.label}</div>
                  <div
                    className="mt-1 text-2xl font-bold"
                    style={{ color: `rgba(${SEV_RGB[k.sev]},0.95)` }}
                  >
                    {k.value}
                  </div>
                  <MiniSpark
                    points={miniSeries(k.seed, Number.parseInt(k.value) || 6)}
                    rgb={SEV_RGB[k.sev]}
                  />
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              {/* Zone 2 — Region pulse map */}
              <section
                aria-label="نبض المناطق"
                className="holo-card rounded-2xl bg-[#061A2E]/60 p-4"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <Radio className="h-4 w-4 text-cyan-300" /> نبض المناطق
                </div>
                <p className="text-[11px] text-white/50">
                  لون الهالة يحكي حدّة كل إدارة — المسّ أي منطقة لبطاقتها الحية.
                </p>
                <PulseMap
                  regions={state.regions}
                  selected={selectedRegion}
                  onSelect={setSelectedRegion}
                />
              </section>

              {/* Zone 3 — Approval line */}
              <section
                aria-label="خط الاعتماد"
                className="holo-card rounded-2xl bg-[#061A2E]/60 p-4"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" /> خط الاعتماد
                </div>
                <p className="text-[11px] text-white/50">
                  الوكلاء يقترحون ويجهّزون — الاعتماد النهائي بشري دائمًا.
                </p>

                <div className="relative mt-6 pb-2">
                  <div className="absolute inset-x-6 top-5 h-0.5 bg-gradient-to-l from-emerald-400/70 via-cyan-400/40 to-cyan-400/20" />
                  <div className="relative grid grid-cols-3">
                    {STAGES.map((st, i) => {
                      const items = state.pipeline.filter((p) => p.stage === st.key);
                      const finale = i === 2;
                      return (
                        <div key={st.key} className="flex flex-col items-center gap-2">
                          <div
                            className={`${finale ? "holo-sev holo-sev-healthy" : "holo-sev holo-sev-medium"} flex h-11 w-11 items-center justify-center rounded-full bg-[#04101E]`}
                          >
                            {finale ? (
                              <Lock className="h-4 w-4 text-emerald-300" />
                            ) : (
                              <span className="text-xs font-bold text-cyan-200">
                                {items.length}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${finale ? "text-emerald-300" : "text-white/70"}`}
                          >
                            {st.label}
                            {finale ? ` (${items.length})` : ""}
                          </div>
                          <div className="flex max-w-full flex-wrap justify-center gap-1.5 px-1">
                            {items.slice(0, 5).map((p) => (
                              <button
                                key={p.id}
                                onClick={() =>
                                  setSelectedProposal(selectedProposal === p.id ? null : p.id)
                                }
                                title={p.title_ar}
                                aria-label={p.title_ar}
                                className="flex h-11 w-11 items-center justify-center"
                              >
                                <span
                                  className="block h-3 w-3 rounded-full"
                                  style={{
                                    background: `rgba(${SEV_RGB[p.severity]},0.95)`,
                                    boxShadow: `0 0 10px rgba(${SEV_RGB[p.severity]},0.8)`,
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {proposalCard && (
                  <div
                    className={`${SEV_CLASS[proposalCard.severity]} mt-3 rounded-xl bg-[#04101E]/80 p-3`}
                  >
                    <div className="text-sm font-semibold">{proposalCard.title_ar}</div>
                    <div className="mt-1 text-[11px] text-white/55">
                      المصدر: {proposalCard.agent_ar} · المرحلة:{" "}
                      {STAGES.find((s) => s.key === proposalCard.stage)?.label}
                    </div>
                    <button
                      disabled
                      title="يتطلب تفويض المدير"
                      className="mt-2 inline-flex min-h-[44px] cursor-not-allowed items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-3 text-xs text-emerald-200/60"
                    >
                      <Lock className="h-3 w-3" /> اعتماد — يتطلب تفويض المدير
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* Zone 4 — Agents council */}
            <section
              aria-label="مجلس الوكلاء"
              className="holo-card rounded-2xl bg-[#061A2E]/60 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Bot className="h-4 w-4 text-cyan-300" /> مجلس الوكلاء
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                {state.agents.map((a) => (
                  <div
                    key={a.id}
                    className={`${SEV_CLASS[a.severity]} rounded-2xl bg-[#04101E]/70 p-3 text-center`}
                  >
                    <div className="relative mx-auto h-12 w-12">
                      {a.status === "processing" && (
                        <span
                          className="sev-orbit absolute inset-0 rounded-full border border-transparent"
                          style={{ borderTopColor: `rgba(${SEV_RGB[a.severity]},0.9)` }}
                        />
                      )}
                      <span
                        className="absolute inset-1 flex items-center justify-center text-sm font-bold"
                        style={{
                          clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                          background: `rgba(${SEV_RGB[a.severity]},0.18)`,
                          color: `rgba(${SEV_RGB[a.severity]},0.95)`,
                        }}
                      >
                        {a.name_ar.slice(0, 2)}
                      </span>
                    </div>
                    <div className="mt-2 truncate text-[11px] font-semibold" title={a.name_ar}>
                      {a.name_ar}
                    </div>
                    <div className="mt-0.5 line-clamp-2 min-h-[26px] text-[10px] leading-tight text-white/50">
                      {a.task_ar ?? "بوضع الاستعداد"}
                    </div>
                    <div className="mt-1 text-[10px] text-emerald-300/80">
                      أنجز اليوم: {a.done_today}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Zone 5 — Urgent & SLA */}
            <section
              aria-label="الأعمال العاجلة وSLA"
              className="holo-card rounded-2xl bg-[#061A2E]/60 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Timer className="h-4 w-4 text-amber-300" /> الأعمال العاجلة وSLA
              </div>
              <ul className="space-y-2">
                {sortedUrgent.map((u) => {
                  const chip = slaChip(u.due_at);
                  return (
                    <li
                      key={u.id}
                      className={`${SEV_CLASS[chip.sev]} rounded-xl bg-[#04101E]/70 p-3`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{u.title_ar}</div>
                          <div className="text-[10px] text-white/50">
                            {u.department} · SLA {u.sla_hours}س · {u.status}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-1 text-[10px] font-bold"
                            style={{
                              background: `rgba(${SEV_RGB[chip.sev]},0.15)`,
                              color: `rgba(${SEV_RGB[chip.sev]},0.95)`,
                            }}
                          >
                            {chip.text}
                          </span>
                          <button
                            disabled
                            title="يتطلب تفويض المدير"
                            className="min-h-[44px] cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[11px] text-white/40"
                          >
                            تصعيد
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(chip.ratio * 100)}%`,
                            background: `rgba(${SEV_RGB[chip.sev]},0.85)`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : (
          // Mandatory third state (const. art. 14): fetch failed or came
          // back empty — a neutral Arabic message with a retry button.
          // Never an auth phrase, never an eternal skeleton.
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-white/70">
              {isError
                ? "تعذّر تحميل مركز القيادة مؤقتًا — يرجى إعادة المحاولة."
                : "لا توجد بيانات لعرضها حاليًا — المنظومة تراقب."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
