import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck, AlertTriangle, Activity, MessageSquare, FileBarChart2, Wrench,
  Sparkles, ArrowRight, Radar, CheckCircle2, Brain, ShieldAlert,
  Map as MapIcon, Clock, Camera, Users, BadgeCheck, Mic, ChevronDown,
} from "lucide-react";
import { getSecOverview } from "@/lib/sec.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DEFAULT_VOICE_PROFILES, type AgentRuntimeProfile } from "@/lib/agents/voice-architecture";
import { ExecutiveNarrator } from "@/components/mission-control/ExecutiveNarrator";
import { AmbientParticles } from "@/components/mission-control/AmbientParticles";

export const Route = createFileRoute("/_authenticated/mission-control")({
  head: () => ({
    meta: [
      { title: "Mission Control — Nexus AI OS" },
      { name: "description", content: "Executive AI Operations Center — live, bilingual mission control conducted by ARIA and specialist agents using real operational data." },
    ],
  }),
  component: MissionControl,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#061A2E] text-white grid place-items-center p-6">
      <div className="text-center">
        <div className="text-sm text-rose-300">Mission Control error</div>
        <div className="mt-2 text-white/70 text-sm">{error.message}</div>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-white/70">Not found</div>,
});

/* ────────────────────────────────────────────────────────────
   AGENT SCRIPT — derived strictly from real getSecOverview()
   ──────────────────────────────────────────────────────────── */

type AgentTone = "cyan" | "amber" | "rose" | "emerald" | "violet";

type AgentLine = {
  id: string;
  name_ar: string;
  name_en: string;
  initials: string;
  icon: typeof ShieldAlert;
  tone: AgentTone;
  status_ar: string;
  status_en: string;
  finding_ar: string;
  finding_en: string;
};

const TONE: Record<AgentTone, { ring: string; bg: string; text: string; dot: string; soft: string }> = {
  cyan:    { ring: "border-cyan-400/40",    bg: "bg-cyan-400/10",    text: "text-cyan-200",    dot: "bg-cyan-300",    soft: "bg-cyan-400/5"    },
  amber:   { ring: "border-amber-400/40",   bg: "bg-amber-400/10",   text: "text-amber-200",   dot: "bg-amber-300",   soft: "bg-amber-400/5"   },
  rose:    { ring: "border-rose-400/40",    bg: "bg-rose-400/10",    text: "text-rose-200",    dot: "bg-rose-300",    soft: "bg-rose-400/5"    },
  emerald: { ring: "border-emerald-400/40", bg: "bg-emerald-400/10", text: "text-emerald-200", dot: "bg-emerald-300", soft: "bg-emerald-400/5" },
  violet:  { ring: "border-violet-400/40",  bg: "bg-violet-400/10",  text: "text-violet-200",  dot: "bg-violet-300",  soft: "bg-violet-400/5"  },
};

