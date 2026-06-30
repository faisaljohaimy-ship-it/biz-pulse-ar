import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bot, Activity, ShieldCheck, Cpu, Sparkles, MessageSquare } from "lucide-react";
import { listAgents, listAgentRuns } from "@/lib/exec.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * AgentRing — Executive AI Command Center surface.
 *
 * Cinematic neural ring of production agents (`agent_definitions`) orbiting
 * the ARIA core. Every node is alive: heartbeat pulse, status halo,
 * orbital sway, and SVG energy lines that flow toward ARIA when the agent
 * is actively running. Status is derived from the latest `agent_runs` rows.
 *
 * EXECUTIVE CONTRACT (silent agents): the surrounding agents are background
 * workers — they NEVER converse with the user. Only ARIA replies. Hover/focus
 * reveals read-only telemetry; the action CTA always routes the executive
 * back to ARIA, who orchestrates the rest of the swarm.
 *
 * Charter v10.0: no fabricated names/metrics. RLS-gated; unauthenticated
 * mounts render skeleton pips, never demo agents.
 */

type AgentRow = {
  id: string;
  name: string;
  goal: string | null;
  model: string | null;
  enabled: boolean | null;
};

type RunRow = {
  id: string;
  agent_id: string;
  status: string | null;
  summary: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type AgentVM = {
  id: string;
  name: string;
  goal: string;
  model: string;
  enabled: boolean;
  status: "active" | "idle" | "error" | "unknown";
  lastSummary: string;
  lastRunAt: string | null;
};

function deriveStatus(run: RunRow | undefined): AgentVM["status"] {
  if (!run) return "unknown";
  const s = (run.status ?? "").toLowerCase();
  if (s === "running" || s === "in_progress" || s === "pending") return "active";
  if (s === "succeeded" || s === "success" || s === "completed") return "idle";
  if (s === "failed" || s === "error" || s === "cancelled") return "error";
  return "unknown";
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} س`;
  return `${Math.floor(h / 24)} ي`;
}

const TONE: Record<
  AgentVM["status"],
  { ring: string; dot: string; glow: string; stroke: string; label: string }
> = {
  active: {
    ring: "border-emerald-300/70",
    dot: "bg-emerald-300",
    glow: "shadow-[0_0_22px_rgba(110,231,183,0.55)]",
    stroke: "rgba(110,231,183,0.55)",
    label: "نشط",
  },
  idle: {
    ring: "border-[#3AE8FF]/60",
    dot: "bg-[#3AE8FF]",
    glow: "shadow-[0_0_18px_rgba(58,232,255,0.45)]",
    stroke: "rgba(58,232,255,0.35)",
    label: "جاهز",
  },
  error: {
    ring: "border-rose-400/70",
    dot: "bg-rose-400",
    glow: "shadow-[0_0_22px_rgba(251,113,133,0.55)]",
    stroke: "rgba(251,113,133,0.5)",
    label: "تنبيه",
  },
  unknown: {
    ring: "border-white/15",
    dot: "bg-white/35",
    glow: "shadow-[0_0_10px_rgba(255,255,255,0.15)]",
    stroke: "rgba(255,255,255,0.08)",
    label: "—",
  },
};

export function AgentRing() {
  const fetchAgents = useServerFn(listAgents);
  const fetchRuns = useServerFn(listAgentRuns);

  // Only call protected server fns when a Supabase session exists.
  // Public/landing visitors have no bearer token → would 401.
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const agentsQ = useQuery({
    queryKey: ["exec", "agents", "ring"],
    queryFn: async () => {
      try {
        return await fetchAgents();
      } catch {
        return null;
      }
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
    enabled: hasSession,
  });

  const runsQ = useQuery({
    queryKey: ["exec", "agent-runs", "ring"],
    queryFn: async () => {
      try {
        return await fetchRuns();
      } catch {
        return null;
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: false,
  });

  const agents: AgentVM[] = useMemo(() => {
    const rows = (agentsQ.data ?? []) as AgentRow[];
    const runs = (runsQ.data ?? []) as RunRow[];
    const latestByAgent = new Map<string, RunRow>();
    for (const r of runs) {
      if (!r.agent_id) continue;
      const prev = latestByAgent.get(r.agent_id);
      if (!prev) {
        latestByAgent.set(r.agent_id, r);
        continue;
      }
      const a = prev.started_at ? new Date(prev.started_at).getTime() : 0;
      const b = r.started_at ? new Date(r.started_at).getTime() : 0;
      if (b > a) latestByAgent.set(r.agent_id, r);
    }
    return rows
      .filter((a) => a.enabled !== false)
      .slice(0, 14)
      .map((a) => {
        const run = latestByAgent.get(a.id);
        return {
          id: a.id,
          name: a.name,
          goal: a.goal ?? "",
          model: a.model ?? "openai/gpt-5",
          enabled: a.enabled !== false,
          status: deriveStatus(run),
          lastSummary: run?.summary ?? "",
          lastRunAt: run?.finished_at ?? run?.started_at ?? null,
        } satisfies AgentVM;
      });
  }, [agentsQ.data, runsQ.data]);

  const loading = agentsQ.isLoading;
  const empty = !loading && agents.length === 0;
  const [active, setActive] = useState<string | null>(null);
  const activeVM = agents.find((a) => a.id === active) ?? null;

  // Geometry. SVG/positioning lives in a 100x100 normalized coord space so
  // the layer scales fluidly with the container.
  const count = Math.max(agents.length, loading ? 8 : 0);
  const RADIUS = 42; // % from center
  const pips = Array.from({ length: count }, (_, i) => {
    const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + RADIUS * Math.cos(angle);
    const y = 50 + RADIUS * Math.sin(angle);
    return { i, x, y };
  });

  return (
    <section
      aria-label="مركز قيادة الذكاء التنفيذي — حلقة الوكلاء الصامتين حول آريا"
      className="relative mx-auto mt-10 w-full max-w-5xl px-4 sm:mt-16 sm:px-6"
    >
      {/* Local cinematic keyframes — scoped to the ring so they don't leak. */}
      <style>{`
        @keyframes ring-heartbeat { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.06); } }
        @keyframes ring-orbit-sway { 0%,100% { transform: translate(-50%,-50%) translateY(0px); } 50% { transform: translate(-50%,-50%) translateY(-3px); } }
        @keyframes ring-bloom { 0%,100% { opacity: .35; transform: translate(-50%,-50%) scale(1); } 50% { opacity: .65; transform: translate(-50%,-50%) scale(1.08); } }
        @keyframes ring-energy-flow { to { stroke-dashoffset: -40; } }
        @keyframes ring-particle { 0% { opacity: 0; transform: translate(-50%,-50%) translateY(0) scale(.6); } 25% { opacity: .9; } 100% { opacity: 0; transform: translate(-50%,-50%) translateY(-22px) scale(1); } }
        @keyframes ring-core-breathe { 0%,100% { transform: translate(-50%,-50%) scale(1); box-shadow: 0 0 60px rgba(0,212,255,0.40), 0 0 120px rgba(0,212,255,0.15); } 50% { transform: translate(-50%,-50%) scale(1.035); box-shadow: 0 0 80px rgba(0,212,255,0.60), 0 0 160px rgba(58,232,255,0.25); } }
        @media (prefers-reduced-motion: reduce) {
          .ring-anim, .ring-anim * { animation: none !important; }
        }
      `}</style>

      <div className="mb-5 text-center sm:mb-7">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70 sm:text-[11px]">
          Executive AI Command Center
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          آريا — العقل التنفيذي
        </h2>
        <p className="mx-auto mt-1 max-w-xl text-xs text-white/55 sm:text-sm">
          الوكلاء يعملون بصمت في الخلفية. آريا وحدها تتحدّث إليك — والحالة مستمدة من{" "}
          <code className="text-white/70">agent_runs</code> الفعلية.
        </p>
      </div>

      <div className="ring-anim relative mx-auto aspect-square w-full max-w-[520px]">
        {/* Volumetric backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,212,255,0.18) 0%, rgba(0,212,255,0.06) 35%, transparent 65%)",
          }}
        />
        {/* Animated concentric energy rings (3 layers, staggered breathing) */}
        {[0, 0.6, 1.2].map((delay, idx) => (
          <div
            key={idx}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-[#00D4FF]/20"
            style={{
              width: `${88 - idx * 16}%`,
              height: `${88 - idx * 16}%`,
              animation: `ring-bloom 6s ease-in-out ${delay}s infinite`,
              transform: "translate(-50%,-50%)",
              boxShadow: "inset 0 0 30px rgba(0,212,255,0.08)",
            }}
          />
        ))}

        {/* Connector network — energy lines from ARIA core to each pip. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <radialGradient id="ring-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(58,232,255,0.35)" />
              <stop offset="60%" stopColor="rgba(0,212,255,0.08)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0)" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="url(#ring-core-glow)" />
          {pips.map(({ i, x, y }) => {
            const a = agents[i];
            const tone = a ? TONE[a.status] : TONE.unknown;
            const isActive = a?.status === "active";
            const isAlert = a?.status === "error";
            return (
              <line
                key={`link-${i}`}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke={tone.stroke}
                strokeWidth={isActive || isAlert ? 0.35 : 0.18}
                strokeDasharray={isActive || isAlert ? "1.2 1.6" : "0.6 2.4"}
                style={
                  isActive || isAlert
                    ? { animation: `ring-energy-flow ${isAlert ? 1.6 : 2.4}s linear infinite` }
                    : undefined
                }
                opacity={a ? 0.85 : 0.35}
              />
            );
          })}
        </svg>

        {/* Central ARIA core — breathing, scan ray, only interactive AI. */}
        <Link
          to="/aria"
          aria-label="افتح آريا — المساعد التنفيذي الوحيد"
          className="group absolute left-1/2 top-1/2 flex h-28 w-28 items-center justify-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#00D4FF]/35 via-[#0a2a44] to-[#061A2E] text-white sm:h-32 sm:w-32"
          style={{
            animation: "ring-core-breathe 5.2s ease-in-out infinite",
            transform: "translate(-50%,-50%)",
          }}
        >
          {/* Scan ray */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-1 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(58,232,255,0) 0deg, rgba(58,232,255,0.55) 40deg, rgba(58,232,255,0) 90deg, rgba(58,232,255,0) 360deg)",
              animation: "aria-orb-spin 6s linear infinite",
              maskImage: "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
              WebkitMaskImage:
                "radial-gradient(circle, transparent 38%, black 42%, black 78%, transparent 82%)",
            }}
          />
          {/* Inner orb */}
          <span
            aria-hidden
            className="absolute inset-3 rounded-full border border-[#3AE8FF]/30"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(58,232,255,0.45), rgba(0,212,255,0.05) 60%, transparent 70%)",
            }}
          />
          <div className="relative text-center transition-transform group-hover:scale-105">
            <Sparkles className="mx-auto h-7 w-7 text-[#3AE8FF] drop-shadow-[0_0_8px_rgba(58,232,255,0.8)]" />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/85">
              ARIA
            </div>
          </div>
          {/* Particle emission (3 staggered motes) */}
          {[0, 1.4, 2.8].map((delay, idx) => (
            <span
              key={idx}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-[#3AE8FF]"
              style={{
                animation: `ring-particle 4s ease-out ${delay}s infinite`,
                boxShadow: "0 0 8px rgba(58,232,255,0.9)",
              }}
            />
          ))}
        </Link>

        {/* Pips */}
        {pips.map(({ i, x, y }) => {
          const a = agents[i];
          if (!a) {
            return (
              <span
                key={`skeleton-${i}`}
                className="absolute h-10 w-10 animate-pulse rounded-full border border-white/10 bg-white/[0.04]"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%,-50%)",
                }}
                aria-hidden
              />
            );
          }
          const tone = TONE[a.status];
          const isActive = active === a.id;
          const isRunning = a.status === "active";
          // Pip "breathes" at slightly different phases so the ring feels alive
          // rather than mechanical. Errors pulse faster; idle pulses slower.
          const beatDur = a.status === "error" ? 1.4 : a.status === "active" ? 1.8 : 3.2;
          const swayDelay = (i % 6) * 0.4;
          return (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => setActive(a.id)}
              onFocus={() => setActive(a.id)}
              onMouseLeave={() => setActive((cur) => (cur === a.id ? null : cur))}
              onBlur={() => setActive((cur) => (cur === a.id ? null : cur))}
              onClick={() => setActive(a.id)}
              aria-label={`${a.name} — ${tone.label} (وكيل خلفي صامت)`}
              aria-pressed={isActive}
              className={[
                "absolute flex h-11 w-11 items-center justify-center rounded-full border bg-[#061A2E]/75 backdrop-blur-md transition-transform duration-300 will-change-transform",
                tone.ring,
                tone.glow,
                isActive ? "z-10 scale-110 ring-2 ring-[#3AE8FF]/70" : "hover:scale-110",
              ].join(" ")}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animation: `${isRunning ? "ring-heartbeat" : "ring-orbit-sway"} ${beatDur}s ease-in-out ${swayDelay}s infinite`,
              }}
            >
              {/* Halo behind running agents */}
              {isRunning && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-1 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${tone.stroke} 0%, transparent 70%)`,
                  }}
                />
              )}
              <Bot className="relative h-4 w-4 text-white/90" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${tone.dot} ring-2 ring-[#061A2E]`}
                style={isRunning ? { boxShadow: `0 0 8px ${tone.stroke}` } : undefined}
              />
            </button>
          );
        })}
      </div>

      {/* Inspector — telemetry only. The CTA always defers to ARIA. */}
      <div
        role="status"
        aria-live="polite"
        className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#00D4FF]/25 bg-[#061A2E]/70 p-4 shadow-[0_0_30px_rgba(0,212,255,0.15)] backdrop-blur sm:p-5"
      >
        {empty ? (
          <EmptyState />
        ) : activeVM ? (
          <Inspector vm={activeVM} />
        ) : loading ? (
          <p className="text-center text-xs text-white/55">جارٍ تحميل حلقة الوكلاء…</p>
        ) : (
          <p className="text-center text-xs text-white/55">
            مرّر فوق أي وكيل لعرض حالته. التواصل والقرارات تمرّ عبر آريا فقط.
          </p>
        )}
      </div>
    </section>
  );
}

