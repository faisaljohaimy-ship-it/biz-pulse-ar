/**
 * ARIA Executive Insight Engine (server-only, additive).
 *
 * Proactively scans live operational data to surface risks, bottlenecks,
 * repeated incidents, KPI degradations, and overdue work — before the user
 * asks. Output is a compact, deterministic bundle of Insight objects that
 * the Thinking Loop injects into the model system prompt as GROUNDED
 * OBSERVATIONS. All queries are read-only; failures degrade silently.
 */

export type InsightSeverity = "info" | "watch" | "elevated" | "critical";
export type InsightKind =
  | "repeated_incident"
  | "severity_cluster"
  | "kpi_drop"
  | "overdue_work"
  | "risk_hotspot"
  | "alert_surge"
  | "patrol_shortfall"
  | "missing_reports"
  | "inactive_department"
  | "workload_pressure"
  | "trend_prediction"
  | "correlation";

export interface Insight {
  kind: InsightKind;
  severity: InsightSeverity;
  title_en: string;
  title_ar: string;
  evidence: string; // one line, cite table + concrete numbers
  recommendation_en: string;
  recommendation_ar: string;
  confidence: number; // 0..1
}

export interface InsightBundle {
  insights: Insight[];
  scannedAt: string;
  sources: string[];
  block: string; // preformatted for prompt injection
}

/** Aggregate helpers */
function bucketBy<T, K extends string>(
  rows: T[],
  key: (r: T) => K | null | undefined,
): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const arr = m.get(k) ?? [];
    arr.push(r);
    m.set(k, arr);
  }
  return m;
}

