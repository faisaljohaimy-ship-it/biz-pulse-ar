/**
 * Executive Command Bridge — `/bridge`
 *
 * The single executive surface: ARIA at center, live AI agents
 * arranged in a circular command table, one-click 60-second Executive
 * Briefing, live storytelling feed, and predictive risk rail. All
 * data is wired to the real runtime (`agent_definitions`, `agent_runs`,
 * `sec_incidents`, `sec_patrols`, `enterprise_events`). No mocks.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Sparkles, ShieldCheck, Activity, AlertTriangle, Loader2, PlayCircle, TrendingUp, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getBridgeState, type BridgeAgent } from "@/lib/exec/bridge.functions";
import { generateExecutiveBriefing, type BriefingSegment, type ExecutiveBriefing } from "@/lib/exec/briefing.functions";
import { getPredictedRisks } from "@/lib/exec/predictive.functions";
import { AgentRing } from "@/components/bridge/AgentRing";
import { BriefingStage } from "@/components/bridge/BriefingStage";
import { ExecutiveNarrator } from "@/components/mission-control/ExecutiveNarrator";
import { findHuman } from "@/lib/digital-humans/registry";
import { DigitalHumanAvatar } from "@/components/digital-humans/DigitalHumanAvatar";

export const Route = createFileRoute("/_authenticated/bridge")({
  head: () => ({
    meta: [
      { title: "Executive Command Bridge — NEXUS" },
      { name: "description", content: "Live executive operating bridge with ARIA, specialist AI agents, and 60-second executive briefings." },
    ],
  }),
  component: BridgePage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="space-y-3">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <div className="text-lg font-semibold text-white">Bridge unavailable</div>
        <div className="text-sm text-white/60 max-w-md">{error.message}</div>
        <button
          onClick={reset}
          className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
        >Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function BridgePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const getState = useServerFn(getBridgeState);
  const getRisks = useServerFn(getPredictedRisks);
  const genBriefing = useServerFn(generateExecutiveBriefing);

  const state = useQuery({
    queryKey: ["bridge-state"],
    queryFn: () => getState(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

  const risks = useQuery({
    queryKey: ["bridge-risks"],
    queryFn: () => getRisks(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [spotlightSegment, setSpotlightSegment] = useState<BriefingSegment | null>(null);

  const startBriefing = useMutation({
    mutationFn: () => genBriefing(),
    onSuccess: (data) => setBriefing(data),
  });

  const aria = findHuman("aria")!;
  const agents = state.data?.agents ?? [];
  const health = state.data?.health;

  const spotlightAgentId = useMemo(() => {
    if (!spotlightSegment) return null;
    if (spotlightSegment.speaker_id === "aria") return null;
    return agents.find((a) => a.id === spotlightSegment.speaker_id || a.name === spotlightSegment.speaker_name)?.id ?? null;
  }, [spotlightSegment, agents]);

  return (
    <div
      className="relative -mt-2 min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D]"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute right-0 top-0 h-[320px] w-[320px] rounded-full bg-emerald-400/5 blur-[120px]" />
      </div>

      {/* Header */}
      <ExecutiveHeader ar={ar} health={health} loading={state.isLoading} />

      {/* Main grid */}
      <div className="relative grid grid-cols-1 gap-6 px-6 pb-8 xl:grid-cols-[1fr_360px]">
        {/* Center stage */}
        <div className="flex min-h-[640px] flex-col items-center justify-center gap-6 py-8">
          <AgentRing
            agents={agents}
            ar={ar}
            radius={280}
            centerSize={260}
            spotlightId={spotlightAgentId}
          >
            <CenterStage ar={ar} speaking={spotlightSegment?.speaker_id === "aria"} aria={aria} />
          </AgentRing>

          {/* Briefing CTA */}
          <button
            onClick={() => startBriefing.mutate(undefined)}
            disabled={startBriefing.isPending || state.isLoading}
            className={cn(
              "group relative inline-flex items-center gap-3 rounded-2xl px-8 py-5",
              "bg-gradient-to-br from-cyan-400 to-cyan-500 text-[#04111F] shadow-[0_0_48px_rgba(0,212,255,0.45)]",
              "text-base font-semibold uppercase tracking-[0.14em]",
              "hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-all",
            )}
          >
            {startBriefing.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
            {ar ? "ابدأ الموجز التنفيذي · 60 ثانية" : "Begin Executive Briefing · 60s"}
          </button>

          {startBriefing.error && (
            <div className="text-sm text-rose-300">
              {String((startBriefing.error as Error).message)}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <PredictedRiskRail ar={ar} risks={risks.data ?? []} loading={risks.isLoading} />
          <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
              <Activity className="h-4 w-4" />
              {ar ? "السرد التنفيذي الحي" : "Live Executive Storytelling"}
            </div>
            <div className="max-h-[420px] overflow-hidden">
              <ExecutiveNarrator />
            </div>
          </div>
        </div>
      </div>

      {/* Briefing takeover */}
      {briefing && (
        <BriefingStage
          briefing={briefing}
          ar={ar}
          onClose={() => {
            setBriefing(null);
            setSpotlightSegment(null);
          }}
          onSegmentChange={setSpotlightSegment}
        />
      )}
    </div>
  );
}

function ExecutiveHeader({
  ar, health, loading,
}: { ar: boolean; health?: { score: number; open_incidents: number; critical_incidents: number; active_patrols: number; agents_online: number; agents_total: number }; loading: boolean }) {
  const score = health?.score ?? 0;
  const tone = score >= 90 ? "text-emerald-300" : score >= 70 ? "text-cyan-300" : "text-amber-300";

  return (
    <header className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 pt-6 pb-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/30">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.22em] text-cyan-300/80">NEXUS · Industrial Security · Western Region</div>
          <div className="truncate text-2xl font-light text-white sm:text-3xl">
            {ar ? "جسر القيادة التنفيذي" : "Executive Command Bridge"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <HeaderStat
          ar={ar} loading={loading}
          label_ar="الصحة التشغيلية" label_en="Operational Health"
          value={`${Math.round(score)}%`}
          valueClass={cn("text-2xl font-semibold tabular-nums", tone)}
        />
        <HeaderStat
          ar={ar} loading={loading}
          label_ar="بلاغات مفتوحة" label_en="Open Incidents"
          value={String(health?.open_incidents ?? 0)}
          valueClass="text-2xl font-semibold tabular-nums text-amber-200"
        />
        <HeaderStat
          ar={ar} loading={loading}
          label_ar="حرجة" label_en="Critical"
          value={String(health?.critical_incidents ?? 0)}
          valueClass="text-2xl font-semibold tabular-nums text-rose-300"
        />
        <HeaderStat
          ar={ar} loading={loading}
          label_ar="دوريات نشطة" label_en="Active Patrols"
          value={String(health?.active_patrols ?? 0)}
          valueClass="text-2xl font-semibold tabular-nums text-cyan-200"
        />
        <HeaderStat
          ar={ar} loading={loading}
          label_ar="وكلاء نشطون" label_en="Agents Online"
          value={`${health?.agents_online ?? 0}/${health?.agents_total ?? 0}`}
          valueClass="text-2xl font-semibold tabular-nums text-emerald-200"
        />
        <LiveClock />
      </div>
    </header>
  );
}

function HeaderStat({
  ar, label_ar, label_en, value, valueClass, loading,
}: { ar: boolean; label_ar: string; label_en: string; value: string; valueClass: string; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] px-4 py-2 backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">{ar ? label_ar : label_en}</div>
      <div className={valueClass}>{loading ? "—" : value}</div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useMemo(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] px-4 py-2 text-right backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Live</div>
      <div className="text-2xl font-light tabular-nums text-white">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
    </div>
  );
}

function CenterStage({ ar, speaking, aria }: { ar: boolean; speaking: boolean; aria: ReturnType<typeof findHuman> }) {
  return (
    <div className="relative grid h-full w-full place-items-center">
      <div
        aria-hidden
        className={cn(
          "absolute h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl transition-opacity duration-700",
          speaking ? "opacity-100" : "opacity-50",
        )}
      />
      <DigitalHumanAvatar
        spec={aria!}
        state={speaking ? "speaking" : "idle"}
        size={220}
        ambient
      />
      <div className="absolute -bottom-4 text-center">
        <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/90">{ar ? "آريا · ذكاء تنفيذي" : "ARIA · Executive AI"}</div>
      </div>
    </div>
  );
}

function PredictedRiskRail({
  ar, risks, loading,
}: { ar: boolean; risks: Awaited<ReturnType<typeof getPredictedRisks>>; loading: boolean }) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        <TrendingUp className="h-4 w-4" />
        {ar ? "مخاطر متوقعة" : "Predicted Risks"}
        {!loading && <span className="ml-auto text-white/40">{risks.length}</span>}
      </div>
      {loading && <div className="text-sm text-white/40">{ar ? "جاري التحليل…" : "Analyzing…"}</div>}
      {!loading && risks.length === 0 && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">
          {ar ? "لا تنبيهات متوقعة. الوضع ضمن المعدّل التشغيلي." : "No predicted anomalies. Operations are within baseline."}
        </div>
      )}
      <div className="space-y-3">
        {risks.map((r) => {
          const tone =
            r.severity === "high" ? "border-rose-400/40 bg-rose-400/5" :
            r.severity === "medium" ? "border-amber-400/40 bg-amber-400/5" :
            "border-cyan-400/30 bg-cyan-400/5";
          const dot =
            r.severity === "high" ? "bg-rose-400" :
            r.severity === "medium" ? "bg-amber-400" :
            "bg-cyan-300";
          return (
            <div key={r.id} className={cn("rounded-2xl border p-3", tone)}>
              <div className="flex items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{ar ? r.title_ar : r.title_en}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-white/70">{ar ? r.why_ar : r.why_en}</div>
                  <details className="group mt-2">
                    <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-cyan-300/80 hover:text-cyan-200">
                      {ar ? "التوصية" : "Recommendation"}
                    </summary>
                    <div className="mt-1 text-[12px] leading-relaxed text-white/80">
                      {ar ? r.recommendation_ar : r.recommendation_en}
                    </div>
                  </details>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-white/50">
                    <span className="tabular-nums">
                      {ar ? "ثقة" : "Confidence"}: <span className="text-white/80">{Math.round(r.confidence * 100)}%</span>
                    </span>
                    <span className="tabular-nums">
                      {ar ? "أفق" : "Horizon"}: <span className="text-white/80">{r.horizon_hours}h</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