function Inspector({ vm }: { vm: AgentVM }) {
  const tone = TONE[vm.status];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-4">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-[#00D4FF]/10 ${tone.ring} ${tone.glow}`}
      >
        <Bot className="h-5 w-5 text-[#3AE8FF]" />
      </div>
      <div className="min-w-0 text-right sm:text-start">
        <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
          <h3 className="truncate text-sm font-semibold text-white">{vm.name}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${tone.ring}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {tone.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/55">
            وكيل خلفي صامت
          </span>
        </div>
        {vm.goal && <p className="mt-1 line-clamp-2 text-xs text-white/65">{vm.goal}</p>}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55 sm:grid-cols-3">
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            <span className="truncate" title={vm.model}>
              {vm.model}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span>{relTime(vm.lastRunAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>RLS</span>
          </div>
        </dl>
        {vm.lastSummary && (
          <p className="mt-2 line-clamp-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/65">
            {vm.lastSummary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2 sm:justify-start">
          <Link
            to="/aria"
            className="inline-flex items-center gap-1 rounded-lg border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#3AE8FF]/20"
          >
            <MessageSquare className="h-3 w-3" />
            <span>اطلب من آريا تنسيق هذا الوكيل</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center">
      <p className="text-xs text-white/65">
        الوكلاء غير متاحين على الجلسة العامة. سجّل الدخول لعرض الشبكة الحيّة من{" "}
        <code className="text-white/80">agent_definitions</code>.
      </p>
      <Link
        to="/aria"
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#3AE8FF]/20"
      >
        <Sparkles className="h-3 w-3" />
        <span>تحدّث مع آريا</span>
      </Link>
    </div>
  );
}