function buildAgentScript(ov: Awaited<ReturnType<typeof getSecOverview>> | undefined, hasData: boolean, displayName: string): { opener: AgentLine; agents: AgentLine[]; closer: AgentLine } {
  const greet = greeting();
  const opener: AgentLine = {
    id: "aria-open",
    name_ar: "آريا التنفيذية", name_en: "ARIA Executive",
    initials: "AI", icon: Brain, tone: "cyan",
    status_ar: "تبدأ التقييم…", status_en: "Starting assessment…",
    finding_ar: `${greet.ar}${displayName ? `، ${displayName}` : ""}. ${hasData ? "جميع الأنظمة متصلة. أبدأ التقييم التشغيلي الآن." : "لا توجد سجلات تشغيلية حية متاحة في الوقت الحالي."}`,
    finding_en: `${greet.en}${displayName ? `, ${displayName}` : ""}. ${hasData ? "Enterprise systems are connected. Beginning operational assessment now." : "No live operational records are available at this time."}`,
  };

  if (!ov || !hasData) {
    const empty: AgentLine[] = (["security","patrol","risk","compliance","reporting"] as const).map((id) => ({
      id, name_ar: agentName(id, "ar"), name_en: agentName(id, "en"),
      initials: agentInitials(id), icon: agentIcon(id), tone: agentTone(id),
      status_ar: "لا توجد بيانات حية", status_en: "No live data",
      finding_ar: "لا تتوفر سجلات في الوقت الحالي.", finding_en: "No records available at this time.",
    }));
    return {
      opener,
      agents: empty,
      closer: {
        id: "aria-close", name_ar: "آريا التنفيذية", name_en: "ARIA Executive",
        initials: "AI", icon: Brain, tone: "cyan",
        status_ar: "اكتمل التقييم", status_en: "Assessment complete",
        finding_ar: "لا يوجد ما يستدعي تدخل الإدارة حالياً.", finding_en: "No executive intervention is required.",
      },
    };
  }

  const c = ov.counts;
  const criticalIncident = ov.incidents.find(i => i.severity === "critical" && i.status !== "closed" && i.status !== "resolved");

  const agents: AgentLine[] = [
    {
      id: "security",
      name_ar: agentName("security","ar"), name_en: agentName("security","en"),
      initials: agentInitials("security"), icon: agentIcon("security"), tone: c.incidents_critical > 0 ? "rose" : "cyan",
      status_ar: "تحليل الحوادث الحية…", status_en: "Analyzing live incidents…",
      finding_ar: `تم تحليل ${ov.incidents.length} حادث. ${c.incidents_critical > 0
        ? `يوجد ${c.incidents_critical} حادث حرج${criticalIncident?.title_ar ? ` — ${criticalIncident.title_ar}` : ""}.`
        : "لا توجد حوادث حرجة."}`,
      finding_en: `${ov.incidents.length} incidents analysed. ${c.incidents_critical > 0
        ? `${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} detected${criticalIncident?.title_en ? ` — ${criticalIncident.title_en}` : ""}.`
        : "No critical incidents detected."}`,
    },
    {
      id: "patrol",
      name_ar: agentName("patrol","ar"), name_en: agentName("patrol","en"),
      initials: agentInitials("patrol"), icon: agentIcon("patrol"), tone: "emerald",
      status_ar: "متابعة الفرق الميدانية…", status_en: "Tracking field teams…",
      finding_ar: `${c.patrols_active} دورية نشطة عبر ${c.sites} موقع، و ${c.permits_active} تصريح ساري.`,
      finding_en: `${c.patrols_active} active patrols across ${c.sites} sites, ${c.permits_active} active permits.`,
    },
    {
      id: "risk",
      name_ar: agentName("risk","ar"), name_en: agentName("risk","en"),
      initials: agentInitials("risk"), icon: agentIcon("risk"), tone: c.assets_offline > 0 || c.cctv_new > 5 ? "amber" : "violet",
      status_ar: "حساب المخاطر التشغيلية…", status_en: "Calculating operational risk…",
      finding_ar: c.assets_offline > 0
        ? `${c.assets_offline} أصل خارج الخدمة و ${c.cctv_new} تنبيه كاميرا جديد — مؤشر المخاطر مرتفع نسبياً.`
        : `جميع الأصول قيد التشغيل. ${c.cctv_new} تنبيه كاميرا قيد المراجعة — مؤشر المخاطر منخفض.`,
      finding_en: c.assets_offline > 0
        ? `${c.assets_offline} asset${c.assets_offline > 1 ? "s" : ""} offline and ${c.cctv_new} new CCTV alerts — elevated risk index.`
        : `All assets operational. ${c.cctv_new} CCTV alerts under review — operational risk remains low.`,
    },
    {
      id: "compliance",
      name_ar: agentName("compliance","ar"), name_en: agentName("compliance","en"),
      initials: agentInitials("compliance"), icon: agentIcon("compliance"), tone: "violet",
      status_ar: "فحص الامتثال والتصاريح…", status_en: "Reviewing compliance & permits…",
      finding_ar: `${c.permits_active} تصريح ساري، ${c.contractors_active} مقاول معتمد نشط، ${c.visitors_inside} زائر داخل المواقع.`,
      finding_en: `${c.permits_active} active permits, ${c.contractors_active} approved contractors active, ${c.visitors_inside} visitors on-site.`,
    },
    {
      id: "reporting",
      name_ar: agentName("reporting","ar"), name_en: agentName("reporting","en"),
      initials: agentInitials("reporting"), icon: agentIcon("reporting"), tone: "emerald",
      status_ar: "إعداد الإحاطة التنفيذية…", status_en: "Preparing executive briefing…",
      finding_ar: c.incidents_critical === 0 && c.assets_offline === 0
        ? "التقرير التنفيذي جاهز — الوضع التشغيلي مستقر."
        : "التقرير التنفيذي جاهز — يتضمن بنوداً تتطلب قراراً.",
      finding_en: c.incidents_critical === 0 && c.assets_offline === 0
        ? "Executive report is ready — operational posture is stable."
        : "Executive report is ready — includes items requiring a decision.",
    },
  ];

  const closer: AgentLine = {
    id: "aria-close",
    name_ar: "آريا التنفيذية", name_en: "ARIA Executive",
    initials: "AI", icon: Brain, tone: "cyan",
    status_ar: "خلاصة آريا", status_en: "ARIA conclusion",
    finding_ar: c.incidents_critical > 0
      ? `يلزم تدخل تنفيذي: ${c.incidents_critical} حادث حرج بانتظار القرار.`
      : c.assets_offline > 0
        ? `لا توجد حوادث حرجة. يُوصى بمتابعة ${c.assets_offline} أصل خارج الخدمة.`
        : "لا يوجد ما يستدعي تدخل الإدارة حالياً.",
    finding_en: c.incidents_critical > 0
      ? `Executive action required: ${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} awaiting decision.`
      : c.assets_offline > 0
        ? `No critical incidents. Recommend follow-up on ${c.assets_offline} offline asset${c.assets_offline > 1 ? "s" : ""}.`
        : "No executive intervention is required.",
  };

  return { opener, agents, closer };
}

