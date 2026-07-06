/**
 * مركز القيادة الذكي — AI Command Center
 *
 * Auth-protected executive cockpit. Every number is a real Supabase query;
 * empty/errored tables render honest empty states — never zeros as data,
 * never dashes, never random.
 *
 * Zones:
 *   1) نبض المنظومة — live counters (Supabase Realtime)
 *   2) مجلس الوكلاء — 8 agent rows; click filters Zone 3
 *   3) خط الاعتماد — unified approval pipeline (evolution_proposals +
 *      aria_improvement_proposals) with human approve/reject writes
 *   4) الأعمال العاجلة وSLA — top-6 by nearest due_at with SLA chips
 *
 * Header "ملخص آريا" calls /api/urgent-summary and speaks the returned
 * Arabic summary through the shared ARIA voice pipeline (tts field, one
 * audio instance).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Radio,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAriaSpeech } from "@/hooks/useAriaSpeech";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/command-center")({
  component: CommandCenterPage,
});

/* ═══════════════════════ Types ═══════════════════════ */

interface Agent {
  id: string;
  name_ar: string;
  focus_area: string | null;
  role: string | null;
  status: string;
}

interface UrgentTask {
  id: string;
  title_ar: string;
  department: string | null;
  priority: string;
  status: string;
  due_at: string | null;
  sla_hours: number | null;
  is_simulation: boolean;
}

interface Proposal {
  id: string;
  title: string;
  detail: string | null;
  priority: string | null;
  status: string;
  agent_id: string | null;
  origin: "evolution" | "aria";
  created_at: string;
}

interface Counters {
  agents: number | null;
  proposals: number | null;
  urgent: number | null;
  support: number | null;
}

type LiveState = "loading" | "live" | "empty" | "error";

/* ═══════════════════════ Utilities ═══════════════════════ */

const PROPOSED_STATUSES = new Set([
  "proposed",
  "pending",
  "مقترح",
  "بانتظار",
  "بانتظار الاعتماد",
]);
const APPROVED_STATUSES = new Set(["approved", "accepted", "معتمد", "مقبول"]);
const REJECTED_STATUSES = new Set(["rejected", "declined", "مرفوض"]);
const APPLIED_STATUSES = new Set([
  "applied",
  "deployed",
  "completed",
  "مطبق",
  "مطبَّق",
  "منفَّذ",
]);

function bucketOf(status: string): "proposed" | "approved" | "rejected" | "applied" | "other" {
  const s = (status ?? "").toLowerCase();
  if (PROPOSED_STATUSES.has(status) || PROPOSED_STATUSES.has(s)) return "proposed";
  if (APPROVED_STATUSES.has(status) || APPROVED_STATUSES.has(s)) return "approved";
  if (REJECTED_STATUSES.has(status) || REJECTED_STATUSES.has(s)) return "rejected";
  if (APPLIED_STATUSES.has(status) || APPLIED_STATUSES.has(s)) return "applied";
  return "other";
}

function slaChip(due_at: string | null): { text: string; tone: "red" | "amber" | "emerald" | "gray"; pulse: boolean } {
  if (!due_at) return { text: "بدون موعد", tone: "gray", pulse: false };
  const ms = new Date(due_at).getTime() - Date.now();
  const absH = Math.floor(Math.abs(ms) / 3_600_000);
  const absM = Math.floor((Math.abs(ms) % 3_600_000) / 60_000);
  if (ms < 0) return { text: `تجاوز ${absH}س ${absM}د`, tone: "red", pulse: true };
  if (ms < 4 * 3_600_000) return { text: `متبقٍ ${absH}س ${absM}د`, tone: "red", pulse: true };
  if (ms < 24 * 3_600_000) return { text: `متبقٍ ${absH}س`, tone: "amber", pulse: false };
  const d = Math.floor(ms / 86_400_000);
  return { text: `متبقٍ ${d} يوم`, tone: "emerald", pulse: false };
}

function hijriGregorian(): string {
  const now = new Date();
  const g = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric", month: "long", year: "numeric" }).format(now);
  let h = "";
  try {
    h = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(now);
  } catch {
    /* noop */
  }
  return h ? `${h} · ${g}` : g;
}

/* ═══════════════════════ Page ═══════════════════════ */

