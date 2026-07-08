/**
 * ARIA Executive Briefing.
 *
 * Server-side aggregator that runs a full proactive scan and produces
 * a structured briefing suitable for greeting the executive on open
 * and for surfacing continuously in the background — without any UI
 * change. Composes:
 *   - runInsightScan()  → live proactive observations
 *   - pending approvals (permits, work orders due today, meetings today)
 *   - system health snapshot (open incidents, alerts 24h, patrols today)
 *
 * Output is a compact JSON bundle (bilingual) + a natural-language
 * greeting in AR and EN.
 */
import { runInsightScan, type Insight } from "./insight-engine.server";

export interface BriefingHealth {
  openIncidents: number;
  alerts24h: number;
  overdueWorkOrders: number;
  patrolsPlannedToday: number;
  patrolsDoneToday: number;
  reportsLast24h: number;
}

export interface BriefingApproval {
  kind: "permit" | "work_order" | "meeting";
  id: string;
  label: string;
  due_at?: string;
}

export interface ExecutivePriority {
  title_en: string;
  title_ar: string;
  severity: "critical" | "elevated" | "watch" | "info";
  evidence: string;
  recommendation_en: string;
  recommendation_ar: string;
  priority: 1 | 2 | 3;
  confidence: number;
  expected_impact_en: string;
  expected_impact_ar: string;
  next_actions: string[];
}

export interface ExecutiveBriefing {
  generatedAt: string;
  health: BriefingHealth;
  approvals: BriefingApproval[];
  priorities: ExecutivePriority[];
  greeting_en: string;
  greeting_ar: string;
  sources: string[];
  insightCount: number;
}

function impactFor(i: Insight): { en: string; ar: string } {
  switch (i.kind) {
    case "kpi_drop":
      return {
        en: "Restoring the KPI reverses executive-dashboard degradation.",
        ar: "استعادة المؤشر توقف تراجع لوحة المتابعة التنفيذية.",
      };
    case "overdue_work":
      return {
        en: "Clearing the backlog reduces asset downtime risk.",
        ar: "تصفية المتراكم يقلل مخاطر توقف الأصول.",
      };
    case "risk_hotspot":
      return {
        en: "Mitigating these risks prevents high-impact escalations.",
        ar: "معالجة هذه المخاطر تمنع تصعيدات عالية الأثر.",
      };
    case "alert_surge":
      return {
        en: "Reduces operator alarm fatigue and mean-time-to-respond.",
        ar: "يقلل إجهاد الإنذارات ويحسّن زمن الاستجابة.",
      };
    case "patrol_shortfall":
      return {
        en: "Closes coverage gaps and prevents incident propagation.",
        ar: "يسدّ فجوات التغطية ويمنع انتشار الحوادث.",
      };
    case "workload_pressure":
      return {
        en: "Prevents staff burnout and missed critical events.",
        ar: "يمنع إجهاد الفرق وضياع الأحداث الحرجة.",
      };
    case "trend_prediction":
      return {
        en: "Early containment avoids next-week volume spike.",
        ar: "الاحتواء المبكر يتجنب قفزة الأسبوع القادم.",
      };
    case "correlation":
      return {
        en: "Focused intervention on the driver site yields compound gains.",
        ar: "التدخل المركّز على الموقع المسبب يحقق مكاسب مركّبة.",
      };
    default:
      return { en: "Improves overall operational posture.", ar: "يحسّن الوضع التشغيلي العام." };
  }
}

function priorityFor(sev: Insight["severity"]): 1 | 2 | 3 {
  return sev === "critical" ? 1 : sev === "elevated" ? 2 : 3;
}