function agentName(id: string, l: "ar"|"en"): string {
  const map: Record<string, {ar:string;en:string}> = {
    security: { ar: "وكيل الأمن", en: "Security Agent" },
    patrol:   { ar: "وكيل الدوريات", en: "Patrol Agent" },
    risk:     { ar: "وكيل المخاطر", en: "Risk Agent" },
    compliance:{ ar: "وكيل الامتثال", en: "Compliance Agent" },
    reporting:{ ar: "وكيل التقارير", en: "Reporting Agent" },
  };
  return map[id]?.[l] ?? id;
}
function agentInitials(id: string): string {
  return ({security:"SC",patrol:"PT",risk:"RK",compliance:"CP",reporting:"RP"} as Record<string,string>)[id] ?? "AG";
}
function agentIcon(id: string): typeof ShieldAlert {
  return ({security:ShieldAlert,patrol:Activity,risk:Radar,compliance:BadgeCheck,reporting:FileBarChart2} as Record<string, typeof ShieldAlert>)[id] ?? ShieldAlert;
}
function agentTone(id: string): AgentTone {
  return ({security:"rose",patrol:"emerald",risk:"amber",compliance:"violet",reporting:"cyan"} as Record<string,AgentTone>)[id] ?? "cyan";
}

function greeting(): { ar: string; en: string } {
  const h = new Date().getHours();
  if (h < 12) return { ar: "صباح الخير", en: "Good morning" };
  if (h < 18) return { ar: "مساء الخير", en: "Good afternoon" };
  return { ar: "مساء الخير", en: "Good evening" };
}

/* ────────────────────────────────────────────────────────────
   AGENT RUNTIME PROFILES (voice-ready, no implementation)
   ──────────────────────────────────────────────────────────── */
function buildAgentRuntimeProfiles(): AgentRuntimeProfile[] {
  const make = (id: keyof typeof DEFAULT_VOICE_PROFILES, personality: AgentRuntimeProfile["personality"]): AgentRuntimeProfile => ({
    id,
    name_ar: DEFAULT_VOICE_PROFILES[id].ar.displayName,
    name_en: DEFAULT_VOICE_PROFILES[id].en.displayName,
    personality,
    voiceProfile: DEFAULT_VOICE_PROFILES[id].ar,
    language: "ar",
    voiceEnabled: false,
    speechQueue: [],
    conversationHistory: [],
  });
  return [
    make("aria", "executive"),
    make("security", "vigilant"),
    make("patrol", "field"),
    make("risk", "analytical"),
    make("compliance", "advisory"),
    make("reporting", "narrative"),
  ];
}

/* ────────────────────────────────────────────────────────────
   UI BUILDING BLOCKS
   ──────────────────────────────────────────────────────────── */

