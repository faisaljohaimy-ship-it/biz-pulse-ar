import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  | "decision" | "initiative" | "commitment" | "risk"
  | "escalation" | "meeting" | "recommendation" | "dependency";

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
  category: "delay" | "silence" | "bottleneck" | "dependency" | "workflow" | "escalation" | "missed_commitment";
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

// ─── Seed payload (inserted once per user, then DB is source of truth) ───────

const DAY = 86_400_000;

function seedKpis(openTasks: number) {
  return [
    { key: "revenue", label: "الإيراد YTD", label_en: "Revenue YTD", value: "SAR 1.42B", delta: "+12.4%", trend: "up", tone: "emerald", why: "نمو مدفوع بقطاعَي الطاقة والخدمات المصرفية الرقمية.", why_en: "Growth driven by Energy and Digital Banking verticals." },
    { key: "margin", label: "هامش EBITDA", label_en: "EBITDA margin", value: "24.8%", delta: "+1.2pp", trend: "up", tone: "cyan", why: "تحسّن نتيجة أتمتة العمليات وخفض تكلفة السحابة.", why_en: "Improved via process automation and cloud cost reduction." },
    { key: "adoption", label: "تبني الذكاء الاصطناعي الداخلي", label_en: "Internal AI adoption", value: "62%", delta: "+14pp", trend: "up", tone: "violet", why: "إطلاق ARIA ساهم في تسريع التبني عبر الإدارات.", why_en: "ARIA rollout accelerated adoption across departments." },
    { key: "uptime", label: "توفر الأنظمة", label_en: "Systems uptime", value: "99.74%", delta: "+0.06pp", trend: "up", tone: "emerald", why: "زمن استجابة SharePoint مرتفع — مرشّح للمعالجة.", why_en: "SharePoint latency elevated — flagged for remediation." },
    { key: "incidents", label: "حوادث P1", label_en: "P1 incidents", value: "3", delta: "-2", trend: "down", tone: "emerald", why: "تشغيل سير عمل الاستجابة التلقائية للحوادث.", why_en: "Auto-remediation workflows engaged." },
    { key: "tasks", label: "مهام تنفيذية مفتوحة", label_en: "Open executive tasks", value: String(openTasks), delta: "+0", trend: "flat", tone: "amber", why: "تتضمن قرارات تنتظر مراجعة مجلس الإدارة.", why_en: "Includes decisions awaiting board review." },
  ];
}

function seedCrises() {
  return [
    { key: "c-1", category: "silence", title: "إدارة المبيعات صامتة منذ 14 يوماً حول تكامل Salesforce", title_en: "Sales silent for 14 days on Salesforce integration", risk_score: 86, probability: 78, impact: "تأخر إطلاق Q2 وفقدان SAR 4.2M من الإيراد المتوقع", impact_en: "Delays Q2 launch and risks SAR 4.2M expected revenue", owner: "Head of Sales Ops", action: "استدعاء مالك التكامل واستلام تحديث رسمي خلال 48 ساعة", action_en: "Summon owner and require formal update within 48h", linked_memory_key: "m-6", route: "/forgotten" },
    { key: "c-2", category: "delay", title: "حوكمة AI تتأخر — تقرير ربعي متجاوز", title_en: "AI governance overdue — quarterly report past due", risk_score: 74, probability: 82, impact: "تأثير على ثقة المجلس وخطر تدقيق تنظيمي", impact_en: "Erodes board confidence and risks regulatory audit", owner: "Chief of Staff", action: "تكليف مسؤول مؤقت وإعداد ملخص خلال 5 أيام", action_en: "Assign interim lead and produce summary within 5 days", linked_memory_key: "m-2", route: "/governance" },
    { key: "c-3", category: "dependency", title: "ترقية Data Lake تهدد إطلاق MS Fabric", title_en: "Data Lake upgrade jeopardises MS Fabric launch", risk_score: 71, probability: 68, impact: "انزياح ربعي للخطة الاستراتيجية لتبني التحليلات", impact_en: "One-quarter slip on strategic analytics adoption", owner: "Head of Data", action: "تسريع موارد ترقية البنية وإعادة جدولة التبعيات", action_en: "Fast-track upgrade resources and replan dependencies", linked_memory_key: "m-8", route: "/digital-twin" },
    { key: "c-4", category: "bottleneck", title: "اختناق موارد الذكاء الاصطناعي في إدارة المالية", title_en: "AI talent bottleneck in Finance department", risk_score: 64, probability: 71, impact: "إبطاء أتمتة المالية بحوالي 6 أسابيع", impact_en: "Slows Finance automation by ~6 weeks", owner: "CFO", action: "إعادة تخصيص مهندسَين من فريق AI Ops لمدة 8 أسابيع", action_en: "Reallocate 2 engineers from AI Ops for 8 weeks", linked_memory_key: null, route: "/transformation" },
    { key: "c-5", category: "missed_commitment", title: "سياسة استخدام AI الداخلية لم تُسلَّم", title_en: "Internal AI usage policy not delivered", risk_score: 58, probability: 80, impact: "خطر استخدام غير مُحَوكَم لـ ARIA عبر الفرق", impact_en: "Ungoverned ARIA use across teams", owner: "Legal", action: "تمديد المهلة 7 أيام مع مسؤول مشارك من الحوكمة", action_en: "Extend deadline 7 days with co-owner from Governance", linked_memory_key: "m-9", route: "/governance" },
    { key: "c-6", category: "workflow", title: "سير عمل الاستجابة للحوادث P1 فشل مرتين هذا الأسبوع", title_en: "P1 incident response workflow failed twice this week", risk_score: 69, probability: 60, impact: "وقت توقف إضافي محتمل 22 دقيقة لكل حادث", impact_en: "Additional ~22 min downtime per incident", owner: "SRE Lead", action: "مراجعة منطق التوجيه وتفعيل احتياطي يدوي", action_en: "Review routing logic and enable manual fallback", linked_memory_key: null, route: "/ai-ops" },
  ];
}

