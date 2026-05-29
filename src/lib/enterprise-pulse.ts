import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise Pulse — single source of truth for executive KPIs.
 * Deterministic synthetic series keyed off the current minute, so numbers
 * move organically but stay coherent across every page during a session.
 * Live counts (open tasks, conversations, knowledge docs) are read from
 * Supabase and merged in. Realtime subscriptions on `tasks` and `messages`
 * trigger a re-tick so "LIVE" pills are truthful.
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
  due: string; // ISO
  createdAt: string;
  status: MemoryStatus;
  progress: number; // 0-100
  impact: "low" | "medium" | "high" | "critical";
  daysSilent: number; // days since last update
  dependsOn?: string[]; // memory ids
  decisionRoute?: string;
  source_ar: string;
  source_en: string;
};

export type CrisisPrediction = {
  id: string;
  title_ar: string;
  title_en: string;
  category: "delay" | "silence" | "bottleneck" | "dependency" | "workflow" | "escalation" | "missed_commitment";
  riskScore: number; // 0-100
  probability: number; // 0-100
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
  completion: number; // 0-100
  status: MemoryStatus;
};

export type EnterprisePulse = {
  status: PulseStatus;
  health: number; // 0-100
  lastRefreshed: Date;
  kpis: PulseKpi[];
  alerts: PulseAlert[];
  intel: PulseIntel[];
  memory: MemoryEntry[];
  crises: CrisisPrediction[];
  execution: ExecutionStep[];
  counts: {
    openTasks: number;
    conversations: number;
    docs: number;
  };
};

// Deterministic helpers
function jitter(seed: number, base: number, amp: number) {
  const s = Math.sin(seed * 9301.0 + 49297.0) * 233280.0;
  return base + (s - Math.floor(s)) * amp - amp / 2;
}

function buildPulse(counts: EnterprisePulse["counts"]): EnterprisePulse {
  const minuteSeed = Math.floor(Date.now() / 60_000);
  const revenue = 1.42 + jitter(minuteSeed, 0, 0.04);
  const margin = 24.8 + jitter(minuteSeed + 1, 0, 1.2);
  const adoption = 62 + jitter(minuteSeed + 2, 0, 4);
  const uptime = 99.7 + jitter(minuteSeed + 3, 0, 0.18);
  const incidents = Math.max(0, Math.round(3 + jitter(minuteSeed + 4, 0, 2)));
  const health = Math.max(82, Math.min(98, 92 + jitter(minuteSeed + 5, 0, 4)));

  const status: PulseStatus =
    incidents >= 4 || uptime < 99.5 ? "critical" : incidents >= 2 ? "warning" : "healthy";

  return {
    status,
    health: Math.round(health * 10) / 10,
    lastRefreshed: new Date(),
    counts,
    kpis: [
      {
        id: "revenue",
        label_ar: "الإيراد YTD",
        label_en: "Revenue YTD",
        value: `SAR ${revenue.toFixed(2)}B`,
        delta: "+12.4%",
        trend: "up",
        tone: "emerald",
        why_ar: "نمو مدفوع بقطاعَي الطاقة والخدمات المصرفية الرقمية.",
        why_en: "Growth driven by Energy and Digital Banking verticals.",
      },
      {
        id: "margin",
        label_ar: "هامش EBITDA",
        label_en: "EBITDA margin",
        value: `${margin.toFixed(1)}%`,
        delta: margin > 24.8 ? "+1.2pp" : "-0.4pp",
        trend: margin > 24.8 ? "up" : "down",
        tone: "cyan",
        why_ar: "تحسّن نتيجة أتمتة العمليات وخفض تكلفة السحابة.",
        why_en: "Improved via process automation and cloud cost reduction.",
      },
      {
        id: "adoption",
        label_ar: "تبني الذكاء الاصطناعي الداخلي",
        label_en: "Internal AI adoption",
        value: `${adoption.toFixed(0)}%`,
        delta: "+14pp",
        trend: "up",
        tone: "violet",
        why_ar: "إطلاق ARIA ساهم في تسريع التبني عبر الإدارات.",
        why_en: "ARIA rollout accelerated adoption across departments.",
      },
      {
        id: "uptime",
        label_ar: "توفر الأنظمة",
        label_en: "Systems uptime",
        value: `${uptime.toFixed(2)}%`,
        delta: uptime > 99.7 ? "+0.06pp" : "-0.08pp",
        trend: uptime > 99.7 ? "up" : "down",
        tone: uptime < 99.5 ? "rose" : "emerald",
        why_ar: "زمن استجابة SharePoint مرتفع — مرشّح للمعالجة.",
        why_en: "SharePoint latency elevated — flagged for remediation.",
      },
      {
        id: "incidents",
        label_ar: "حوادث P1",
        label_en: "P1 incidents",
        value: String(incidents),
        delta: incidents > 3 ? "+1" : "-2",
        trend: incidents > 3 ? "up" : "down",
        tone: incidents > 3 ? "rose" : "emerald",
        why_ar: "تشغيل سير عمل الاستجابة التلقائية للحوادث.",
        why_en: "Auto-remediation workflows engaged.",
      },
      {
        id: "tasks",
        label_ar: "مهام تنفيذية مفتوحة",
        label_en: "Open executive tasks",
        value: String(counts.openTasks),
        delta: counts.openTasks > 10 ? "+3" : "-2",
        trend: counts.openTasks > 10 ? "up" : "down",
        tone: "amber",
        why_ar: "تتضمن قرارات تنتظر مراجعة مجلس الإدارة.",
        why_en: "Includes decisions awaiting board review.",
      },
    ],
    alerts: [
      {
        id: "sp-latency",
        severity: "critical",
        title_ar: "زمن استجابة SharePoint مرتفع 412ms",
        title_en: "SharePoint latency elevated 412ms",
        owner: "CIO",
        route: "/integrations",
      },
      {
        id: "funnel-drop",
        severity: "high",
        title_ar: "هبوط مفاجئ في معدل تحويل قمع البيع",
        title_en: "Sales funnel conversion dropped sharply",
        owner: "CEO",
        route: "/analytics",
      },
      {
        id: "fx-vol",
        severity: "medium",
        title_ar: "تذبذب سعر العملة قد يكلف SAR 1.8M",
        title_en: "FX volatility may cost SAR 1.8M",
        owner: "CFO",
        route: "/risk",
      },
    ],
    intel: [
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
    ],
    memory: buildMemory(minuteSeed),
    crises: buildCrises(minuteSeed),
    execution: buildExecution(),
  };
}

