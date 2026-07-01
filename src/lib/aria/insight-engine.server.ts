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
  | "alert_surge";

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
function bucketBy<T, K extends string>(rows: T[], key: (r: T) => K | null | undefined): Map<K, T[]> {
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

export async function runInsightScan(): Promise<InsightBundle> {
  const scannedAt = new Date().toISOString();
  const sources: string[] = [];
  const insights: Insight[] = [];

  let admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"] | null = null;
  try {
    ({ supabaseAdmin: admin } = await import("@/integrations/supabase/client.server"));
  } catch {
    return { insights, scannedAt, sources, block: "" };
  }
  if (!admin) return { insights, scannedAt, sources, block: "" };

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
      const critical = inc.filter((r) => String(r.severity ?? "").toLowerCase().match(/crit|high|عالي|حرج/));
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
  } catch { /* ignore */ }

  // 2. KPI drops
  try {
    const { data: kpis } = await admin
      .from("pulse_kpis")
      .select("key,label,label_en,value,delta,trend,tone,updated_at")
      .order("updated_at", { ascending: false })
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
  } catch { /* ignore */ }

  // 3. Overdue work orders
  try {
    const { data: wo } = await admin
      .from("sec_work_orders")
      .select("id,title_en,title_ar,priority,status,due_at")
      .lt("due_at", new Date().toISOString())
      .not("status", "in", "(closed,completed,cancelled)")
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
  } catch { /* ignore */ }

  // 4. Risk hotspots
  try {
    const { data: risks } = await admin
      .from("sim_risks")
      .select("title,category,likelihood,impact,status")
      .order("impact", { ascending: false })
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
          evidence: `sim_risks: ${hot.map((r) => r.title).slice(0, 3).join("; ")}`,
          recommendation_en: "Assign risk owners and enforce weekly mitigation checkpoints.",
          recommendation_ar: "تعيين مالكي المخاطر وفرض نقاط مراجعة أسبوعية للتخفيف.",
          confidence: 0.8,
        });
      }
    }
  } catch { /* ignore */ }

  // 5. Alert surge
  try {
    const { data: alerts } = await admin
      .from("sim_notifications")
      .select("id,severity,created_at")
      .gte("created_at", iso24h)
      .limit(500);
    if (alerts && alerts.length >= 30) {
      sources.push("sim_notifications");
      insights.push({
        kind: "alert_surge",
        severity: alerts.length >= 100 ? "critical" : "elevated",
        title_en: `Alert surge: ${alerts.length} notifications in 24h`,
        title_ar: `ارتفاع التنبيهات: ${alerts.length} إشعار خلال ٢٤ ساعة`,
        evidence: `sim_notifications: ${alerts.length} rows in last 24h`,
        recommendation_en: "Triage alert taxonomy and mute duplicates to preserve operator attention.",
        recommendation_ar: "مراجعة تصنيف التنبيهات وإسكات المكررة للحفاظ على تركيز المشغّلين.",
        confidence: 0.7,
      });
    }
  } catch { /* ignore */ }

  // Rank & cap
  const order: Record<InsightSeverity, number> = { critical: 0, elevated: 1, watch: 2, info: 3 };
  insights.sort((a, b) => order[a.severity] - order[b.severity] || b.confidence - a.confidence);
  const top = insights.slice(0, 6);

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