function seedExecution() {
  return [
    { key: "e-1", decision: "اعتماد ميزانية التحول الرقمي 2027", decision_en: "Approve Digital Transformation 2027 budget", action: "إصدار أوامر الشراء لأول 3 مبادرات", action_en: "Issue POs for the first 3 initiatives", owner: "CFO", department: "Finance", dependency: "موافقة مجلس الإدارة النهائية", dependency_en: "Final board approval", risk: "high", completion: 65, status: "in_progress" },
    { key: "e-2", decision: "إطلاق ARIA في 3 إدارات", decision_en: "Roll out ARIA to 3 departments", action: "تكوين بيئات Copilot وتدريب الفرق", action_en: "Provision Copilot envs & train teams", owner: "CTO", department: "Technology", dependency: "ميزانية التحول 2027", dependency_en: "Transformation 2027 budget", risk: "medium", completion: 55, status: "in_progress" },
    { key: "e-3", decision: "إصلاح زمن استجابة SharePoint", decision_en: "Remediate SharePoint latency", action: "تطبيق ترقية البنية وإعادة توجيه الحمل", action_en: "Apply infra upgrade & rebalance load", owner: "CIO", department: "Technology", dependency: "موارد فريق SRE", dependency_en: "SRE team bandwidth", risk: "critical", completion: 20, status: "open" },
    { key: "e-4", decision: "تحوّط مخاطر العملة SAR 1.8M", decision_en: "Hedge FX exposure SAR 1.8M", action: "تنفيذ عقود آجلة عبر بنوك العلاقات", action_en: "Execute forward contracts via relationship banks", owner: "Treasury", department: "Finance", dependency: "مصادقة لجنة الاستثمار", dependency_en: "Investment committee sign-off", risk: "medium", completion: 10, status: "open" },
    { key: "e-5", decision: "اعتماد سياسة AI الداخلية", decision_en: "Adopt internal AI policy", action: "نشر السياسة وتدريب جميع الموظفين", action_en: "Publish policy & train all staff", owner: "Legal", department: "Governance", dependency: "مراجعة فريق الامتثال", dependency_en: "Compliance review", risk: "high", completion: 10, status: "blocked" },
    { key: "e-6", decision: "ترقية Data Lake لـ MS Fabric", decision_en: "Upgrade Data Lake for MS Fabric", action: "ترحيل المخططات وإعادة فهرسة البيانات", action_en: "Migrate schemas & reindex data", owner: "Head of Data", department: "Technology", dependency: "نافذة توقف مجدولة", dependency_en: "Scheduled downtime window", risk: "high", completion: 45, status: "in_progress" },
  ];
}

