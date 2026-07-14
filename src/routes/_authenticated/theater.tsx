/**
 * Executive Theater — `/theater`
 *
 * The flagship Executive AI surface of NEXUS AI OS. ARIA is permanently
 * centered on the stage, surrounded by the live AI agent ring. Every
 * story card, every spoken turn, every confidence reading comes from
 * real runtime tables (`enterprise_events`, `agent_runs`,
 * `executive_briefings`). No mock data, no random talking.
 *
 * Reuses: AgentRing, AriaScene (R3F), bridge.functions, briefing.functions,
 * narrator, conductor, voice profiles. Adds: StoryCard, conductor wiring,
 * one-click 60s briefing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  PlayCircle,
  Loader2,
  Volume2,
  VolumeX,
  StopCircle,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Users,
  FileCheck2,
  Brain,
  Radio,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getBridgeState } from "@/lib/exec/bridge.functions";
import { generateExecutiveBriefing } from "@/lib/exec/briefing.functions";
import { AgentRing } from "@/components/bridge/AgentRing";
import { speakAgent } from "@/lib/digital-humans/speak-agent";
import type { AriaScene as AriaSceneT } from "@/components/digital-humans/r3f/AriaScene";

// Lazy + client-only: react-three-fiber + three.js only loads when Theater
// renders in the browser. The SSR branch makes the `import()` dead code so
// Vite excludes the Three.js chunk from the server bundle (Vercel build-memory
// guard); the server renders nothing for the WebGL scene.
const AriaScene = lazy(
  (): Promise<{ default: typeof AriaSceneT }> =>
    import.meta.env.SSR
      ? Promise.resolve({ default: (() => null) as unknown as typeof AriaSceneT })
      : import("@/components/digital-humans/r3f/AriaScene").then((m) => ({ default: m.AriaScene })),
);
import { StoryCard } from "@/components/theater/StoryCard";
import { ConnectionLines } from "@/components/theater/ConnectionLines";
import { Storyboard } from "@/components/theater/Storyboard";
import { ExplainPanel } from "@/components/theater/ExplainPanel";
import type { NarratorLine } from "@/lib/narrator/event-narrator";
import { useConductor } from "@/lib/exec/conductor";

export const Route = createFileRoute("/_authenticated/theater")({
  head: () => ({
    meta: [
      { title: "Executive Theater — NEXUS AI OS" },
      {
        name: "description",
        content:
          "Living executive command theater with ARIA Digital Human, specialist AI agent orchestra and one-click 60-second briefings — powered exclusively by real runtime data.",
      },
    ],
  }),
  component: TheaterPage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
      <div className="text-lg font-semibold text-white">{error.message}</div>
      <button
        onClick={reset}
        className="mt-4 rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
      >
        Retry
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function HealthChip({
  icon: Icon,
  label,
  value,
  tone = "cyan",
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  tone?: "cyan" | "amber" | "rose" | "emerald";
}) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/30 text-cyan-100",
    amber: "border-amber-400/40 text-amber-100",
    rose: "border-rose-400/40 text-rose-100",
    emerald: "border-emerald-400/40 text-emerald-100",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-white/[0.03] px-3 py-2 backdrop-blur",
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4 opacity-80" />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-base font-light">{value}</div>
      </div>
    </div>
  );
}

function TheaterPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const getBridge = useServerFn(getBridgeState);
  const generateBriefing = useServerFn(generateExecutiveBriefing);

  const bridgeQuery = useQuery({
    queryKey: ["theater", "bridge"],
    queryFn: () => getBridge(),
    refetchInterval: 45_000,
    staleTime: 10_000,
  });

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const conductor = useConductor({ ar, voiceEnabled });

  const briefingMutation = useMutation({
    mutationFn: () => generateBriefing(),
    onSuccess: (briefing) => conductor.beginBriefing(briefing),
  });

  const health = bridgeQuery.data?.health;
  const agents = useMemo(() => bridgeQuery.data?.agents ?? [], [bridgeQuery.data?.agents]);

  const healthScore = health?.score ?? 0;
  const tone =
    healthScore >= 85
      ? "emerald"
      : healthScore >= 70
        ? "cyan"
        : healthScore >= 50
          ? "amber"
          : "rose";

  const aliveState = useMemo(() => {
    if (conductor.presenting) return "speaking" as const;
    return conductor.state === "speaking" ? ("speaking" as const) : ("idle" as const);
  }, [conductor.state, conductor.presenting]);

  const recentLines = conductor.feed.slice(0, 8);
  const narratorLines = useMemo(
    () => conductor.feed.map((l) => l.narrator).filter(Boolean) as NarratorLine[],
    [conductor.feed],
  );

  // Match the conductor's current speaker (NarratorAgent) to a real
  // BridgeAgent in the ring, so connection-line highlight and
  // explainability lookups stay in sync.
  const speakerAgentId = useMemo(() => {
    if (conductor.currentSpeaker.id === "aria") return null;
    const first = conductor.currentSpeaker.name_en.split(" ")[0].toLowerCase();
    return agents.find((a) => a.name.toLowerCase().includes(first))?.id ?? null;
  }, [agents, conductor.currentSpeaker]);

  // ARIA gaze — looks toward the active speaking agent's position on the ring,
  // or softly toward the camera when she is speaking herself.
  const ariaGaze = useMemo<{ x: number; y: number } | null>(() => {
    if (!speakerAgentId) return conductor.state === "speaking" ? { x: 0, y: -0.05 } : null;
    const idx = agents.findIndex((a) => a.id === speakerAgentId);
    if (idx < 0 || agents.length === 0) return null;
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / agents.length;
    return { x: Math.cos(angle) * 0.85, y: Math.sin(angle) * 0.55 };
  }, [agents, speakerAgentId, conductor.state]);

  const [explainLine, setExplainLine] = useState<NarratorLine | null>(null);
  const explainAgent = useMemo(() => {
    if (!explainLine) return null;
    const first = explainLine.agent_name_en.split(" ")[0].toLowerCase();
    return agents.find((a) => a.name.toLowerCase().includes(first)) ?? null;
  }, [explainLine, agents]);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Ambient executive backdrop — tints subtly with mission tone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-colors duration-[1500ms]"
      >
        <div
          className="absolute inset-0 transition-[background] duration-[1500ms]"
          style={{
            background:
              tone === "rose"
                ? "radial-gradient(ellipse at top, #2a0a18 0%, #08101e 55%, #020812 100%)"
                : tone === "amber"
                  ? "radial-gradient(ellipse at top, #2a1a08 0%, #08101e 55%, #020812 100%)"
                  : tone === "emerald"
                    ? "radial-gradient(ellipse at top, #062a20 0%, #04101e 55%, #020812 100%)"
                    : "radial-gradient(ellipse at top, #0b2540 0%, #04101e 55%, #020812 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(rgba(0,212,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.4)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div
          className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-[120px] transition-colors duration-[1500ms]"
          style={{
            background:
              tone === "rose"
                ? "rgba(244,63,94,0.10)"
                : tone === "amber"
                  ? "rgba(245,158,11,0.10)"
                  : tone === "emerald"
                    ? "rgba(16,185,129,0.10)"
                    : "rgba(0,212,255,0.10)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-4 py-6 lg:px-8 lg:py-10">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.4em] text-cyan-300/80">
              {ar ? "مسرح القيادة التنفيذية" : "Executive Theater"}
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-light text-white tracking-tight">
              {ar
                ? "نيكزس AI · إدارة الأمن الصناعي — المنطقة الغربية"
                : "NEXUS AI · Industrial Security — Western Region"}
            </h1>
            <p className="mt-1 text-sm text-white/55 max-w-2xl">
              {ar
                ? "آريا والمنظومة المتخصصة تراقب العمليات الحية وتقدم التوصيات التنفيذية ضمن 60 ثانية."
                : "ARIA and the specialist orchestra monitor live operations and deliver executive recommendations in under 60 seconds."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs uppercase tracking-wider transition",
                voiceEnabled
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-white/15 bg-white/[0.03] text-white/70 hover:text-white",
              )}
              aria-pressed={voiceEnabled}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {ar
                ? voiceEnabled
                  ? "الصوت مفعّل"
                  : "الصوت معطّل"
                : voiceEnabled
                  ? "Voice On"
                  : "Voice Off"}
            </button>

            {(conductor.presenting || conductor.pending > 0) && (
              <button
                type="button"
                onClick={conductor.interrupt}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-xs uppercase tracking-wider text-rose-200 hover:bg-rose-400/20"
              >
                <StopCircle className="h-4 w-4" />
                {ar ? "إيقاف" : "Stop"}
              </button>
            )}

            <button
              type="button"
              onClick={() => briefingMutation.mutate()}
              disabled={briefingMutation.isPending || conductor.presenting}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
                "border-cyan-300/50 bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 text-cyan-100",
                "hover:from-cyan-500/30 hover:to-cyan-400/20 hover:border-cyan-300/80",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {briefingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {ar ? "بدء الموجز التنفيذي" : "Begin Executive Briefing"}
            </button>
          </div>
        </header>

        {/* Health strip */}
        <section className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
          <HealthChip
            icon={ShieldCheck}
            label={ar ? "الصحة التشغيلية" : "Mission Health"}
            value={`${Math.round(healthScore)}`}
            tone={tone}
          />
          <HealthChip
            icon={AlertTriangle}
            label={ar ? "بلاغات حرجة" : "Critical"}
            value={health?.critical_incidents ?? "—"}
            tone={(health?.critical_incidents ?? 0) > 0 ? "rose" : "emerald"}
          />
          <HealthChip
            icon={Activity}
            label={ar ? "بلاغات مفتوحة" : "Open Incidents"}
            value={health?.open_incidents ?? "—"}
          />
          <HealthChip
            icon={Radio}
            label={ar ? "دوريات نشطة" : "Active Patrols"}
            value={health?.active_patrols ?? "—"}
          />
          <HealthChip
            icon={Users}
            label={ar ? "زوار حاليون" : "Visitors Onsite"}
            value={health?.visitors_onsite ?? "—"}
          />
          <HealthChip
            icon={FileCheck2}
            label={ar ? "تصاريح فعّالة" : "Active Permits"}
            value={health?.active_permits ?? "—"}
          />
          <HealthChip
            icon={Brain}
            label={ar ? "ثقة الذكاء" : "AI Confidence"}
            value={`${Math.round((health?.ai_confidence ?? 0) * 100)}%`}
            tone={(health?.ai_confidence ?? 0) > 0.75 ? "emerald" : "cyan"}
          />
        </section>

        {/* Executive Storyboard — 9-stage lifecycle of the latest event */}
        <section className="mt-6">
          <Storyboard lines={narratorLines} ar={ar} />
        </section>

        {/* Main stage */}
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="relative rounded-3xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-3 md:p-6 min-h-[460px] sm:min-h-[560px] lg:min-h-[620px] overflow-hidden">
            {/* Live caption banner */}
            {conductor.currentLine && (
              <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 max-w-[92%] rounded-full border border-cyan-300/40 bg-[#04111f]/85 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur shadow-[0_0_30px_rgba(0,212,255,0.25)]">
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-cyan-200/85">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {ar ? conductor.currentSpeaker.name_ar : conductor.currentSpeaker.name_en}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-white/90 leading-snug mt-0.5 line-clamp-2">
                  {ar ? conductor.currentLine.text_ar : conductor.currentLine.text_en}
                </div>
              </div>
            )}

            {/* Animated collaboration beams — each agent → ARIA (ring mode only) */}
            <div className="hidden sm:block">
              <ConnectionLines agents={agents} radius={240} speakerId={speakerAgentId} size={640} />
            </div>

            <AgentRing
              agents={agents}
              ar={ar}
              radius={240}
              centerSize={300}
              spotlightId={speakerAgentId}
              onAgentClick={(a) => speakAgent(a, ar)}
            >
              <Suspense
                fallback={
                  <div
                    className="h-[300px] w-[300px] rounded-full bg-gradient-to-b from-cyan-500/10 to-transparent"
                    aria-hidden
                  />
                }
              >
                <AriaScene
                  spec={conductor.currentSpeaker}
                  state={aliveState}
                  mouthAmplitude={conductor.mouthAmplitude}
                  size={300}
                  gaze={ariaGaze}
                />
              </Suspense>
            </AgentRing>

            {/* Status footer */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-white/55">
              <span>
                {ar
                  ? conductor.presenting
                    ? "وضع العرض التنفيذي"
                    : conductor.state === "speaking"
                      ? "جارٍ التحدث"
                      : "وضع المراقبة"
                  : conductor.presenting
                    ? "Executive briefing in progress"
                    : conductor.state === "speaking"
                      ? "Speaking"
                      : "Standby — monitoring live events"}
              </span>
              <span>
                {ar
                  ? `${agents.filter((a) => a.enabled).length} وكيلًا نشطًا · ${conductor.pending} في الانتظار`
                  : `${agents.filter((a) => a.enabled).length} agents online · ${conductor.pending} queued`}
              </span>
            </div>
          </div>

          {/* Story feed — click any story to open the Explainability Panel */}
          <aside className="space-y-3 xl:max-h-[760px] xl:overflow-y-auto pr-1">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80 px-1">
              {ar ? "سجلّ القصص التنفيذي" : "Executive Story Feed"}
            </div>
            {recentLines.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/55 backdrop-blur">
                {ar
                  ? "لا توجد أحداث تشغيلية حديثة. آريا في وضع المراقبة."
                  : "No recent operational events. ARIA is monitoring in standby."}
              </div>
            )}
            {recentLines.map((line) =>
              line.narrator ? (
                <StoryCard
                  key={line.id}
                  line={line.narrator}
                  ar={ar}
                  active={conductor.currentLine?.id === line.id}
                  onClick={() => setExplainLine(line.narrator!)}
                />
              ) : null,
            )}
          </aside>
        </section>
      </div>

      {/* Spacer so AriaDock (mobile, bottom-center) doesn't overlap last card */}
      <div className="h-32 sm:h-0" aria-hidden />

      <ExplainPanel
        line={explainLine}
        agent={explainAgent}
        ar={ar}
        onClose={() => setExplainLine(null)}
      />
    </div>
  );
}