function AgentAvatar({ initials, tone, alive, speaking }: { initials: string; tone: AgentTone; alive: boolean; speaking: boolean }) {
  const t = TONE[tone];
  return (
    <div className="relative shrink-0">
      <div className={cn("h-10 w-10 rounded-full grid place-items-center border text-xs font-medium text-white/90 backdrop-blur", t.ring, t.bg)}>
        {initials}
      </div>
      {alive && (
        <span className={cn(
          "absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full ring-2 ring-[#061A2E]",
          t.dot,
          speaking ? "animate-pulse" : ""
        )} />
      )}
    </div>
  );
}

type TurnState = "queued" | "thinking" | "speaking" | "done";

/**
 * One step in the vertical agent narrative.
 * Renders: live dot + agent name on one line, status line beneath,
 * and (once spoken) a check + finding bullet.
 */
function AgentStep({ line, state, ar, isAria }: { line: AgentLine; state: TurnState; ar: boolean; isAria?: boolean }) {
  const t = TONE[line.tone];
  const visible = state !== "queued";
  const spoken = state === "speaking" || state === "done";

  return (
    <div className={cn(
      "transition-all duration-500",
      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
    )}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 mt-1">
          <span className={cn("block h-2.5 w-2.5 rounded-full", t.dot, visible && "shadow-[0_0_12px_currentColor]")} />
          {state === "speaking" && (
            <span className={cn("absolute inset-0 rounded-full animate-ping", t.dot, "opacity-60")} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium", isAria ? "text-cyan-200" : "text-white/90")}>
              {ar ? line.name_ar : line.name_en}
            </span>
            {state === "done" && (
              <CheckCircle2 className={cn("h-3.5 w-3.5", t.text)} aria-hidden />
            )}
          </div>
          <div className="text-[12px] text-white/55 mt-0.5">
            {ar ? line.status_ar : line.status_en}
          </div>

          {state === "thinking" && (
            <div className={cn("mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 border", t.ring, t.soft)}>
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.2s]", t.dot)} />
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.1s]", t.dot)} />
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce", t.dot)} />
            </div>
          )}

          {spoken && (
            <div className={cn(
              "mt-2 text-sm leading-relaxed",
              isAria ? "text-white/95" : "text-white/85"
            )}>
              {ar ? line.finding_ar : line.finding_en}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-start ps-1 my-1.5">
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 transition-all duration-500",
          active ? "text-cyan-300/70 opacity-100" : "text-white/15 opacity-50"
        )}
        aria-hidden
      />
    </div>
  );
}