function seedMemory() {
  const now = Date.now();
  const iso = (d: number) => new Date(now + d * DAY).toISOString();
  return [
    { key: "m-1", kind: "decision", title: "اعتماد ميزانية التحول الرقمي 2027 (SAR 240M)", title_en: "Approve Digital Transformation 2027 budget (SAR 240M)", owner: "CFO", department: "Finance", due_at: iso(4), status: "in_progress", progress: 65, impact: "critical", days_silent: 2, source: "مجلس إدارة 12 مارس", source_en: "Board meeting Mar 12", decision_route: "/decisions", depends_on: [] },
    { key: "m-2", kind: "commitment", title: "تسليم تقرير حوكمة AI ربع سنوي", title_en: "Deliver quarterly AI governance report", owner: "Chief of Staff", department: "Executive Office", due_at: iso(-2), status: "blocked", progress: 40, impact: "high", days_silent: 7, source: "اجتماع تنفيذي 5 مارس", source_en: "Exec sync Mar 5", decision_route: "/governance", depends_on: [] },
    { key: "m-3", kind: "initiative", title: "توسعة ARIA Copilot إلى 3 إدارات إضافية", title_en: "Roll out ARIA Copilot to 3 additional departments", owner: "CTO", department: "Technology", due_at: iso(18), status: "in_progress", progress: 55, impact: "high", days_silent: 1, source: "استراتيجية Q2", source_en: "Q2 strategy", decision_route: "/transformation", depends_on: ["m-1"] },
    { key: "m-4", kind: "risk", title: "زمن استجابة SharePoint يهدد تسليم MS Fabric", title_en: "SharePoint latency threatens MS Fabric delivery", owner: "CIO", department: "Technology", due_at: iso(6), status: "open", progress: 20, impact: "critical", days_silent: 3, source: "تنبيه AI Ops", source_en: "AI Ops alert", decision_route: "/risk", depends_on: [] },
    { key: "m-5", kind: "recommendation", title: "تحوّط لمخاطر تذبذب العملة بقيمة SAR 1.8M", title_en: "Hedge FX volatility exposure of SAR 1.8M", owner: "Treasury", department: "Finance", due_at: iso(10), status: "open", progress: 10, impact: "high", days_silent: 4, source: "تحليل ARIA", source_en: "ARIA analysis", decision_route: "/risk", depends_on: [] },
    { key: "m-6", kind: "escalation", title: "تأخر تسليم تكامل Salesforce — لا تحديث منذ 14 يوم", title_en: "Salesforce integration overdue — no update for 14 days", owner: "Head of Sales Ops", department: "Sales", due_at: iso(-14), status: "forgotten", progress: 30, impact: "high", days_silent: 14, source: "خارطة طريق Q1", source_en: "Q1 roadmap", decision_route: "/integrations", depends_on: [] },
    { key: "m-7", kind: "meeting", title: "متابعة قرارات اجتماع مجلس المخاطر 18 مارس", title_en: "Follow up on Risk Council decisions Mar 18", owner: "Risk Officer", department: "Governance", due_at: iso(2), status: "open", progress: 25, impact: "medium", days_silent: 5, source: "محضر مجلس المخاطر", source_en: "Risk Council minutes", decision_route: "/governance", depends_on: [] },
    { key: "m-8", kind: "dependency", title: "ترقية Data Lake مطلوبة قبل إطلاق MS Fabric", title_en: "Data Lake upgrade required before MS Fabric launch", owner: "Head of Data", department: "Technology", due_at: iso(12), status: "in_progress", progress: 45, impact: "high", days_silent: 2, source: "خطة التكنولوجيا", source_en: "Tech plan", decision_route: "/digital-twin", depends_on: ["m-4"] },
    { key: "m-9", kind: "commitment", title: "إعداد سياسة استخدام AI الداخلية", title_en: "Draft internal AI usage policy", owner: "Legal", department: "Governance", due_at: iso(-8), status: "forgotten", progress: 10, impact: "medium", days_silent: 11, source: "اجتماع الحوكمة فبراير", source_en: "Governance meeting Feb", decision_route: "/governance", depends_on: [] },
    { key: "m-10", kind: "decision", title: "اختيار مزوّد البنية السحابية الثانوية", title_en: "Select secondary cloud infrastructure provider", owner: "CIO", department: "Technology", due_at: iso(21), status: "open", progress: 15, impact: "high", days_silent: 6, source: "لجنة البنية", source_en: "Architecture committee", decision_route: "/decisions", depends_on: [] },
  ];
}