function buildMemory(seed: number): MemoryEntry[] {
  const now = Date.now();
  const day = 86_400_000;
  const items: MemoryEntry[] = [
    {
      id: "m-1", kind: "decision",
      title_ar: "اعتماد ميزانية التحول الرقمي 2027 (SAR 240M)",
      title_en: "Approve Digital Transformation 2027 budget (SAR 240M)",
      owner: "CFO", department: "Finance",
      due: new Date(now + 4 * day).toISOString(),
      createdAt: new Date(now - 9 * day).toISOString(),
      status: "in_progress", progress: 65, impact: "critical", daysSilent: 2,
      decisionRoute: "/decisions",
      source_ar: "مجلس إدارة 12 مارس", source_en: "Board meeting Mar 12",
    },
    {
      id: "m-2", kind: "commitment",
      title_ar: "تسليم تقرير حوكمة AI ربع سنوي",
      title_en: "Deliver quarterly AI governance report",
      owner: "Chief of Staff", department: "Executive Office",
      due: new Date(now - 2 * day).toISOString(),
      createdAt: new Date(now - 20 * day).toISOString(),
      status: "blocked", progress: 40, impact: "high", daysSilent: 7,
      decisionRoute: "/governance",
      source_ar: "اجتماع تنفيذي 5 مارس", source_en: "Exec sync Mar 5",
    },
    {
      id: "m-3", kind: "initiative",
      title_ar: "توسعة ARIA Copilot إلى 3 إدارات إضافية",
      title_en: "Roll out ARIA Copilot to 3 additional departments",
      owner: "CTO", department: "Technology",
      due: new Date(now + 18 * day).toISOString(),
      createdAt: new Date(now - 30 * day).toISOString(),
      status: "in_progress", progress: 55, impact: "high", daysSilent: 1,
      dependsOn: ["m-1"], decisionRoute: "/transformation",
      source_ar: "استراتيجية Q2", source_en: "Q2 strategy",
    },
    {
      id: "m-4", kind: "risk",
      title_ar: "زمن استجابة SharePoint يهدد تسليم MS Fabric",
      title_en: "SharePoint latency threatens MS Fabric delivery",
      owner: "CIO", department: "Technology",
      due: new Date(now + 6 * day).toISOString(),
      createdAt: new Date(now - 3 * day).toISOString(),
      status: "open", progress: 20, impact: "critical", daysSilent: 3,
      decisionRoute: "/risk",
      source_ar: "تنبيه AI Ops", source_en: "AI Ops alert",
    },
    {
      id: "m-5", kind: "recommendation",
      title_ar: "تحوّط لمخاطر تذبذب العملة بقيمة SAR 1.8M",
      title_en: "Hedge FX volatility exposure of SAR 1.8M",
      owner: "Treasury", department: "Finance",
      due: new Date(now + 10 * day).toISOString(),
      createdAt: new Date(now - 5 * day).toISOString(),
      status: "open", progress: 10, impact: "high", daysSilent: 4,
      decisionRoute: "/risk",
      source_ar: "تحليل ARIA", source_en: "ARIA analysis",
    },
    {
      id: "m-6", kind: "escalation",
      title_ar: "تأخر تسليم تكامل Salesforce — لا تحديث منذ 14 يوم",
      title_en: "Salesforce integration overdue — no update for 14 days",
      owner: "Head of Sales Ops", department: "Sales",
      due: new Date(now - 14 * day).toISOString(),
      createdAt: new Date(now - 45 * day).toISOString(),
      status: "forgotten", progress: 30, impact: "high", daysSilent: 14,
      decisionRoute: "/integrations",
      source_ar: "خارطة طريق Q1", source_en: "Q1 roadmap",
    },
    {
      id: "m-7", kind: "meeting",
      title_ar: "متابعة قرارات اجتماع مجلس المخاطر 18 مارس",
      title_en: "Follow up on Risk Council decisions Mar 18",
      owner: "Risk Officer", department: "Governance",
      due: new Date(now + 2 * day).toISOString(),
      createdAt: new Date(now - 6 * day).toISOString(),
      status: "open", progress: 25, impact: "medium", daysSilent: 5,
      decisionRoute: "/governance",
      source_ar: "محضر مجلس المخاطر", source_en: "Risk Council minutes",
    },
    {
      id: "m-8", kind: "dependency",
      title_ar: "ترقية Data Lake مطلوبة قبل إطلاق MS Fabric",
      title_en: "Data Lake upgrade required before MS Fabric launch",
      owner: "Head of Data", department: "Technology",
      due: new Date(now + 12 * day).toISOString(),
      createdAt: new Date(now - 15 * day).toISOString(),
      status: "in_progress", progress: 45, impact: "high", daysSilent: 2,
      dependsOn: ["m-4"], decisionRoute: "/digital-twin",
      source_ar: "خطة التكنولوجيا", source_en: "Tech plan",
    },
    {
      id: "m-9", kind: "commitment",
      title_ar: "إعداد سياسة استخدام AI الداخلية",
      title_en: "Draft internal AI usage policy",
      owner: "Legal", department: "Governance",
      due: new Date(now - 8 * day).toISOString(),
      createdAt: new Date(now - 25 * day).toISOString(),
      status: "forgotten", progress: 10, impact: "medium", daysSilent: 11,
      decisionRoute: "/governance",
      source_ar: "اجتماع الحوكمة فبراير", source_en: "Governance meeting Feb",
    },
    {
      id: "m-10", kind: "decision",
      title_ar: "اختيار مزوّد البنية السحابية الثانوية",
      title_en: "Select secondary cloud infrastructure provider",
      owner: "CIO", department: "Technology",
      due: new Date(now + 21 * day).toISOString(),
      createdAt: new Date(now - 10 * day).toISOString(),
      status: "open", progress: 15, impact: "high", daysSilent: 6,
      decisionRoute: "/decisions",
      source_ar: "لجنة البنية", source_en: "Architecture committee",
    },
  ];
  // small jitter on progress
  return items.map((it, i) => ({
    ...it,
    progress: Math.max(0, Math.min(100, Math.round(it.progress + jitter(seed + i, 0, 6)))),
  }));
}