function CollaborationStream({ opener, agents, closer, ar }: { opener: AgentLine; agents: AgentLine[]; closer: AgentLine; ar: boolean }) {
  // Choreography: opener → each agent thinking → speaking → done → closer.
  const seq = useMemo(() => [opener, ...agents, closer], [opener, agents, closer]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    const id = setInterval(() => setTick(v => v + 1), 700);
    return () => clearInterval(id);
  }, [seq]);

  // Each turn occupies 3 ticks: thinking → speaking → done.
  function stateFor(i: number): TurnState {
    const base = i * 3;
    if (tick < base) return "queued";
    if (tick === base) return "thinking";
    if (tick === base + 1) return "speaking";
    return "done";
  }

  const lastIdx = seq.length - 1;

  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-white/[0.02] backdrop-blur-xl p-5 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-400/15 border border-cyan-400/40 grid place-items-center">
            <Brain className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <div className="text-sm text-white font-medium">{ar ? "تعاون آريا والوكلاء" : "ARIA & Agents Collaboration"}</div>
            <div className="text-[11px] text-cyan-200/70">{ar ? "بث مباشر للتقييم التشغيلي" : "Live operational assessment stream"}</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/50">
          <Mic className="h-3.5 w-3.5" />
          {ar ? "الصوت جاهز — غير مفعل" : "Voice ready — not enabled"}
        </div>
      </div>

      <div>
        {seq.map((line, i) => {
          const isLast = i === lastIdx;
          const isAria = i === 0 || isLast;
          const isClosingSynthesis = isLast;
          const state = stateFor(i);
          return (
            <div key={`${line.id}-${i}`}>
              {isClosingSynthesis && state !== "queued" ? (
                <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/[0.06] p-4 transition-all duration-500 opacity-100 translate-y-0">
                  <AgentStep line={line} state={state} ar={ar} isAria />
                </div>
              ) : (
                <AgentStep line={line} state={state} ar={ar} isAria={isAria} />
              )}
              {!isLast && <StepConnector active={stateFor(i + 1) !== "queued"} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   STAT CARDS / STATUS / TIMELINE
   ──────────────────────────────────────────────────────────── */

function StatCard({
  label, value, hint, icon: Icon, tone = "cyan",
}: { label: string; value: string | number; hint?: string; icon: typeof Activity; tone?: AgentTone }) {
  const t = TONE[tone];
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 hover:border-cyan-400/30 hover:bg-white/[0.05] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="text-xs text-white/60">{label}</div>
        <div className={cn("h-8 w-8 rounded-lg grid place-items-center border", t.ring, t.bg, t.text)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-light text-white tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-white/50">{hint}</div>}
    </div>
  );
}

function OverallStatusBanner({ status, ar, narrative }: { status: "stable" | "attention" | "critical"; ar: boolean; narrative: string }) {
  const map = {
    stable:    { tone: "emerald" as AgentTone, ar: "الوضع التشغيلي مستقر", en: "Operational Posture: Stable" },
    attention: { tone: "amber"   as AgentTone, ar: "الوضع التشغيلي يتطلب متابعة", en: "Operational Posture: Attention" },
    critical:  { tone: "rose"    as AgentTone, ar: "الوضع التشغيلي حرج", en: "Operational Posture: Critical" },
  };
  const m = map[status];
  const t = TONE[m.tone];
  return (
    <div className={cn("rounded-2xl border p-5 md:p-6 backdrop-blur-xl flex items-start gap-4", t.ring, t.bg)}>
      <ShieldCheck className={cn("h-6 w-6 mt-0.5", t.text)} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">{ar ? "آخر تحديث الآن" : "Updated just now"}</div>
        <div className="text-lg md:text-xl text-white font-light mt-1">{ar ? m.ar : m.en}</div>
        <div className="text-sm text-white/70 mt-1.5">{narrative}</div>
      </div>
    </div>
  );
}

type TimelineItem = {
  id: string;
  ts: number;
  icon: typeof ShieldAlert;
  tone: AgentTone;
  title_ar: string;
  title_en: string;
  meta_ar?: string;
  meta_en?: string;
};

function buildTimeline(ov: Awaited<ReturnType<typeof getSecOverview>> | undefined): TimelineItem[] {
  if (!ov) return [];
  const items: TimelineItem[] = [];
  for (const i of ov.incidents.slice(0, 6)) {
    const ts = i.reported_at ? new Date(i.reported_at).getTime() : Date.now();
    items.push({
      id: `inc-${i.id}`, ts, icon: AlertTriangle,
      tone: i.severity === "critical" ? "rose" : i.severity === "high" ? "amber" : "cyan",
      title_ar: i.title_ar ?? i.title_en ?? "حادث",
      title_en: i.title_en ?? i.title_ar ?? "Incident",
      meta_ar: `حدث · ${i.severity ?? "—"} · ${i.status ?? "—"}`,
      meta_en: `Incident · ${i.severity ?? "—"} · ${i.status ?? "—"}`,
    });
  }
  for (const p of ov.patrols.slice(0, 4)) {
    const ts = p.started_at ? new Date(p.started_at).getTime() : Date.now();
    items.push({
      id: `pat-${p.id}`, ts, icon: Activity, tone: "emerald",
      title_ar: "جولة ميدانية", title_en: "Field patrol",
      meta_ar: `الحالة: ${p.status ?? "—"}`, meta_en: `Status: ${p.status ?? "—"}`,
    });
  }
  for (const c of ov.cctv.slice(0, 4)) {
    const ts = c.detected_at ? new Date(c.detected_at).getTime() : Date.now();
    items.push({
      id: `cctv-${c.id}`, ts, icon: Camera, tone: c.status === "new" ? "amber" : "cyan",
      title_ar: "تنبيه كاميرا", title_en: "CCTV alert",
      meta_ar: `الحالة: ${c.status ?? "—"}`, meta_en: `Status: ${c.status ?? "—"}`,
    });
  }
  for (const v of ov.visitors.slice(0, 3)) {
    const ts = v.check_in_at ? new Date(v.check_in_at).getTime() : Date.now();
    items.push({
      id: `vis-${v.id}`, ts, icon: Users, tone: v.status === "overdue" ? "rose" : "violet",
      title_ar: "دخول زائر", title_en: "Visitor check-in",
      meta_ar: `الحالة: ${v.status ?? "—"}`, meta_en: `Status: ${v.status ?? "—"}`,
    });
  }
  return items.sort((a, b) => b.ts - a.ts).slice(0, 10);
}

function relativeTime(ts: number, ar: boolean): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return ar ? "الآن" : "now";
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return ar ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return ar ? `قبل ${d} ي` : `${d}d ago`;
}

function ActivityTimeline({ items, ar }: { items: TimelineItem[]; ar: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="h-4 w-4 text-cyan-300" />
        <div className="text-sm text-white/85">{ar ? "النشاط الحي" : "Live Activity"}</div>
        <span className="ms-auto text-[11px] text-white/40">{items.length} {ar ? "حدث" : "events"}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-white/50">{ar ? "لا توجد أحداث حديثة." : "No recent events."}</div>
      ) : (
        <ol className="space-y-3">
          {items.map(it => {
            const t = TONE[it.tone];
            const Icon = it.icon;
            return (
              <li key={it.id} className="flex items-start gap-3">
                <div className={cn("h-7 w-7 rounded-lg border grid place-items-center shrink-0", t.ring, t.bg, t.text)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white/90 truncate">{ar ? it.title_ar : it.title_en}</div>
                  <div className="text-[11px] text-white/50">{ar ? it.meta_ar : it.meta_en}</div>
                </div>
                <div className="text-[11px] text-white/40 tabular-nums whitespace-nowrap">{relativeTime(it.ts, ar)}</div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   WELCOME OVERLAY (premium, smooth, ~1.6s — no blocking)
   ──────────────────────────────────────────────────────────── */
function WelcomeOverlay({ onDone, ar, name }: { onDone: () => void; ar: boolean; name: string }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(onDone, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const g = greeting();
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-[#061A2E] transition-opacity duration-500",
      phase === 2 ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.18),transparent_60%)]" />
      <div className="relative text-center px-6">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full border border-cyan-400/40 grid place-items-center animate-pulse">
          <Sparkles className="h-7 w-7 text-cyan-300" />
        </div>
        <div className={cn("text-3xl md:text-4xl font-light tracking-wide text-white transition-all duration-700",
          phase >= 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          {ar ? `${g.ar}${name ? `، ${name}` : ""}.` : `${g.en}${name ? `, ${name}` : ""}.`}
        </div>
        <div className={cn("mt-3 text-sm md:text-base text-cyan-200/80 transition-all duration-700 delay-200",
          phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          {ar ? "تبدأ آريا التقييم التشغيلي…" : "ARIA is starting the operational assessment…"}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   EXECUTIVE ACTIONS
   ──────────────────────────────────────────────────────────── */
const ACTIONS = [
  { to: "/sec",                icon: Activity,       ar: "العمليات",      en: "Operations" },
  { to: "/sec",                icon: AlertTriangle,  ar: "الحوادث",       en: "Incidents" },
  { to: "/sec/maintenance",    icon: Wrench,         ar: "أوامر العمل",   en: "Work Orders" },
  { to: "/executive-reports",  icon: FileBarChart2,  ar: "التقارير",       en: "Reports" },
  { to: "/aria",               icon: MessageSquare,  ar: "اسأل آريا",     en: "Ask ARIA" },
] as const;

/* ────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────── */

function MissionControl() {
  const { locale, setLocale } = useI18n();
  const ar = locale === "ar";
  const [welcomeDone, setWelcomeDone] = useState(false);

  const fetchOverview = useServerFn(getSecOverview);
  const q = useQuery({
    queryKey: ["mission-control-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const ov = q.data;
  const hasData = !!ov && ov.counts.sites > 0;
  const displayName = ar ? "قائد المنطقة الغربية" : "Western Region Commander";

  const script = useMemo(() => buildAgentScript(ov, hasData, displayName), [ov, hasData, displayName]);
  const timeline = useMemo(() => buildTimeline(ov), [ov]);
  const runtimeProfiles = useMemo(() => buildAgentRuntimeProfiles(), []);

  const status: "stable" | "attention" | "critical" = useMemo(() => {
    if (!ov || !hasData) return "stable";
    if (ov.counts.incidents_critical > 0) return "critical";
    if (ov.counts.incidents_open > 3 || ov.counts.assets_offline > 0) return "attention";
    return "stable";
  }, [ov, hasData]);

  const narrative = useMemo(() => {
    if (!ov || !hasData) return ar ? "لا توجد سجلات تشغيلية حية متاحة." : "No live operational records available.";
    const c = ov.counts;
    if (status === "critical") {
      return ar
        ? `يوجد ${c.incidents_critical} حادث حرج يتطلب قراراً تنفيذياً، مع ${c.patrols_active} دورية نشطة.`
        : `${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} require executive decision, with ${c.patrols_active} patrols active.`;
    }
    if (status === "attention") {
      return ar
        ? `لا حوادث حرجة. ${c.assets_offline} أصل خارج الخدمة و ${c.incidents_open} حادث مفتوح قيد المعالجة.`
        : `No critical incidents. ${c.assets_offline} asset${c.assets_offline > 1 ? "s" : ""} offline and ${c.incidents_open} open incidents in progress.`;
    }
    return ar
      ? `جميع الدوريات منفذة، الأصول قيد التشغيل، ولا توجد مخاطر مرتفعة.`
      : `All patrols executed, assets operational, no elevated risks detected.`;
  }, [ov, hasData, status, ar]);

  const recommendations = useMemo<string[]>(() => {
    if (!ov || !hasData) return [ar ? "لا توجد سجلات تشغيلية حية متاحة." : "No live operational records available."];
    const r: string[] = [];
    const c = ov.counts;
    if (c.incidents_critical > 0) r.push(ar
      ? `تصعيد ${c.incidents_critical} حادث حرج إلى قائد الموقع.`
      : `Escalate ${c.incidents_critical} critical incident${c.incidents_critical > 1 ? "s" : ""} to the site commander.`);
    if (c.assets_offline > 0) r.push(ar
      ? `فتح أمر عمل عاجل لإعادة ${c.assets_offline} أصل إلى الخدمة.`
      : `Open priority work order to restore ${c.assets_offline} offline asset${c.assets_offline > 1 ? "s" : ""}.`);
    if (c.cctv_new > 5) r.push(ar
      ? `مراجعة ${c.cctv_new} تنبيه كاميرا جديد قبل تسليم الوردية.`
      : `Review ${c.cctv_new} new CCTV alerts before shift handover.`);
    if (r.length === 0) r.push(ar
      ? "لا توجد إجراءات تنفيذية مطلوبة. الوضع التشغيلي ضمن الحدود."
      : "No executive action required. Operational posture within thresholds.");
    return r;
  }, [ov, hasData, ar]);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-[#061A2E] text-white relative overflow-hidden">
      {!welcomeDone && <WelcomeOverlay ar={ar} onDone={() => setWelcomeDone(true)} name={displayName} />}

      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[700px] rounded-full bg-[#3AE8FF]/5 blur-[120px]" />
      </div>

      <div className={cn(
        "relative max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12 transition-opacity duration-700",
        welcomeDone ? "opacity-100" : "opacity-0"
      )}>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">
              {ar ? "إدارة الأمن الصناعي — المنطقة الغربية" : "Industrial Security — Western Region"}
            </div>
            <h1 className="mt-2 text-3xl md:text-5xl font-light tracking-tight">
              {ar ? "مركز القيادة التنفيذي" : "Executive Mission Control"}
            </h1>
            <p className="mt-2 text-white/60 max-w-2xl text-sm md:text-base">
              {ar
                ? "بث لحظي للوضع التشغيلي تقدّمه آريا بدعم من وكلاء التحليل المتخصصين، باستخدام البيانات الحية فقط."
                : "Live operational stream conducted by ARIA and specialist agents, powered strictly by real data."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[11px] text-white/50 px-3 py-2 rounded-full border border-white/10 bg-white/[0.03]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {ar ? "متصل مباشرة" : "Live"}
            </div>
            <button
              type="button"
              onClick={() => setLocale(ar ? "en" : "ar")}
              className="text-[11px] uppercase tracking-[0.2em] px-3 py-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 transition"
              aria-label={ar ? "تبديل اللغة" : "Switch language"}
            >
              {ar ? "EN" : "ع"}
            </button>
          </div>
        </div>

        {/* Status */}
        <OverallStatusBanner status={status} ar={ar} narrative={narrative} />

        {/* Living Executive Narrator — real enterprise_events stream */}
        <div className="mt-6">
          <ExecutiveNarrator ar={ar} />
        </div>

        {/* Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard label={ar ? "تنبيهات حرجة" : "Critical Alerts"}
            value={ov?.counts.incidents_critical ?? 0} icon={AlertTriangle} tone="rose"
            hint={ar ? "تتطلب قراراً فورياً" : "Require immediate action"} />
          <StatCard label={ar ? "حوادث نشطة" : "Active Incidents"}
            value={ov?.counts.incidents_open ?? 0} icon={ShieldAlert} tone="amber"
            hint={ar ? "مفتوحة قيد المعالجة" : "Open and in-progress"} />
          <StatCard label={ar ? "تصاريح وعمليات" : "Permits & Ops"}
            value={ov?.counts.permits_active ?? 0} icon={Wrench} tone="cyan"
            hint={ar ? "تصاريح سارية" : "Active permits"} />
          <StatCard label={ar ? "دوريات نشطة" : "Active Patrols"}
            value={ov?.counts.patrols_active ?? 0} icon={Activity} tone="emerald"
            hint={ar ? `${ov?.counts.sites ?? 0} موقع صناعي` : `${ov?.counts.sites ?? 0} industrial sites`} />
        </div>

        {/* Collaboration + Timeline + ARIA Summary */}
        <div className="mt-6 grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <CollaborationStream opener={script.opener} agents={script.agents} closer={script.closer} ar={ar} />
          </div>
          <div className="space-y-4 md:space-y-6">
            <ActivityTimeline items={timeline} ar={ar} />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-cyan-400/15 border border-cyan-400/30 grid place-items-center">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{ar ? "ملخص آريا" : "ARIA Summary"}</div>
                  <div className="text-[11px] text-white/50">{ar ? "توصيات تنفيذية" : "Executive recommendations"}</div>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm text-white/85 flex-1">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <ArrowRight className={cn("h-4 w-4 mt-1 shrink-0 text-cyan-300", ar && "rotate-180")} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <Link to="/aria"
                className="mt-5 inline-flex items-center justify-between gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-400/20 transition">
                <span>{ar ? "متابعة مع آريا" : "Continue with ARIA"}</span>
                <ArrowRight className={cn("h-4 w-4", ar && "rotate-180")} />
              </Link>
            </div>
          </div>
        </div>

        {/* Sites strip */}
        {hasData && ov && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapIcon className="h-4 w-4 text-cyan-300" />
              <div className="text-sm text-white/80">
                {ar ? "المواقع الصناعية — المنطقة الغربية" : "Industrial Sites — Western Region"}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ov.sites.slice(0, 6).map(s => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-sm text-white">{ar ? (s.name_ar ?? s.name_en) : (s.name_en ?? s.name_ar)}</div>
                  <div className="text-xs text-white/50 mt-1">{s.code} · {s.sensitivity}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Actions */}
        <div className="mt-8">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-3">
            {ar ? "الإجراءات التنفيذية" : "Executive Actions"}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.to + a.en} to={a.to}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all duration-300 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-cyan-400/10 border border-cyan-400/20 grid place-items-center group-hover:bg-cyan-400/20 transition">
                    <Icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-sm text-white/90">{ar ? a.ar : a.en}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Voice-ready footer (architectural) */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <Mic className="h-3.5 w-3.5" />
            <span>
              {ar
                ? `الصوت جاهز معمارياً لـ ${runtimeProfiles.length} وكيل — لم يُفعّل بعد.`
                : `Voice architecture prepared for ${runtimeProfiles.length} agents — not enabled yet.`}
            </span>
          </div>
          <div className="uppercase tracking-[0.3em]">
            {ar ? "نظام نِكسس للذكاء التشغيلي" : "Nexus AI Operating System"}
          </div>
        </div>
      </div>
    </div>
  );
}