export async function runInsightScan(orgId?: string | null): Promise<InsightBundle> {
  const scannedAt = new Date().toISOString();
  const sources: string[] = [];
  const insights: Insight[] = [];

  let admin:
    | Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]
    | null = null;
  try {
    ({ supabaseAdmin: admin } = await import("@/integrations/supabase/client.server"));
  } catch {
    return { insights, scannedAt, sources, block: "" };
  }
  if (!admin) return { insights, scannedAt, sources, block: "" };
  // Tenant isolation: this scan hits the service-role client (which bypasses
  // RLS) so we MUST filter every query by the caller's org_id. When no org id
  // is available (e.g. missing membership) return an empty bundle rather than
  // leak cross-tenant rows.
  if (!orgId) return { insights, scannedAt, sources, block: "" };
  if (!orgId) return { insights, scannedAt, sources, block: "" };

  // Windows
  const now = Date.now();
  const iso7d = new Date(now - 7 * 24 * 3600_000).toISOString();
  const iso24h = new Date(now - 24 * 3600_000).toISOString();

  // 1. Recent incidents → repeated by site + severity clusters
  try {
    const { data: inc } = await admin
      .from("sec_incidents")
      .select("id,site_id,severity,status,title_en,title_ar,reported_at")
      .gte("reported_at", iso7d)
      .eq("org_id", orgId!)
      .limit(200);
    if (inc?.length) {
      sources.push("sec_incidents");
      const bySite = bucketBy(inc, (r) => (r.site_id as string) ?? null);
      for (const [site, rows] of bySite) {
        if (rows.length >= 3) {
          insights.push({
            kind: "repeated_incident",
            severity: rows.length >= 6 ? "critical" : "elevated",
            title_en: `Recurring incidents at site ${site} (${rows.length} in 7 days)`,
            title_ar: `تكرار الحوادث في الموقع ${site} (${rows.length} خلال ٧ أيام)`,
            evidence: `sec_incidents: ${rows.length} incidents in 7d at site=${site}`,
            recommendation_en: `Dispatch a focused audit at site ${site} and review controls this week.`,
            recommendation_ar: `تنفيذ تدقيق مركّز على الموقع ${site} ومراجعة الضوابط خلال الأسبوع.`,
            confidence: rows.length >= 6 ? 0.9 : 0.75,
          });
        }
      }
      const critical = inc.filter((r) =>
        String(r.severity ?? "")
          .toLowerCase()
          .match(/crit|high|عالي|حرج/),
      );
      if (critical.length >= 3) {
        insights.push({
          kind: "severity_cluster",
          severity: "critical",
          title_en: `Cluster of ${critical.length} high-severity incidents in 7 days`,
          title_ar: `تجمع ${critical.length} حادثة عالية الخطورة خلال ٧ أيام`,
          evidence: `sec_incidents: ${critical.length} high/critical rows in 7d`,
          recommendation_en: "Convene an emergency operational review with regional leads.",
          recommendation_ar: "عقد مراجعة تشغيلية طارئة مع قيادات المنطقة.",
          confidence: 0.85,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 2. KPI drops
  try {
    const { data: kpis } = await admin
      .from("pulse_kpis")
      .select("key,label,label_en,value,delta,trend,tone,updated_at")
      .order("updated_at", { ascending: false })
      .eq("org_id", orgId!)
      .limit(30);
    if (kpis?.length) {
      sources.push("pulse_kpis");
      for (const k of kpis) {
        const delta = Number(k.delta ?? 0);
        const tone = String(k.tone ?? "").toLowerCase();
        const trend = String(k.trend ?? "").toLowerCase();
        if ((tone === "negative" || tone === "critical" || trend === "down") && delta <= -5) {
          insights.push({
            kind: "kpi_drop",
            severity: delta <= -15 ? "critical" : "elevated",
            title_en: `${k.label_en ?? k.label ?? k.key} dropped ${delta}%`,
            title_ar: `تراجع مؤشر ${k.label ?? k.label_en ?? k.key} بمقدار ${delta}%`,
            evidence: `pulse_kpis: ${k.key} value=${k.value} Δ=${delta} trend=${k.trend}`,
            recommendation_en: `Investigate driver of drop in ${k.label_en ?? k.key} and align a corrective owner.`,
            recommendation_ar: `التحقق من مسبّبات تراجع ${k.label ?? k.key} وتعيين مسؤول للمعالجة.`,
            confidence: 0.8,
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Overdue work orders
  try {
    const { data: wo } = await admin
      .from("sec_work_orders")
      .select("id,title_en,title_ar,priority,status,due_at")
      .lt("due_at", new Date().toISOString())
      .not("status", "in", "(closed,completed,cancelled)")
      .eq("org_id", orgId!)
      .limit(50);
    if (wo?.length) {
      sources.push("sec_work_orders");
      if (wo.length >= 5) {
        insights.push({
          kind: "overdue_work",
          severity: wo.length >= 15 ? "critical" : "elevated",
          title_en: `${wo.length} overdue work orders`,
          title_ar: `${wo.length} أمر عمل متأخر`,
          evidence: `sec_work_orders: ${wo.length} open past due date`,
          recommendation_en: "Rebalance the maintenance queue and escalate items older than 72h.",
          recommendation_ar: "إعادة توزيع طابور الصيانة وتصعيد ما تجاوز ٧٢ ساعة.",
          confidence: 0.85,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 4. Risk hotspots
  try {
    const { data: risks } = await admin
      .from("sim_risks")
      .select("title,category,likelihood,impact,status")
      .order("impact", { ascending: false })
      .eq("org_id", orgId!)
      .limit(20);
    if (risks?.length) {
      sources.push("sim_risks");
      const hot = risks.filter((r) => Number(r.impact ?? 0) >= 4 && Number(r.likelihood ?? 0) >= 3);
      if (hot.length) {
        insights.push({
          kind: "risk_hotspot",
          severity: hot.length >= 3 ? "critical" : "elevated",
          title_en: `${hot.length} high-likelihood, high-impact risks active`,
          title_ar: `${hot.length} من المخاطر عالية الاحتمال وعالية الأثر نشطة`,
          evidence: `sim_risks: ${hot
            .map((r) => r.title)
            .slice(0, 3)
            .join("; ")}`,
          recommendation_en: "Assign risk owners and enforce weekly mitigation checkpoints.",
          recommendation_ar: "تعيين مالكي المخاطر وفرض نقاط مراجعة أسبوعية للتخفيف.",
          confidence: 0.8,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 5. Alert surge
  try {
    const { data: alerts } = await admin
      .from("sim_notifications")
      .select("id,severity,created_at")
      .gte("created_at", iso24h)
      .eq("org_id", orgId!)
      .limit(500);
    if (alerts && alerts.length >= 30) {
      sources.push("sim_notifications");
      insights.push({
        kind: "alert_surge",
        severity: alerts.length >= 100 ? "critical" : "elevated",
        title_en: `Alert surge: ${alerts.length} notifications in 24h`,
        title_ar: `ارتفاع التنبيهات: ${alerts.length} إشعار خلال ٢٤ ساعة`,
        evidence: `sim_notifications: ${alerts.length} rows in last 24h`,
        recommendation_en:
          "Triage alert taxonomy and mute duplicates to preserve operator attention.",
        recommendation_ar: "مراجعة تصنيف التنبيهات وإسكات المكررة للحفاظ على تركيز المشغّلين.",
        confidence: 0.7,
      });
    }
  } catch {
    /* ignore */
  }

  // 6. Patrol shortfall + workload pressure (sim_daily_ops)
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: ops } = await admin
      .from("sim_daily_ops")
      .select("day,site_id,patrols_planned,patrols_done,incidents_open,headcount")
      .gte("day", new Date(now - 3 * 86400_000).toISOString().slice(0, 10))
      .eq("org_id", orgId!)
      .limit(200);
    if (ops?.length) {
      sources.push("sim_daily_ops");
      const todayRows = ops.filter((r) => r.day === today);
      const short = todayRows.filter(
        (r) => r.patrols_planned > 0 && r.patrols_done < r.patrols_planned * 0.7,
      );
      if (short.length >= 2) {
        const gap = short.reduce((s, r) => s + (r.patrols_planned - r.patrols_done), 0);
        insights.push({
          kind: "patrol_shortfall",
          severity: gap >= 15 ? "critical" : "elevated",
          title_en: `Patrol shortfall: ${gap} patrols missed across ${short.length} sites today`,
          title_ar: `عجز في الدوريات: ${gap} دورية غير منفذة في ${short.length} موقع اليوم`,
          evidence: `sim_daily_ops: planned-vs-done gap=${gap} sites=${short.length}`,
          recommendation_en: "Reassign patrol teams to shortfall sites and confirm shift coverage.",
          recommendation_ar: "إعادة توزيع فرق الدوريات على المواقع المتأخرة وتأكيد تغطية الورديات.",
          confidence: 0.85,
        });
      }
      const pressured = todayRows.filter(
        (r) => r.headcount > 0 && r.incidents_open >= Math.max(3, Math.ceil(r.headcount * 0.4)),
      );
      if (pressured.length) {
        insights.push({
          kind: "workload_pressure",
          severity: pressured.length >= 3 ? "elevated" : "watch",
          title_en: `High workload at ${pressured.length} site(s): open incidents outpace headcount`,
          title_ar: `ضغط تشغيلي في ${pressured.length} موقع: الحوادث المفتوحة تفوق عدد الأفراد`,
          evidence: `sim_daily_ops: pressured sites=${pressured.length}`,
          recommendation_en:
            "Surge additional operators to the pressured sites for the next shift.",
          recommendation_ar: "دعم المواقع المضغوطة بمشغّلين إضافيين خلال الوردية القادمة.",
          confidence: 0.72,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 7. Missing reports (no reports in last 24h)
  try {
    const { data: rpt } = await admin
      .from("sec_reports")
      .select("kind,created_at")
      .gte("created_at", iso24h)
      .eq("org_id", orgId!)
      .limit(50);
    sources.push("sec_reports");
    if (!rpt || rpt.length === 0) {
      insights.push({
        kind: "missing_reports",
        severity: "elevated",
        title_en: "No operational reports produced in the last 24 hours",
        title_ar: "لم يتم إصدار أي تقارير تشغيلية خلال آخر ٢٤ ساعة",
        evidence: "sec_reports: 0 rows in last 24h",
        recommendation_en: "Trigger the daily executive report and verify the reporting pipeline.",
        recommendation_ar: "إطلاق التقرير التنفيذي اليومي والتحقق من خط الإصدار.",
        confidence: 0.8,
      });
    }
  } catch {
    /* ignore */
  }

  // 8. Inactive departments (no meetings scheduled in 14d)
  try {
    const { data: depts } = await admin
      .from("sim_departments")
      .select("id,name_en,status")
      .eq("status", "active")
      .eq("org_id", orgId!)
      .limit(50);
    if (depts?.length) {
      const iso14d = new Date(now - 14 * 86400_000).toISOString();
      const { data: mts } = await admin
        .from("sim_meetings")
        .select("dept_id,scheduled_at")
        .gte("scheduled_at", iso14d)
        .eq("org_id", orgId!)
        .limit(500);
      const active = new Set((mts ?? []).map((m) => m.dept_id).filter(Boolean));
      const inactive = depts.filter((d) => !active.has(d.id));
      if (inactive.length >= 2) {
        sources.push("sim_departments", "sim_meetings");
        insights.push({
          kind: "inactive_department",
          severity: inactive.length >= 5 ? "elevated" : "watch",
          title_en: `${inactive.length} departments held no meetings in 14 days`,
          title_ar: `${inactive.length} إدارة لم تعقد أي اجتماعات خلال ١٤ يوماً`,
          evidence: `sim_departments: ${inactive
            .slice(0, 3)
            .map((d) => d.name_en)
            .join(", ")}${inactive.length > 3 ? "…" : ""}`,
          recommendation_en: "Ask department heads to schedule a governance review this week.",
          recommendation_ar: "الطلب من رؤساء الإدارات جدولة مراجعة حوكمية هذا الأسبوع.",
          confidence: 0.7,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 9. Trend prediction + site correlation (7d vs prior 7d)
  try {
    const iso14d = new Date(now - 14 * 86400_000).toISOString();
    const { data: inc2 } = await admin
      .from("sec_incidents")
      .select("reported_at,severity,site_id")
      .gte("reported_at", iso14d)
      .eq("org_id", orgId!)
      .limit(1000);
    if (inc2?.length) {
      const cutoff = new Date(now - 7 * 86400_000).getTime();
      const recent = inc2.filter((r) => new Date(String(r.reported_at)).getTime() >= cutoff);
      const prior = inc2.filter((r) => new Date(String(r.reported_at)).getTime() < cutoff);
      if (prior.length >= 3 && recent.length >= prior.length * 1.3) {
        const growth = Math.round(
          ((recent.length - prior.length) / Math.max(1, prior.length)) * 100,
        );
        insights.push({
          kind: "trend_prediction",
          severity: growth >= 60 ? "critical" : "elevated",
          title_en: `Incident volume trending +${growth}% vs prior week — projected to persist`,
          title_ar: `اتجاه صاعد في الحوادث بنسبة +${growth}% مقارنة بالأسبوع السابق — يُتوقع استمراره`,
          evidence: `sec_incidents: last7d=${recent.length} prev7d=${prior.length}`,
          recommendation_en: "Activate preventive controls now to avoid next-week escalation.",
          recommendation_ar: "تفعيل الضوابط الوقائية الآن لتفادي تصاعد الأسبوع المقبل.",
          confidence: 0.78,
        });
      }
      const bySite = bucketBy(recent, (r) => (r.site_id as string) ?? null);
      const topSite = [...bySite.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      if (topSite && topSite[1].length >= 4) {
        insights.push({
          kind: "correlation",
          severity: "elevated",
          title_en: `Site ${topSite[0]} shows compounding pressure: ${topSite[1].length} incidents in 7d`,
          title_ar: `الموقع ${topSite[0]} يظهر ضغطاً متراكماً: ${topSite[1].length} حادثة خلال ٧ أيام`,
          evidence: `sec_incidents cluster at site=${topSite[0]}`,
          recommendation_en: "Cross-check overdue work orders and patrol coverage at this site.",
          recommendation_ar: "التحقق المتقاطع من أوامر العمل المتأخرة وتغطية الدوريات لهذا الموقع.",
          confidence: 0.72,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Rank & cap
  const order: Record<InsightSeverity, number> = { critical: 0, elevated: 1, watch: 2, info: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity] || b.confidence - a.confidence);
  const top = insights.slice(0, 8);

  const block = top.length
    ? `# PROACTIVE OBSERVATIONS (Insight Engine, live scan)\n${top
        .map(
          (i, idx) =>
            `${idx + 1}. [${i.severity.toUpperCase()}] ${i.title_en} — ${i.evidence}\n   → ${i.recommendation_en}`,
        )
        .join("\n")}`
    : "";

  return { insights: top, scannedAt, sources, block };
}