function buildCrises(seed: number): CrisisPrediction[] {
  const items: CrisisPrediction[] = [
    {
      id: "c-1", category: "silence",
      title_ar: "إدارة المبيعات صامتة منذ 14 يوماً حول تكامل Salesforce",
      title_en: "Sales silent for 14 days on Salesforce integration",
      riskScore: 86, probability: 78,
      impact_ar: "تأخر إطلاق Q2 وفقدان SAR 4.2M من الإيراد المتوقع",
      impact_en: "Delays Q2 launch and risks SAR 4.2M expected revenue",
      owner: "Head of Sales Ops",
      action_ar: "استدعاء مالك التكامل واستلام تحديث رسمي خلال 48 ساعة",
      action_en: "Summon owner and require formal update within 48h",
      linkedMemoryId: "m-6", route: "/forgotten",
    },
    {
      id: "c-2", category: "delay",
      title_ar: "حوكمة AI تتأخر — تقرير ربعي متجاوز",
      title_en: "AI governance overdue — quarterly report past due",
      riskScore: 74, probability: 82,
      impact_ar: "تأثير على ثقة المجلس وخطر تدقيق تنظيمي",
      impact_en: "Erodes board confidence and risks regulatory audit",
      owner: "Chief of Staff",
      action_ar: "تكليف مسؤول مؤقت وإعداد ملخص خلال 5 أيام",
      action_en: "Assign interim lead and produce summary within 5 days",
      linkedMemoryId: "m-2", route: "/governance",
    },
    {
      id: "c-3", category: "dependency",
      title_ar: "ترقية Data Lake تهدد إطلاق MS Fabric",
      title_en: "Data Lake upgrade jeopardises MS Fabric launch",
      riskScore: 71, probability: 68,
      impact_ar: "انزياح ربعي للخطة الاستراتيجية لتبني التحليلات",
      impact_en: "One-quarter slip on strategic analytics adoption",
      owner: "Head of Data",
      action_ar: "تسريع موارد ترقية البنية وإعادة جدولة التبعيات",
      action_en: "Fast-track upgrade resources and replan dependencies",
      linkedMemoryId: "m-8", route: "/digital-twin",
    },
    {
      id: "c-4", category: "bottleneck",
      title_ar: "اختناق موارد الذكاء الاصطناعي في إدارة المالية",
      title_en: "AI talent bottleneck in Finance department",
      riskScore: 64, probability: 71,
      impact_ar: "إبطاء أتمتة المالية بحوالي 6 أسابيع",
      impact_en: "Slows Finance automation by ~6 weeks",
      owner: "CFO",
      action_ar: "إعادة تخصيص مهندسَين من فريق AI Ops لمدة 8 أسابيع",
      action_en: "Reallocate 2 engineers from AI Ops for 8 weeks",
      route: "/transformation",
    },
    {
      id: "c-5", category: "missed_commitment",
      title_ar: "سياسة استخدام AI الداخلية لم تُسلَّم",
      title_en: "Internal AI usage policy not delivered",
      riskScore: 58, probability: 80,
      impact_ar: "خطر استخدام غير مُحَوكَم لـ ARIA عبر الفرق",
      impact_en: "Ungoverned ARIA use across teams",
      owner: "Legal",
      action_ar: "تمديد المهلة 7 أيام مع مسؤول مشارك من الحوكمة",
      action_en: "Extend deadline 7 days with co-owner from Governance",
      linkedMemoryId: "m-9", route: "/governance",
    },
    {
      id: "c-6", category: "workflow",
      title_ar: "سير عمل الاستجابة للحوادث P1 فشل مرتين هذا الأسبوع",
      title_en: "P1 incident response workflow failed twice this week",
      riskScore: 69, probability: 60,
      impact_ar: "وقت توقف إضافي محتمل 22 دقيقة لكل حادث",
      impact_en: "Additional ~22 min downtime per incident",
      owner: "SRE Lead",
      action_ar: "مراجعة منطق التوجيه وتفعيل احتياطي يدوي",
      action_en: "Review routing logic and enable manual fallback",
      route: "/ai-ops",
    },
  ];
  return items.map((c, i) => ({
    ...c,
    riskScore: Math.max(0, Math.min(100, Math.round(c.riskScore + jitter(seed + i + 30, 0, 6)))),
    probability: Math.max(0, Math.min(100, Math.round(c.probability + jitter(seed + i + 60, 0, 5)))),
  }));
}