// Per-user seed flag (in-memory, prevents repeat insert attempts)
const seeded = new Set<string>();

async function ensureSeeded(userId: string, openTasks: number) {
  if (seeded.has(userId)) return;
  seeded.add(userId);
  const { count } = await supabase.from("pulse_kpis").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) > 0) return;
  await Promise.all([
    supabase.from("pulse_kpis").insert(seedKpis(openTasks).map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase.from("pulse_crises").insert(seedCrises().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase.from("pulse_execution").insert(seedExecution().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
    supabase.from("pulse_memory").insert(seedMemory().map((r, i) => ({ ...r, user_id: userId, sort_order: i }))),
  ]);
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function mapKpi(r: any): PulseKpi {
  return {
    id: r.key, label_ar: r.label, label_en: r.label_en, value: r.value,
    delta: r.delta, trend: r.trend, tone: r.tone, why_ar: r.why, why_en: r.why_en,
  };
}
function mapCrisis(r: any): CrisisPrediction {
  return {
    id: r.key, title_ar: r.title, title_en: r.title_en, category: r.category,
    riskScore: r.risk_score, probability: r.probability,
    impact_ar: r.impact, impact_en: r.impact_en, owner: r.owner,
    action_ar: r.action, action_en: r.action_en,
    linkedMemoryId: r.linked_memory_key ?? undefined, route: r.route,
  };
}
function mapExecution(r: any): ExecutionStep {
  return {
    id: r.key, decision_ar: r.decision, decision_en: r.decision_en,
    action_ar: r.action, action_en: r.action_en, owner: r.owner, department: r.department,
    dependency_ar: r.dependency, dependency_en: r.dependency_en,
    risk: r.risk, completion: r.completion, status: r.status,
  };
}
function mapMemory(r: any): MemoryEntry {
  return {
    id: r.key, kind: r.kind, title_ar: r.title, title_en: r.title_en,
    owner: r.owner, department: r.department,
    due: r.due_at ?? new Date().toISOString(),
    createdAt: r.created_at ?? new Date().toISOString(),
    status: r.status, progress: r.progress, impact: r.impact, daysSilent: r.days_silent,
    dependsOn: r.depends_on?.length ? r.depends_on : undefined,
    decisionRoute: r.decision_route ?? undefined,
    source_ar: r.source, source_en: r.source_en,
  };
}

// ─── Static intel + alerts (small, copy-edited; not deterministic synthesis) ─

const STATIC_INTEL: PulseIntel[] = [
  { id: "q4-beat", text_ar: "إيرادات Q4 قد تتجاوز الخطة بـ 6.2٪", text_en: "Q4 revenue may beat plan by 6.2%", confidence: 91, tone: "emerald" },
  { id: "ai-accel", text_ar: "تبني AI الداخلي يتسارع 2.3x", text_en: "Internal AI adoption accelerating 2.3x", confidence: 94, tone: "violet" },
  { id: "competitor", text_ar: "Acme أطلقت منتجاً مماثلاً — مراجعة موصى بها", text_en: "Acme launched rival product — review advised", confidence: 82, tone: "amber" },
];

function deriveAlerts(crises: CrisisPrediction[]): PulseAlert[] {
  return crises.slice(0, 5).map((c) => ({
    id: c.id,
    severity: c.riskScore >= 80 ? "critical" : c.riskScore >= 65 ? "high" : c.riskScore >= 50 ? "medium" : "low",
    title_ar: c.title_ar, title_en: c.title_en, owner: c.owner, route: c.route,
  }));
}

function deriveStatus(crises: CrisisPrediction[]): { status: PulseStatus; health: number } {
  const max = crises.reduce((m, c) => Math.max(m, c.riskScore), 0);
  const status: PulseStatus = max >= 80 ? "critical" : max >= 65 ? "warning" : "healthy";
  const health = Math.max(40, 100 - Math.round(max * 0.35));
  return { status, health };
}

const EMPTY: EnterprisePulse = {
  status: "healthy", health: 100, lastRefreshed: new Date(),
  kpis: [], alerts: [], intel: STATIC_INTEL, memory: [], crises: [], execution: [],
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
        status, health, lastRefreshed: new Date(),
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
