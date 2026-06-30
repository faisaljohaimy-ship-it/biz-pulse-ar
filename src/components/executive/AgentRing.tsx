import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bot, Activity, ShieldCheck, Workflow, Cpu, Sparkles } from "lucide-react";
import { listAgents, listAgentRuns } from "@/lib/exec.functions";

/**
 * AgentRing — Wave 2 of the Executive Experience.
 *
 * Renders the live roster of production AI agents (`agent_definitions`) as a
 * circular command table around a central ARIA core. Each pip shows the
 * agent's status (active/idle/error) derived from the latest `agent_runs`,
 * with a hover/focus inspector that surfaces:
 *   • role + model
 *   • current/last mission status
 *   • finished_at delta
 *   • a link into Run Agent
 *
 * Data is RLS-scoped (auth required). On an unauthenticated public mount the
 * query stays loading and we render skeleton pips — never fabricated agents
 * (Charter v10.0). No fake KPIs, no static demo names.
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

const TONE: Record<AgentVM["status"], { ring: string; dot: string; glow: string; label: string }> = {
  active:  { ring: "border-emerald-300/70", dot: "bg-emerald-300",   glow: "shadow-[0_0_22px_rgba(110,231,183,0.55)]", label: "نشط" },
  idle:    { ring: "border-[#3AE8FF]/60",   dot: "bg-[#3AE8FF]",     glow: "shadow-[0_0_18px_rgba(58,232,255,0.45)]",  label: "جاهز" },
  error:   { ring: "border-rose-400/70",    dot: "bg-rose-400",      glow: "shadow-[0_0_22px_rgba(251,113,133,0.55)]", label: "تنبيه" },
  unknown: { ring: "border-white/15",       dot: "bg-white/35",      glow: "shadow-[0_0_10px_rgba(255,255,255,0.15)]", label: "—" },
};

export function AgentRing() {
  const fetchAgents = useServerFn(listAgents);
  const fetchRuns = useServerFn(listAgentRuns);

  const agentsQ = useQuery({
    queryKey: ["exec", "agents", "ring"],
    queryFn: () => fetchAgents(),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

  const runsQ = useQuery({
    queryKey: ["exec", "agent-runs", "ring"],
    queryFn: () => fetchRuns(),
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });

  const agents: AgentVM[] = useMemo(() => {
    const rows = (agentsQ.data ?? []) as AgentRow[];
    const runs = (runsQ.data ?? []) as RunRow[];
    const latestByAgent = new Map<string, RunRow>();
    for (const r of runs) {
      if (!r.agent_id) continue;
      const prev = latestByAgent.get(r.agent_id);
      if (!prev) { latestByAgent.set(r.agent_id, r); continue; }
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

  // Geometry: place pips on a circle. Mobile shrinks the radius.
  const count = Math.max(agents.length, loading ? 8 : 0);
  const pips = Array.from({ length: count }, (_, i) => {
    const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + 42 * Math.cos(angle);
    const y = 50 + 42 * Math.sin(angle);
    return { i, x, y };
  });

  return (
    <section
      aria-label="حلقة الوكلاء التنفيذية"
      className="relative mx-auto mt-10 w-full max-w-5xl px-4 sm:mt-16 sm:px-6"
    >
      <div className="mb-5 text-center sm:mb-7">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70 sm:text-[11px]">Agent Ring</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">طاولة القيادة — الوكلاء الأحياء</h2>
        <p className="mx-auto mt-1 max-w-xl text-xs text-white/55 sm:text-sm">
          الحالة مستمدة من <code className="text-white/70">agent_runs</code> الفعلية — لا بيانات مصنّعة.
        </p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[480px]">
        {/* Concentric guide rings */}
        <div className="pointer-events-none absolute inset-0 rounded-full border border-[#00D4FF]/15" />
        <div className="pointer-events-none absolute inset-[6%] rounded-full border border-[#00D4FF]/10" />
        <div className="pointer-events-none absolute inset-[14%] rounded-full border border-[#00D4FF]/8" />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.12),transparent_60%)]" />

        {/* Central ARIA core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link
            to="/runtime-hub"
            className="group relative flex h-24 w-24 items-center justify-center rounded-full border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/30 to-[#061A2E] text-white shadow-[0_0_60px_rgba(0,212,255,0.45)] transition hover:scale-[1.04] sm:h-28 sm:w-28"
            aria-label="فتح مركز التشغيل"
          >
            <span className="absolute inset-0 animate-pulse rounded-full border border-[#3AE8FF]/40" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-[#3AE8FF]" />
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">ARIA</div>
            </div>
          </Link>
        </div>

        {/* Pips */}
        {pips.map(({ i, x, y }) => {
          const a = agents[i];
          if (!a) {
            return (
              <span
                key={`skeleton-${i}`}
                className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-white/10 bg-white/[0.04]"
                style={{ left: `${x}%`, top: `${y}%` }}
                aria-hidden
              />
            );
          }
          const tone = TONE[a.status];
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onMouseEnter={() => setActive(a.id)}
              onFocus={() => setActive(a.id)}
              onMouseLeave={() => setActive((cur) => (cur === a.id ? null : cur))}
              onBlur={() => setActive((cur) => (cur === a.id ? null : cur))}
              onClick={() => setActive(a.id)}
              aria-label={`${a.name} — ${tone.label}`}
              aria-pressed={isActive}
              className={[
                "absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-[#061A2E]/70 backdrop-blur transition",
                tone.ring,
                tone.glow,
                isActive ? "scale-110 ring-2 ring-[#3AE8FF]/70" : "hover:scale-105",
              ].join(" ")}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <Bot className="h-4 w-4 text-white/90" />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${tone.dot} ring-2 ring-[#061A2E]`} />
            </button>
          );
        })}
      </div>

      {/* Inspector */}
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
            مرّر فوق أي وكيل لعرض المهمة الأخيرة وحالة التشغيل.
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
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-[#00D4FF]/10 ${tone.ring} ${tone.glow}`}>
        <Bot className="h-5 w-5 text-[#3AE8FF]" />
      </div>
      <div className="min-w-0 text-right sm:text-start">
        <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start">
          <h3 className="truncate text-sm font-semibold text-white">{vm.name}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${tone.ring}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {tone.label}
          </span>
        </div>
        {vm.goal && <p className="mt-1 line-clamp-2 text-xs text-white/65">{vm.goal}</p>}
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/55 sm:grid-cols-3">
          <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /><span className="truncate" title={vm.model}>{vm.model}</span></div>
          <div className="flex items-center gap-1"><Activity className="h-3 w-3" /><span>{relTime(vm.lastRunAt)}</span></div>
          <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /><span>RLS</span></div>
        </dl>
        {vm.lastSummary && (
          <p className="mt-2 line-clamp-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/65">
            {vm.lastSummary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-2 sm:justify-start">
          <Link
            to="/exec"
            className="inline-flex items-center gap-1 rounded-lg border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#3AE8FF]/20"
          >
            <Workflow className="h-3 w-3" />
            <span>تشغيل الوكيل</span>
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
        الوكلاء غير متاحين على الجلسة العامة. سجّل الدخول لعرض حلقة الوكلاء الحيّة من <code className="text-white/80">agent_definitions</code>.
      </p>
      <Link
        to="/runtime-hub"
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#3AE8FF]/20"
      >
        <Sparkles className="h-3 w-3" />
        <span>دخول مركز التشغيل</span>
      </Link>
    </div>
  );
}