function CommandCenterPage() {
  const [counters, setCounters] = useState<Counters>({ agents: null, proposals: null, urgent: null, support: null });
  const [liveState, setLiveState] = useState<Record<keyof Counters, LiveState>>({
    agents: "loading", proposals: "loading", urgent: "loading", support: "loading",
  });

  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [agentsErr, setAgentsErr] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [proposalsErr, setProposalsErr] = useState<string | null>(null);

  const [urgent, setUrgent] = useState<UrgentTask[] | null>(null);
  const [urgentErr, setUrgentErr] = useState<string | null>(null);

  const [summarizing, setSummarizing] = useState(false);
  const { speak } = useAriaSpeech();

  const dateLabel = useMemo(hijriGregorian, []);

  /* ───────── Counters + Realtime ───────── */
  const refreshCounters = useCallback(async () => {
    const runs = await Promise.allSettled([
      supabase.from("intelligence_agents").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("evolution_proposals").select("*", { count: "exact", head: true }).in("status", ["proposed", "pending", "مقترح"]),
      supabase.from("aria_improvement_proposals").select("*", { count: "exact", head: true }).in("status", ["proposed", "pending", "مقترح"]),
      supabase.from("urgent_tasks").select("*", { count: "exact", head: true }).neq("status", "مغلق"),
      supabase.from("support_requests").select("*", { count: "exact", head: true }).neq("status", "مغلق"),
    ]);
    const [aRes, eRes, aiRes, uRes, sRes] = runs;
    const readCount = (r: PromiseSettledResult<{ count: number | null; error: unknown }>): number | null => {
      if (r.status !== "fulfilled") return null;
      // @ts-expect-error runtime shape
      if (r.value?.error) return null;
      // @ts-expect-error runtime shape
      return typeof r.value?.count === "number" ? r.value.count : null;
    };
    const agentCount = readCount(aRes);
    const eCount = readCount(eRes) ?? 0;
    const aiCount = readCount(aiRes) ?? 0;
    const urgentCount = readCount(uRes);
    const supportCount = readCount(sRes);

    setCounters({
      agents: agentCount,
      proposals: eRes.status === "fulfilled" || aiRes.status === "fulfilled" ? eCount + aiCount : null,
      urgent: urgentCount,
      support: supportCount,
    });
    setLiveState({
      agents: aRes.status === "fulfilled" ? (agentCount === null ? "error" : "live") : "error",
      proposals: eRes.status === "fulfilled" || aiRes.status === "fulfilled" ? "live" : "error",
      urgent: uRes.status === "fulfilled" ? (urgentCount === null ? "error" : "live") : "error",
      support: sRes.status === "fulfilled" ? (supportCount === null ? "error" : "live") : "error",
    });
  }, []);

  useEffect(() => {
    void refreshCounters();
    const ch = supabase
      .channel("cmd-center-pulse")
      .on("postgres_changes", { event: "*", schema: "public", table: "intelligence_agents" }, () => void refreshCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "evolution_proposals" }, () => void refreshCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "aria_improvement_proposals" }, () => void refreshCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "urgent_tasks" }, () => void refreshCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_requests" }, () => void refreshCounters())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [refreshCounters]);

  /* ───────── Zone 2 — agents ───────── */
  const loadAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from("intelligence_agents")
      .select("id, name_ar, focus_area, role, status")
      .order("name_ar", { ascending: true })
      .limit(24);
    if (error) { setAgentsErr(error.message); setAgents([]); return; }
    setAgentsErr(null);
    setAgents((data ?? []) as Agent[]);
  }, []);
  useEffect(() => {
    void loadAgents();
    const ch = supabase
      .channel("cmd-center-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "intelligence_agents" }, () => void loadAgents())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [loadAgents]);

  /* ───────── Zone 3 — unified proposals ───────── */
  const loadProposals = useCallback(async () => {
    const [ev, ai] = await Promise.allSettled([
      supabase
        .from("evolution_proposals")
        .select("id, title_ar, description_ar, priority, status, agent_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("aria_improvement_proposals")
        .select("id, area, proposal_ar, impact, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (ev.status === "rejected" && ai.status === "rejected") {
      setProposalsErr("no_source");
      setProposals([]);
      return;
    }
    const rows: Proposal[] = [];
    if (ev.status === "fulfilled" && !ev.value.error && ev.value.data) {
      for (const r of ev.value.data) {
        rows.push({
          id: r.id,
          title: r.title_ar ?? "مقترح تطوير",
          detail: r.description_ar ?? null,
          priority: r.priority ?? null,
          status: r.status ?? "proposed",
          agent_id: r.agent_id ?? null,
          origin: "evolution",
          created_at: r.created_at,
        });
      }
    }
    if (ai.status === "fulfilled" && !ai.value.error && ai.value.data) {
      for (const r of ai.value.data) {
        rows.push({
          id: r.id,
          title: r.area ? `تحسين — ${r.area}` : "مقترح تحسين",
          detail: r.proposal_ar ?? null,
          priority: r.impact ?? null,
          status: r.status ?? "proposed",
          agent_id: null,
          origin: "aria",
          created_at: r.created_at,
        });
      }
    }
    setProposalsErr(null);
    setProposals(rows);
  }, []);
  useEffect(() => {
    void loadProposals();
    const ch = supabase
      .channel("cmd-center-proposals")
      .on("postgres_changes", { event: "*", schema: "public", table: "evolution_proposals" }, () => void loadProposals())
      .on("postgres_changes", { event: "*", schema: "public", table: "aria_improvement_proposals" }, () => void loadProposals())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [loadProposals]);

  /* ───────── Zone 4 — urgent tasks ───────── */
  const loadUrgent = useCallback(async () => {
    const { data, error } = await supabase
      .from("urgent_tasks")
      .select("id, title_ar, department, priority, status, due_at, sla_hours, is_simulation")
      .neq("status", "مغلق")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6);
    if (error) { setUrgentErr(error.message); setUrgent([]); return; }
    setUrgentErr(null);
    setUrgent((data ?? []) as UrgentTask[]);
  }, []);
  useEffect(() => {
    void loadUrgent();
    const ch = supabase
      .channel("cmd-center-urgent")
      .on("postgres_changes", { event: "*", schema: "public", table: "urgent_tasks" }, () => void loadUrgent())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [loadUrgent]);

  /* ───────── Decisions (human approve / reject) ───────── */
  const decide = useCallback(async (p: Proposal, decision: "approved" | "rejected") => {
    const table = p.origin === "evolution" ? "evolution_proposals" : "aria_improvement_proposals";
    const now = new Date().toISOString();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id ?? null;
    const patch: Record<string, unknown> = {
      status: decision,
      decided_at: now,
    };
    if (userId) patch.decided_by = p.origin === "evolution" ? userId : (session.session?.user?.email ?? userId);
    const { error } = await supabase.from(table).update(patch).eq("id", p.id);
    if (error) {
      toast.error("تعذّر حفظ القرار", { description: error.message });
      return;
    }
    toast.success(decision === "approved" ? "تم الاعتماد" : "تم الرفض");
    void loadProposals();
    void refreshCounters();
  }, [loadProposals, refreshCounters]);

  /* ───────── ARIA summary ───────── */
  const speakSummary = useCallback(async () => {
    setSummarizing(true);
    try {
      const res = await authenticatedFetch("/api/urgent-summary", { method: "GET" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const j = await res.json() as {
        tasks: { total: number; open: number; overdue: number; breaching_soon: number };
        support_requests: { open: number };
        proposals: { pending: number };
      };
      const display = [
        `لديك ${j.tasks.open} مهمة عاجلة مفتوحة`,
        j.tasks.overdue > 0 ? `منها ${j.tasks.overdue} متجاوزة الموعد` : null,
        j.tasks.breaching_soon > 0 ? `و${j.tasks.breaching_soon} تقترب من خرق مؤشر الخدمة` : null,
        j.support_requests.open > 0 ? `و${j.support_requests.open} طلب مساندة قيد المعالجة` : null,
        j.proposals.pending > 0 ? `و${j.proposals.pending} مقترح بانتظار اعتمادك` : "ولا مقترحات معلّقة",
      ].filter(Boolean).join("، ") + ".";
      // tts = diacritized approximation; ElevenLabs multilingual handles the rest.
      const tts = display.replace(/([اأإآ])/g, "$1").normalize("NFC");
      await speak(tts, "chat-tts");
      toast.success("ملخص آريا", { description: display });
    } catch (e) {
      toast.error("تعذّر توليد الملخص", { description: (e as Error).message });
    } finally {
      setSummarizing(false);
    }
  }, [speak]);

  /* ───────── Derived views ───────── */
  const filteredProposals = useMemo(() => {
    if (!proposals) return null;
    return selectedAgent ? proposals.filter((p) => p.agent_id === selectedAgent) : proposals;
  }, [proposals, selectedAgent]);

  const pipeline = useMemo(() => {
    const buckets = { proposed: [] as Proposal[], approved: [] as Proposal[], rejected: [] as Proposal[], applied: [] as Proposal[] };
    for (const p of filteredProposals ?? []) {
      const b = bucketOf(p.status);
      if (b !== "other") buckets[b].push(p);
    }
    return buckets;
  }, [filteredProposals]);

  const hasSimulation = (urgent ?? []).some((t) => t.is_simulation);

  /* ═══════════════════════ Render ═══════════════════════ */
  return (
    <div dir="rtl" className="min-h-screen bg-[#04101E] text-white" style={{ fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-emerald-400/15 bg-[#061A2E]/80 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">مركز القيادة الذكي</h1>
            <p className="mt-1 text-xs text-white/50">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={speakSummary}
            disabled={summarizing}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-60"
          >
            {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>ملخص آريا</span>
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-12">
        {/* ═══ Zone 1 — Pulse counters ═══ */}
        <section className="lg:col-span-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PulseCounter label="الوكلاء النشطون" value={counters.agents} state={liveState.agents} />
            <PulseCounter label="مقترحات بانتظار الاعتماد" value={counters.proposals} state={liveState.proposals} />
            <PulseCounter label="الأعمال العاجلة المفتوحة" value={counters.urgent} state={liveState.urgent} />
            <PulseCounter label="طلبات مساندة قيد المعالجة" value={counters.support} state={liveState.support} />
          </div>
        </section>

        {/* ═══ Zone 3 — Approval pipeline (center) ═══ */}
        <section className="lg:col-span-8 lg:order-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-[#061A2E]/70 p-4 shadow-[0_0_40px_rgba(16,185,129,0.06)] sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold sm:text-lg">خط الاعتماد</h2>
                <p className="mt-1 text-[11px] text-emerald-300/80">الوكلاء يقترحون ويجهّزون — الاعتماد النهائي بشري</p>
              </div>
              {selectedAgent && (
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/75 hover:bg-white/10"
                >
                  <XCircle className="h-3 w-3" />
                  <span>إلغاء تصفية الوكيل</span>
                </button>
              )}
            </div>

            {proposals === null ? (
              <ZoneSkeleton />
            ) : proposalsErr === "no_source" ? (
              <ModuleInactive />
            ) : (proposals ?? []).length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <PipelineColumn title="مقترح" tone="cyan" items={pipeline.proposed} onDecide={decide} decisions />
                <PipelineColumn title="معتمد" tone="emerald" items={pipeline.approved} />
                <PipelineColumn title="مرفوض" tone="rose" items={pipeline.rejected} />
                <PipelineColumn title="مطبَّق" tone="violet" items={pipeline.applied} />
              </div>
            )}
          </div>
        </section>

        {/* ═══ Zone 2 — Agent council (right in RTL, appears first in DOM) ═══ */}
        <aside className="lg:col-span-4 lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-[#061A2E]/70 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold sm:text-lg">مجلس الوكلاء</h2>
              <Bot className="h-4 w-4 text-white/50" />
            </div>
            {agents === null ? (
              <ZoneSkeleton />
            ) : agentsErr ? (
              <ModuleInactive />
            ) : agents.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-1.5">
                {agents.map((a) => {
                  const active = selectedAgent === a.id;
                  const dot = a.status === "active" ? "bg-emerald-400" : a.status === "training" ? "bg-amber-400" : "bg-white/25";
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedAgent(active ? null : a.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-right transition ${
                          active
                            ? "border-emerald-400/60 bg-emerald-400/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{a.name_ar}</div>
                          <div className="mt-0.5 truncate text-[11px] text-white/50">{a.focus_area ?? a.role ?? "—"}</div>
                        </div>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dot} ${a.status === "active" ? "animate-pulse" : ""}`} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ═══ Zone 4 — Urgent tasks & SLA (left in RTL) ═══ */}
        <aside className="lg:col-span-12 lg:order-3">
          <div className="rounded-2xl border border-white/10 bg-[#061A2E]/70 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold sm:text-lg">الأعمال العاجلة وSLA</h2>
              <Timer className="h-4 w-4 text-white/50" />
            </div>
            {hasSimulation && (
              <div className="mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                بيئة محاكاة — بيانات افتراضية
              </div>
            )}
            {urgent === null ? (
              <ZoneSkeleton />
            ) : urgentErr ? (
              <ModuleInactive />
            ) : urgent.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {urgent.map((t) => {
                  const chip = slaChip(t.due_at);
                  const toneClass = chip.tone === "red" ? "border-rose-400/50 bg-rose-500/15 text-rose-200"
                    : chip.tone === "amber" ? "border-amber-400/50 bg-amber-500/15 text-amber-100"
                    : chip.tone === "emerald" ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                    : "border-white/15 bg-white/5 text-white/60";
                  return (
                    <article key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-snug text-white">{t.title_ar}</h3>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass} ${chip.pulse ? "animate-pulse" : ""}`}>
                          {chip.text}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                        <span>{t.department ?? "—"}</span>
                        <span className="text-white/25">•</span>
                        <span>{t.priority}</span>
                        <span className="text-white/25">•</span>
                        <span>{t.status}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ═══════════════════════ Components ═══════════════════════ */

function PulseCounter({ label, value, state }: { label: string; value: number | null; state: LiveState }) {
  const live = state === "live";
  const dot = state === "live" ? "bg-emerald-400 animate-pulse" : state === "loading" ? "bg-white/30" : "bg-rose-400";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#061A2E]/70 p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] text-white/60">{label}</div>
        <span className="flex items-center gap-1 text-[10px] text-white/40">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
          {live ? <Radio className="h-3 w-3" /> : state === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
        </span>
      </div>
      <div className="mt-1 font-mono text-3xl tabular-nums text-white sm:text-4xl">
        {state === "loading" ? "…" : value === null ? <span className="text-base text-white/40">لا بيانات بعد</span> : value.toLocaleString("ar-EG")}
      </div>
    </div>
  );
}

function PipelineColumn({
  title, tone, items, onDecide, decisions,
}: {
  title: string;
  tone: "cyan" | "emerald" | "rose" | "violet";
  items: Proposal[];
  onDecide?: (p: Proposal, d: "approved" | "rejected") => void;
  decisions?: boolean;
}) {
  const headTone = {
    cyan: "border-cyan-400/40 text-cyan-200",
    emerald: "border-emerald-400/40 text-emerald-200",
    rose: "border-rose-400/40 text-rose-200",
    violet: "border-violet-400/40 text-violet-200",
  }[tone];
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className={`mb-2 flex items-center justify-between rounded-md border px-2 py-1 text-[11px] font-semibold ${headTone}`}>
        <span>{title}</span>
        <span className="tabular-nums">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-white/35">لا عناصر</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((p) => (
            <li key={`${p.origin}-${p.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <div className="text-[12px] font-semibold leading-snug text-white">{p.title}</div>
              {p.detail && <p className="mt-1 line-clamp-2 text-[11px] text-white/55">{p.detail}</p>}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
                <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase tracking-wider">{p.origin === "evolution" ? "تطوير" : "آريا"}</span>
                {p.priority && <span>{p.priority}</span>}
              </div>
              {decisions && onDecide && (
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDecide(p, "approved")}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/20"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    اعتماد
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecide(p, "rejected")}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-rose-400/50 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/20"
                  >
                    <XCircle className="h-3 w-3" />
                    رفض
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ZoneSkeleton() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-white/40">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>جارٍ التحميل…</span>
    </div>
  );
}
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Clock className="h-6 w-6 text-white/25" />
      <p className="text-xs text-white/50">لا بيانات بعد — بانتظار التشغيل</p>
    </div>
  );
}
function ModuleInactive() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Activity className="h-6 w-6 text-white/25" />
      <p className="text-xs text-white/50">الوحدة غير مفعّلة بعد</p>
    </div>
  );
}