function buildExecution(): ExecutionStep[] {
  return [
    {
      id: "e-1",
      decision_ar: "اعتماد ميزانية التحول الرقمي 2027",
      decision_en: "Approve Digital Transformation 2027 budget",
      action_ar: "إصدار أوامر الشراء لأول 3 مبادرات",
      action_en: "Issue POs for the first 3 initiatives",
      owner: "CFO", department: "Finance",
      dependency_ar: "موافقة مجلس الإدارة النهائية",
      dependency_en: "Final board approval",
      risk: "high", completion: 65, status: "in_progress",
    },
    {
      id: "e-2",
      decision_ar: "إطلاق ARIA في 3 إدارات",
      decision_en: "Roll out ARIA to 3 departments",
      action_ar: "تكوين بيئات Copilot وتدريب الفرق",
      action_en: "Provision Copilot envs & train teams",
      owner: "CTO", department: "Technology",
      dependency_ar: "ميزانية التحول 2027",
      dependency_en: "Transformation 2027 budget",
      risk: "medium", completion: 55, status: "in_progress",
    },
    {
      id: "e-3",
      decision_ar: "إصلاح زمن استجابة SharePoint",
      decision_en: "Remediate SharePoint latency",
      action_ar: "تطبيق ترقية البنية وإعادة توجيه الحمل",
      action_en: "Apply infra upgrade & rebalance load",
      owner: "CIO", department: "Technology",
      dependency_ar: "موارد فريق SRE",
      dependency_en: "SRE team bandwidth",
      risk: "critical", completion: 20, status: "open",
    },
    {
      id: "e-4",
      decision_ar: "تحوّط مخاطر العملة SAR 1.8M",
      decision_en: "Hedge FX exposure SAR 1.8M",
      action_ar: "تنفيذ عقود آجلة عبر بنوك العلاقات",
      action_en: "Execute forward contracts via relationship banks",
      owner: "Treasury", department: "Finance",
      dependency_ar: "مصادقة لجنة الاستثمار",
      dependency_en: "Investment committee sign-off",
      risk: "medium", completion: 10, status: "open",
    },
    {
      id: "e-5",
      decision_ar: "اعتماد سياسة AI الداخلية",
      decision_en: "Adopt internal AI policy",
      action_ar: "نشر السياسة وتدريب جميع الموظفين",
      action_en: "Publish policy & train all staff",
      owner: "Legal", department: "Governance",
      dependency_ar: "مراجعة فريق الامتثال",
      dependency_en: "Compliance review",
      risk: "high", completion: 10, status: "blocked",
    },
    {
      id: "e-6",
      decision_ar: "ترقية Data Lake لـ MS Fabric",
      decision_en: "Upgrade Data Lake for MS Fabric",
      action_ar: "ترحيل المخططات وإعادة فهرسة البيانات",
      action_en: "Migrate schemas & reindex data",
      owner: "Head of Data", department: "Technology",
      dependency_ar: "نافذة توقف مجدولة",
      dependency_en: "Scheduled downtime window",
      risk: "high", completion: 45, status: "in_progress",
    },
  ];
}

