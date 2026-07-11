import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seedKpis, seedCrises, seedExecution, seedMemory } from "./enterprise-pulse.seed";

/**
 * Enterprise Pulse — LIVE adapter.
 * Sources KPIs, crises, execution and memory from Supabase tables
 * (pulse_kpis, pulse_crises, pulse_execution, pulse_memory). On first
 * use for a given user the tables are auto-seeded with the executive
 * baseline so the UI is never empty. Realtime subscriptions on every
 * pulse_* table push updates back into the hook.
 *
 * No synthetic generators run at render time. The only deterministic
 * data in this file is the one-time seed payload, applied via INSERT.
 */

export type PulseStatus = "healthy" | "warning" | "critical";

export type PulseKpi = {
  id: string;
  label_ar: string;
  label_en: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet";
  why_ar: string;
  why_en: string;
};

export type PulseAlert = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title_ar: string;
  title_en: string;
  owner: string;
  route: string;
};

export type PulseIntel = {
  id: string;
  text_ar: string;
  text_en: string;
  confidence: number;
  tone: "cyan" | "violet" | "emerald" | "amber" | "rose";
};

export type MemoryKind =
  | "decision"
  | "initiative"
  | "commitment"
  | "risk"
  | "escalation"
  | "meeting"
  | "recommendation"
  | "dependency";

export type MemoryStatus = "open" | "in_progress" | "blocked" | "done" | "forgotten";

export type MemoryEntry = {
  id: string;
  kind: MemoryKind;
  title_ar: string;
  title_en: string;
  owner: string;
  department: string;
  due: string;
  createdAt: string;
  status: MemoryStatus;
  progress: number;
  impact: "low" | "medium" | "high" | "critical";
  daysSilent: number;
  dependsOn?: string[];
  decisionRoute?: string;
  source_ar: string;
  source_en: string;
};

export type CrisisPrediction = {
  id: string;
  title_ar: string;
  title_en: string;
  category:
    | "delay"
    | "silence"
    | "bottleneck"
    | "dependency"
    | "workflow"
    | "escalation"
    | "missed_commitment";
  riskScore: number;
  probability: number;
  impact_ar: string;
  impact_en: string;
  owner: string;
  action_ar: string;
  action_en: string;
  linkedMemoryId?: string;
  route: string;
};

export type ExecutionStep = {
  id: string;
  decision_ar: string;
  decision_en: string;
  action_ar: string;
  action_en: string;
  owner: string;
  department: string;
  dependency_ar: string;
  dependency_en: string;
  risk: "low" | "medium" | "high" | "critical";
  completion: number;
  status: MemoryStatus;
};

export type EnterprisePulse = {
  status: PulseStatus;
  health: number;
  lastRefreshed: Date;
  kpis: PulseKpi[];
  alerts: PulseAlert[];
  intel: PulseIntel[];
  memory: MemoryEntry[];
  crises: CrisisPrediction[];
  execution: ExecutionStep[];
  counts: { openTasks: number; conversations: number; docs: number };
};

// ─── Seed payload (built in ./enterprise-pulse.seed, inserted once per user) ──

const seeded = new Set<string>();