async function loadHealth(
  admin: NonNullable<Awaited<ReturnType<typeof importAdmin>>>,
  orgId: string,
): Promise<{
  health: BriefingHealth;
  approvals: BriefingApproval[];
}> {
  const now = Date.now();
  const iso24h = new Date(now - 86400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

  const health: BriefingHealth = {
    openIncidents: 0,
    alerts24h: 0,
    overdueWorkOrders: 0,
    patrolsPlannedToday: 0,
    patrolsDoneToday: 0,
    reportsLast24h: 0,
  };
  const approvals: BriefingApproval[] = [];

  await Promise.all([
    (async () => {
      const { count } = await admin
        .from("sec_incidents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .not("status", "in", "(closed,resolved,cancelled)");
      health.openIncidents = count ?? 0;
    })(),
    (async () => {
      const { count } = await admin
        .from("sim_notifications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", iso24h);
      health.alerts24h = count ?? 0;
    })(),
    (async () => {
      const { data, count } = await admin
        .from("sec_work_orders")
        .select("id,title_en,title_ar,due_at", { count: "exact" })
        .eq("org_id", orgId)
        .lt("due_at", new Date().toISOString())
        .not("status", "in", "(closed,completed,cancelled)")
        .limit(5);
      health.overdueWorkOrders = count ?? 0;
      for (const r of data ?? []) {
        approvals.push({
          kind: "work_order",
          id: String(r.id),
          label: String(r.title_en ?? r.title_ar ?? r.id),
          due_at: String(r.due_at ?? ""),
        });
      }
    })(),
    (async () => {
      const { data } = await admin
        .from("sim_daily_ops")
        .select("patrols_planned,patrols_done")
        .eq("org_id", orgId)
        .eq("day", today)
        .limit(500);
      for (const r of data ?? []) {
        health.patrolsPlannedToday += Number(r.patrols_planned ?? 0);
        health.patrolsDoneToday += Number(r.patrols_done ?? 0);
      }
    })(),
    (async () => {
      const { count } = await admin
        .from("sec_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", iso24h);
      health.reportsLast24h = count ?? 0;
    })(),
    (async () => {
      const { data } = await admin
        .from("sec_permits")
        .select("id,ref,work_type,status,ends_at")
        .eq("org_id", orgId)
        .eq("status", "pending")
        .limit(5);
      for (const r of data ?? []) {
        approvals.push({
          kind: "permit",
          id: String(r.id),
          label: `${r.ref ?? r.id} — ${r.work_type ?? "permit"}`,
          due_at: String(r.ends_at ?? ""),
        });
      }
    })().catch(() => {}),
    (async () => {
      const { data } = await admin
        .from("sim_meetings")
        .select("id,title,scheduled_at,status")
        .eq("org_id", orgId)
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", todayEnd)
        .eq("status", "scheduled")
        .limit(5);
      for (const r of data ?? []) {
        approvals.push({
          kind: "meeting",
          id: String(r.id),
          label: String(r.title ?? r.id),
          due_at: String(r.scheduled_at ?? ""),
        });
      }
    })().catch(() => {}),
  ]);

  return { health, approvals };
}

async function importAdmin() {
  try {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  } catch {
    return null;
  }
}

export async function buildExecutiveBriefing(orgId?: string | null): Promise<ExecutiveBriefing> {
  const generatedAt = new Date().toISOString();
  const admin = await importAdmin();
  // Tenant isolation: this aggregator uses the service-role client (bypasses
  // RLS), so callers MUST supply the current user's org_id. Without one we
  // return a safe empty briefing instead of leaking cross-tenant data.
  if (!admin || !orgId) {
    return {
      generatedAt,
      health: {
        openIncidents: 0,
        alerts24h: 0,
        overdueWorkOrders: 0,
        patrolsPlannedToday: 0,
        patrolsDoneToday: 0,
        reportsLast24h: 0,
      },
      approvals: [],
      priorities: [],
      greeting_en: "Welcome. Executive systems are online.",
      greeting_ar: "أهلاً بك. الأنظمة التنفيذية جاهزة.",
      sources: [],
      insightCount: 0,
    };
  }

  const [{ health, approvals }, insightBundle] = await Promise.all([
    loadHealth(admin, orgId),
    runInsightScan(orgId),
  ]);

  const priorities: ExecutivePriority[] = insightBundle.insights.slice(0, 5).map((i) => {
    const impact = impactFor(i);
    return {
      title_en: i.title_en,
      title_ar: i.title_ar,
      severity: i.severity,
      evidence: i.evidence,
      recommendation_en: i.recommendation_en,
      recommendation_ar: i.recommendation_ar,
      priority: priorityFor(i.severity),
      confidence: i.confidence,
      expected_impact_en: impact.en,
      expected_impact_ar: impact.ar,
      next_actions: [i.recommendation_en],
    };
  });

  const critical = priorities.filter((p) => p.severity === "critical").length;
  const elevated = priorities.filter((p) => p.severity === "elevated").length;
  const patrolPct = health.patrolsPlannedToday
    ? Math.round((health.patrolsDoneToday / health.patrolsPlannedToday) * 100)
    : null;

  const healthLine_en = [
    `${health.openIncidents} open incidents`,
    `${health.alerts24h} alerts in 24h`,
    `${health.overdueWorkOrders} overdue work orders`,
    patrolPct !== null ? `patrol completion ${patrolPct}%` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const healthLine_ar = [
    `${health.openIncidents} حادثة مفتوحة`,
    `${health.alerts24h} تنبيه خلال ٢٤ ساعة`,
    `${health.overdueWorkOrders} أمر عمل متأخر`,
    patrolPct !== null ? `تنفيذ الدوريات ${patrolPct}%` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const alertsLine_en = critical
    ? `${critical} critical and ${elevated} elevated items need your attention.`
    : elevated
      ? `${elevated} elevated items need your attention.`
      : "No critical items detected right now.";
  const alertsLine_ar = critical
    ? `${critical} حرجة و${elevated} مرتفعة تستدعي انتباهك.`
    : elevated
      ? `${elevated} بنود مرتفعة تستدعي انتباهك.`
      : "لا توجد بنود حرجة في الوقت الحالي.";

  const approvalsLine_en = approvals.length
    ? `${approvals.length} pending approvals await your review.`
    : "No pending approvals in your queue.";
  const approvalsLine_ar = approvals.length
    ? `${approvals.length} اعتماد بانتظار مراجعتك.`
    : "لا توجد اعتمادات معلّقة.";

  const topPriority = priorities[0];
  const priorityLine_en = topPriority
    ? `Top priority: ${topPriority.title_en}.`
    : "Today's operations are stable.";
  const priorityLine_ar = topPriority
    ? `أولوية اليوم: ${topPriority.title_ar}.`
    : "العمليات اليوم مستقرة.";

  const greeting_en =
    `Welcome, Director. Systems online: ${healthLine_en}. ${alertsLine_en} ${approvalsLine_en} ${priorityLine_en} ` +
    `Ask me anytime — I'll bring the evidence, reasoning and next actions.`;
  const greeting_ar =
    `أهلاً بك يا سعادة المدير. الأنظمة جاهزة: ${healthLine_ar}. ${alertsLine_ar} ${approvalsLine_ar} ${priorityLine_ar} ` +
    `اسألني في أي وقت — أُقدّم الأدلة والاستدلال والخطوات التالية.`;

  return {
    generatedAt,
    health,
    approvals: approvals.slice(0, 8),
    priorities,
    greeting_en,
    greeting_ar,
    sources: insightBundle.sources,
    insightCount: insightBundle.insights.length,
  };
}