/**
 * useEnterprisePulse — hook consumed by every executive page so KPIs/alerts
 * stay coherent. Re-ticks every 30s and on Supabase realtime events.
 */
export function useEnterprisePulse(): EnterprisePulse {
  const [counts, setCounts] = useState<EnterprisePulse["counts"]>({
    openTasks: 12,
    conversations: 0,
    docs: 0,
  });
  const [pulse, setPulse] = useState<EnterprisePulse>(() => buildPulse(counts));

  // Refresh counts from Supabase (best-effort; gracefully degrades).
  useEffect(() => {
    let cancelled = false;
    async function refreshCounts() {
      try {
        const [tasks, threads, docs] = await Promise.all([
          supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
          supabase.from("threads").select("id", { count: "exact", head: true }),
          supabase.from("knowledge_docs").select("id", { count: "exact", head: true }),
        ]);
        if (cancelled) return;
        setCounts({
          openTasks: tasks.count ?? 12,
          conversations: threads.count ?? 0,
          docs: docs.count ?? 0,
        });
      } catch {
        /* offline / unauthenticated — keep defaults */
      }
    }
    refreshCounts();

    const tick = setInterval(refreshCounts, 30_000);

    // Realtime — re-tick when tasks or messages change.
    const channel = supabase
      .channel("enterprise-pulse")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshCounts)
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  // Re-derive pulse whenever counts change or the minute rolls over.
  useEffect(() => {
    setPulse(buildPulse(counts));
    const tick = setInterval(() => setPulse(buildPulse(counts)), 30_000);
    return () => clearInterval(tick);
  }, [counts]);

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