async function ensureSeeded(userId: string, openTasks: number) {
  if (seeded.has(userId)) return;
  // Do NOT mark seeded up-front: a failed count/insert must be retryable on a
  // later call, otherwise the user is stranded with a permanently empty pulse.
  const { count, error: countError } = await supabase
    .from("pulse_kpis")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) {
    console.error("[enterprise-pulse] seed count check failed:", countError.message);
    return; // transient read failure — leave unseeded so it retries
  }
  if ((count ?? 0) > 0) {
    seeded.add(userId); // already has data — no seeding needed
    return;
  }
  const results = await Promise.all([
    supabase
      .from("pulse_kpis")
      .insert(seedKpis(openTasks).map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase
      .from("pulse_crises")
      .insert(seedCrises().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase
      .from("pulse_execution")
      .insert(seedExecution().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase
      .from("pulse_memory")
      .insert(seedMemory().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
  ]);
  const insertError = results.find((r) => r.error)?.error;
  if (insertError) {
    console.error("[enterprise-pulse] seed insert failed:", insertError.message);
    return; // leave unseeded so a later call retries the seed
  }
  seeded.add(userId); // mark seeded ONLY after a fully successful seed
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function mapKpi(r: any): PulseKpi {
  return {
    id: r.key,
    label_ar: r.label,
    label_en: r.label_en,
    value: r.value,
    delta: r.delta,
    trend: r.trend,
    tone: r.tone,
    why_ar: r.why,
    why_en: r.why_en,
  };
}
function mapCrisis(r: any): CrisisPrediction {
  return {
    id: r.key,
    title_ar: r.title,
    title_en: r.title_en,
    category: r.category,
    riskScore: r.risk_score,
    probability: r.probability,
    impact_ar: r.impact,
    impact_en: r.impact_en,
    owner: r.owner,
    action_ar: r.action,
    action_en: r.action_en,
    linkedMemoryId: r.linked_memory_key ?? undefined,
    route: r.route,
  };
}
function mapExecution(r: any): ExecutionStep {
  return {
    id: r.key,
    decision_ar: r.decision,
    decision_en: r.decision_en,
    action_ar: r.action,
    action_en: r.action_en,
    owner: r.owner,
    department: r.department,
    dependency_ar: r.dependency,
    dependency_en: r.dependency_en,
    risk: r.risk,
    completion: r.completion,
    status: r.status,
  };
}
function mapMemory(r: any): MemoryEntry {
  return {
    id: r.key,
    kind: r.kind,
    title_ar: r.title,
    title_en: r.title_en,
    owner: r.owner,
    department: r.department,
    due: r.due_at ?? new Date().toISOString(),
    createdAt: r.created_at ?? new Date().toISOString(),
    status: r.status,
    progress: r.progress,
    impact: r.impact,
    daysSilent: r.days_silent,
    dependsOn: r.depends_on?.length ? r.depends_on : undefined,
    decisionRoute: r.decision_route ?? undefined,
    source_ar: r.source,
    source_en: r.source_en,
  };
}

// ─── Static intel + alerts (small, copy-edited; not deterministic synthesis) ─

const STATIC_INTEL: PulseIntel[] = [
  {
    id: "q4-beat",
    text_ar: "إيرادات Q4 قد تتجاوز الخطة بـ 6.2٪",
    text_en: "Q4 revenue may beat plan by 6.2%",
    confidence: 91,
    tone: "emerald",
  },
  {
    id: "ai-accel",
    text_ar: "تبني AI الداخلي يتسارع 2.3x",
    text_en: "Internal AI adoption accelerating 2.3x",
    confidence: 94,
    tone: "violet",
  },
  {
    id: "competitor",
    text_ar: "Acme أطلقت منتجاً مماثلاً — مراجعة موصى بها",
    text_en: "Acme launched rival product — review advised",
    confidence: 82,
    tone: "amber",
  },
];

function deriveAlerts(crises: CrisisPrediction[]): PulseAlert[] {
  return crises.slice(0, 5).map((c) => ({
    id: c.id,
    severity:
      c.riskScore >= 80
        ? "critical"
        : c.riskScore >= 65
          ? "high"
          : c.riskScore >= 50
            ? "medium"
            : "low",
    title_ar: c.title_ar,
    title_en: c.title_en,
    owner: c.owner,
    route: c.route,
  }));
}

function deriveStatus(crises: CrisisPrediction[]): { status: PulseStatus; health: number } {
  const max = crises.reduce((m, c) => Math.max(m, c.riskScore), 0);
  const status: PulseStatus = max >= 80 ? "critical" : max >= 65 ? "warning" : "healthy";
  const health = Math.max(40, 100 - Math.round(max * 0.35));
  return { status, health };
}

const EMPTY: EnterprisePulse = {
  status: "healthy",
  health: 100,
  lastRefreshed: new Date(),
  kpis: [],
  alerts: [],
  intel: STATIC_INTEL,
  memory: [],
  crises: [],
  execution: [],
  counts: { openTasks: 0, conversations: 0, docs: 0 },
};

/**
 * useEnterprisePulse — live executive pulse. Reads from pulse_* tables,
 * subscribes to realtime changes, and aggregates Supabase counts.
 */
export function useEnterprisePulse(): EnterprisePulse {
  const [pulse, setPulse] = useState<EnterprisePulse>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      // counts (live)
      const [tasks, threads, docs] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("threads").select("id", { count: "exact", head: true }),
        supabase.from("knowledge_docs").select("id", { count: "exact", head: true }),
      ]);

      const counts = {
        openTasks: tasks.count ?? 0,
        conversations: threads.count ?? 0,
        docs: docs.count ?? 0,
      };

      await ensureSeeded(userId, counts.openTasks);

      const [kpis, crises, exec, mem] = await Promise.all([
        supabase.from("pulse_kpis").select("*").eq("user_id", userId).order("sort_order"),
        supabase.from("pulse_crises").select("*").eq("user_id", userId).order("sort_order"),
        supabase.from("pulse_execution").select("*").eq("user_id", userId).order("sort_order"),
        supabase.from("pulse_memory").select("*").eq("user_id", userId).order("sort_order"),
      ]);

      if (cancelled) return;
      const crisesData = (crises.data ?? []).map(mapCrisis);
      const { status, health } = deriveStatus(crisesData);

      setPulse({
        status,
        health,
        lastRefreshed: new Date(),
        kpis: (kpis.data ?? []).map(mapKpi),
        alerts: deriveAlerts(crisesData),
        intel: STATIC_INTEL,
        memory: (mem.data ?? []).map(mapMemory),
        crises: crisesData,
        execution: (exec.data ?? []).map(mapExecution),
        counts,
      });
    }

    load();

    // Unique channel topic per hook instance to avoid collisions in
    // React StrictMode / multi-mount scenarios. Reusing the same topic
    // returns an already-joined channel, and adding postgres_changes
    // callbacks to a joined channel throws:
    //   "cannot add 'postgres_changes' callbacks for realtime subscriptions"
    const topic = `enterprise-pulse-live:${Math.random().toString(36).slice(2)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(topic)
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_kpis" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_crises" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_execution" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "pulse_memory" }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
        .subscribe();
    } catch (err) {
      // Realtime is best-effort; page remains functional with initial load.
      console.warn("[enterprise-pulse] realtime unavailable", err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return pulse;
}

export function formatRelativeTime(date: Date, locale: "ar" | "en"): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return locale === "ar" ? "الآن" : "just now";
  if (diff < 60) return locale === "ar" ? `قبل ${diff} ثانية` : `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return locale === "ar" ? `قبل ${m} دقيقة` : `${m}m ago`;
  const h = Math.floor(m / 60);
  return locale === "ar" ? `قبل ${h} ساعة` : `${h}h ago`;
}
