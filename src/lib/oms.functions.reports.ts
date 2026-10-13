// Auto-split from oms.functions.ts — timeline, activity, KPIs, SADEED analysis,
// executive review, attachments, and list queries. Re-exported by oms.functions.
//
// ────────────────────────────────────────────────────────────────────────────
// «بيانات لا تفرغ» + «الطريقة المحفوظة ٤٠١/٤٠٣» — القسمة المطبَّقة هنا
// ────────────────────────────────────────────────────────────────────────────
// نوافذ `/sec/incidents` و`/sec/maintenance` و`/sec/permits` شاشات عرض
// يفتحها زائر بلا جلسة (`_authenticated` لا يحوّل إلى `/auth`). فكانت كل
// قراءاتها خلف `requireSupabaseAuth` — وهو يرمي حرفيًّا
// `"Unauthorized: No authorization header provided"`، فيرى الزائر جدولًا
// فارغًا وبطاقات غائبة بدل بيانات، وحدُّ الخطأ يعرض جملة مصادقة إنجليزية.
//
// القاعدة المطبَّقة: **القراءة للعرض `optionalSupabaseAuth` + `resilient`،
// والكتابة تبقى خلف `requireSupabaseAuth`.** فالمعدوم أمنيًّا ليس القراءة
// بل الكتابة؛ والقراءة بعميل `anon` تخضع لسياسات RLS كما هي — لا تجاوز
// بـ`service_role`، فلا يرى الزائر صفًّا لم تسمح له القاعدة برؤيته.
//
// وثلاث دوالّ تبقى خلف المصادقة **بحقٍّ** رغم كونها قراءات:
// `getIncidentAttachmentUrl` تصدر رابطًا موقّعًا إلى ملف في مستودع خاص —
// وهذا منحُ قدرة لا عرضُ بيان؛ ومعها كل مسارات الكتابة والتحليل والمراجعة.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import type { JsonValue, ActivityEvent } from "./oms.shared";
import type {
  OmsIncidentRow,
  OmsPermitRow,
  OmsWorkOrderRow,
} from "@/lib/exec/showcase-simulation.server";

/**
 * معرّف صفٍّ من المحاكاة المرجعية لا من القاعدة.
 *
 * صفوف `buildOmsSimulation` تحمل معرّفات `sim-*` وليست UUID، فلو بقي
 * المدخل `z.string().uuid()` لسقط طلب الزائر عند التحقق قبل بلوغ المعالج
 * أصلًا — ولظهرت الشاشة ممتلئة والنقر عليها معطّلًا. (السابقة نفسها
 * مطبَّقة في `getReportDownloadUrl` على `sim-rep-*`.)
 */
const isSimulatedId = (id: string) => id.startsWith("sim-");

/**
 * معرّف صفٍّ من مجموعة «تقرير البلاغات» الحقيقية (`evr-<ref>`) —
 * ٢٠٢٦/٠٨/٢٧. ليس UUID، فيُحلّ من المجموعة الحقيقية مباشرة ولا يمرّ
 * بمسار المحاكاة ولا باستعلام القاعدة (الذي يرفض غير الـUUID).
 */
const isRealReportId = (id: string) => id.startsWith("evr-");

/** معرّف غير قاعدي (محاكاة أو مجموعة حقيقية) — يُقبل في المدخلات بلا UUID. */
const isNonDbId = (id: string) => isSimulatedId(id) || isRealReportId(id);

// ============================================================================

export const getEntityTimeline = createServerFn({ method: "POST" })
  // قراءة عرض: الخطّ الزمني داخل درج البلاغ.
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ entity_type: z.string(), entity_id: z.string().min(1).max(64) })
      .refine((v) => isNonDbId(v.entity_id) || z.string().uuid().safeParse(v.entity_id).success)
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ActivityEvent[]> => {
    const { buildOmsSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    const simTimeline = () =>
      buildOmsSimulation(Date.now()).activity.filter(
        (e) => e.entity_type === data.entity_type && e.entity_id === data.entity_id,
      ) as unknown as ActivityEvent[];
    // كيان محاكاة ⇒ لا استعلام أصلًا: معرّفه غير موجود في القاعدة.
    if (isSimulatedId(data.entity_id)) return simTimeline();
    // بلاغ من المجموعة الحقيقية: المصدر لا يحمل سجلّ أحداث — خطّ زمني
    // فارغ حقيقةٌ لا فراغ (المادة ٢٧)، ولا يُخترع من محاكاة كيان آخر.
    if (isRealReportId(data.entity_id)) return [];
    return resilient(
      "oms-entity-timeline",
      async () => {
        const { data: rows, error } = await context.supabase
          .from("sec_activity_events")
          .select("*")
          .eq("entity_type", data.entity_type)
          .eq("entity_id", data.entity_id)
          .order("occurred_at", { ascending: false });
        if (error) throw new Error(error.message);
        return (rows ?? []) as ActivityEvent[];
      },
      // خطّ زمني فارغ لكيانٍ حقيقي حقيقةٌ لا فراغ — لا يُملأ بمحاكاة كيان آخر.
      () => false,
      () => [],
    );
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  // قراءة عرض: شريط النشاط الأخير.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityEvent[]> => {
    const { buildOmsSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "oms-recent-activity",
      async () => {
        const { data, error } = await context.supabase
          .from("sec_activity_events")
          .select("*")
          .order("occurred_at", { ascending: false })
          .limit(100);
        if (error) throw new Error(error.message);
        return (data ?? []) as ActivityEvent[];
      },
      (rows) => rows.length === 0,
      () => buildOmsSimulation(Date.now()).activity as unknown as ActivityEvent[],
    );
  });

// ============================================================================
// OMS KPI snapshot — pulls live counts
// ============================================================================

type KpiIncident = {
  status: string;
  // ٢٠٢٦/٠٨/٢٧ — الشدة غير مقيسة في مجموعة «تقرير البلاغات» الحقيقية.
  severity: string | null;
  response_minutes: number | null;
  ai_risk_score: number | null;
};
type KpiWorkOrder = { status: string; kind: string; due_at: string | null };
type KpiPermit = { status: string; ends_at: string };

export type OmsKpis = ReturnType<typeof deriveOmsKpis>;

/**
 * اشتقاق المؤشرات من الصفوف نفسها المعروضة.
 *
 * **لماذا دالّة واحدة للمسارين.** لو حُسبت مؤشرات القاعدة هنا ومؤشرات
 * المحاكاة هناك لأمكن أن يقول الرأس «٤ مفتوحة» بينما الجدول تحته يعرض
 * خمسًا. فالحساب واحد ومصدره الصفوف — حيًّا كان أم مرجعيًّا.
 */
function deriveOmsKpis(
  incidents: KpiIncident[],
  workOrders: KpiWorkOrder[],
  permits: KpiPermit[],
  activity24h: number,
  now: number,
) {
  const open = incidents.filter((i) => i.status !== "closed" && i.status !== "resolved");
  // المادة ٢٧ (٢٠٢٦/٠٨/٢٧): مجموعة «تقرير البلاغات» الحقيقية بلا شدة —
  // «عدد الحرجة» فوق صفوفٍ لم تُقَس شدّتها ليس صفرًا بل «لم يُقَس» (null).
  // العدّ يبقى قياسًا صحيحًا حين تكون الشدة مقيسة أو حين لا صفوف أصلًا.
  const severityMeasured = incidents.some((i) => i.severity != null);
  const critical =
    incidents.length === 0 || severityMeasured
      ? incidents.filter((i) => i.severity === "critical").length
      : null;
  // متوسط بلا عيّنة لا وجود له — null لا «0 دقيقة» (ادّعاء أداء مثالي).
  const responded = incidents.filter((i) => i.response_minutes != null);
  const avgResp = responded.length
    ? Math.round(responded.reduce((s, i) => s + (i.response_minutes ?? 0), 0) / responded.length)
    : null;
  const woOpen = workOrders.filter((w) => w.status !== "closed" && w.status !== "cancelled");
  const woOverdue = woOpen.filter((w) => w.due_at && new Date(w.due_at).getTime() < now);
  const completionPct = workOrders.length
    ? Math.round(((workOrders.length - woOpen.length) / workOrders.length) * 100)
    : 100;
  const permOpen = permits.filter(
    (p) =>
      (p.status === "approved" || p.status === "active") && new Date(p.ends_at).getTime() > now,
  );
  const permPending = permits.filter((p) => p.status === "pending");
  // كانت `?? 40` تختلق درجة خطر لصفوفٍ لم تُحلَّل — المتوسط على المقيس وحده.
  const scored = incidents.filter((i) => i.ai_risk_score != null);
  const avgRisk = scored.length
    ? Math.round(scored.reduce((s, i) => s + (i.ai_risk_score ?? 0), 0) / scored.length)
    : null;
  // مركّب من أطراف غير مقيسة غيرُ مقيس مثلها.
  const readiness =
    critical === null || avgRisk === null
      ? null
      : Math.max(
          0,
          Math.min(100, 100 - critical * 8 - woOverdue.length * 3 - Math.max(0, avgRisk - 50)),
        );
  return {
    incidents: {
      total: incidents.length,
      open: open.length,
      critical,
      avg_response_minutes: avgResp,
      avg_risk_score: avgRisk,
    },
    work_orders: {
      total: workOrders.length,
      open: woOpen.length,
      overdue: woOverdue.length,
      completion_pct: completionPct,
    },
    permits: {
      total: permits.length,
      active: permOpen.length,
      pending: permPending.length,
    },
    activity_24h: activity24h,
    executive_readiness: readiness,
  };
}

export const getOmsKpis = createServerFn({ method: "GET" })
  // قراءة عرض: بطاقات الرأس فوق البلاغات والصيانة والتصاريح.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<OmsKpis> => {
    const { supabase } = context;
    const { buildOmsSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    const now = Date.now();
    const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
    return resilient(
      "oms-kpis",
      async () => {
        const [inc, wo, perm, acts] = await Promise.all([
          supabase
            .from("sec_incidents")
            .select("id, status, severity, response_minutes, reported_at, ai_risk_score"),
          supabase.from("sec_work_orders").select("id, status, kind, due_at"),
          supabase.from("sec_permits").select("id, status, ends_at"),
          supabase
            .from("sec_activity_events")
            .select("id, event, occurred_at")
            .gte("occurred_at", since24h),
        ]);
        return deriveOmsKpis(
          (inc.data ?? []) as KpiIncident[],
          (wo.data ?? []) as KpiWorkOrder[],
          (perm.data ?? []) as KpiPermit[],
          (acts.data ?? []).length,
          now,
        );
      },
      // لا بلاغ ولا أمر عمل ولا تصريح = نافذة فارغة، لا «صفر مَقيس».
      (k) => k.incidents.total === 0 && k.work_orders.total === 0 && k.permits.total === 0,
      // ٢٠٢٦/٠٨/٢٧ — بلاغات البديل من مجموعة «تقرير البلاغات» الحقيقية
      // (3,427 صفًّا فعليًّا) لا من المحاكاة. و٢٠٢٦/٠٩/٠٢ — أوامر العمل
      // من تصدير SAP المستورد (249 أمرًا) بأمر «اعكس جميع بيانات الصيانة
      // المرفقة»؛ التصاريح والنشاط تبقى محاكاتها كما هي.
      async () => {
        const sim = buildOmsSimulation(now);
        const [{ REAL_INCIDENTS }, { REAL_SEC_WORK_ORDERS }] = await Promise.all([
          import("@/lib/exec/event-report.real.server"),
          import("@/lib/exec/maintenance-report.real.server"),
        ]);
        return deriveOmsKpis(
          REAL_INCIDENTS as unknown as KpiIncident[],
          REAL_SEC_WORK_ORDERS as unknown as KpiWorkOrder[],
          sim.permits,
          sim.activity.filter((e) => new Date(e.occurred_at).getTime() >= now - 24 * 3600 * 1000)
            .length,
          now,
        );
      },
    );
  });

// ============================================================================
// SADEED — operational analysis stub (calls existing AI Gateway later;
// here we return a heuristic recommendation built from incident state)
// ============================================================================

export const sadeedAnalyzeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ incident_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inc, error } = await context.supabase
      .from("sec_incidents")
      .select("*")
      .eq("id", data.incident_id)
      .single();
    if (error) throw new Error(error.message);

    const { sadeedAnalyseIncident } = await import("./oms-sadeed.server");
    const analysis = await sadeedAnalyseIncident({
      ref: inc.ref,
      category: inc.category,
      title_ar: inc.title_ar,
      title_en: inc.title_en,
      severity: inc.severity,
      priority: inc.priority ?? "medium",
      status: inc.status,
      assigned_to: inc.assigned_to,
      owner: inc.owner,
    });

    await context.supabase
      .from("sec_incidents")
      .update({
        ai_summary: analysis.summary_ar,
        ai_risk_score: analysis.risk_score,
        aria_auto_analyzed: analysis.source === "gemini",
      })
      .eq("id", data.incident_id);

    await context.supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: inc.ref,
      event: "aria_analyzed",
      actor_id: context.userId,
      actor_name: `سَدِيد (${analysis.source})`,
      payload: {
        risk_score: analysis.risk_score,
        recommendations: analysis.recommendations,
        immediate_actions: analysis.immediate_actions,
        summary_en: analysis.summary_en,
      },
    });

    return analysis;
  });

// ============================================================================
// EXECUTIVE REVIEW & ATTACHMENTS
// ============================================================================

export const setExecutiveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        incident_id: z.string().uuid(),
        review: z.string().min(5).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ??
      claims?.email ??
      "مراجع تنفيذي";
    const { data: row, error } = await supabase
      .from("sec_incidents")
      .update({
        executive_review: data.review,
        executive_reviewed_by: userId,
        executive_reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.incident_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: row.ref,
      event: "executive_reviewed",
      actor_id: userId,
      actor_name: actorName,
      payload: { review_excerpt: data.review.slice(0, 200) },
    });
    return { ok: true };
  });

const attachmentSchema = z.object({
  incident_id: z.string().uuid(),
  storage_path: z.string().min(3).max(500),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(120).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  caption: z.string().max(400).optional(),
});

export const addIncidentAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attachmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: cur, error: e1 } = await supabase
      .from("sec_incidents")
      .select("ref, attachments")
      .eq("id", data.incident_id)
      .single();
    if (e1) throw new Error(e1.message);
    const prev = Array.isArray(cur.attachments) ? (cur.attachments as JsonValue[]) : [];
    const next: JsonValue[] = [
      ...prev,
      {
        id: crypto.randomUUID(),
        storage_path: data.storage_path,
        file_name: data.file_name,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        caption: data.caption ?? null,
        uploaded_by: actorName,
        uploaded_at: new Date().toISOString(),
      },
    ];
    const { error: e2 } = await supabase
      .from("sec_incidents")
      .update({ attachments: next as never, attachments_count: next.length })
      .eq("id", data.incident_id);
    if (e2) throw new Error(e2.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: cur.ref,
      event: "attachment_added",
      actor_id: userId,
      actor_name: actorName,
      payload: { file_name: data.file_name, mime_type: data.mime_type ?? null },
    });
    return { ok: true, count: next.length };
  });

export const removeIncidentAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ incident_id: z.string().uuid(), attachment_id: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: cur, error: e1 } = await supabase
      .from("sec_incidents")
      .select("ref, attachments")
      .eq("id", data.incident_id)
      .single();
    if (e1) throw new Error(e1.message);
    const prev = Array.isArray(cur.attachments)
      ? (cur.attachments as Array<{ id: string; storage_path: string }>)
      : [];
    const target = prev.find((a) => a.id === data.attachment_id);
    const next = prev.filter((a) => a.id !== data.attachment_id);
    if (target?.storage_path) {
      try {
        await supabase.storage.from("uploads").remove([target.storage_path]);
      } catch (e) {
        console.warn("[attachment remove] storage", e);
      }
    }
    const { error: e2 } = await supabase
      .from("sec_incidents")
      .update({ attachments: next as never, attachments_count: next.length })
      .eq("id", data.incident_id);
    if (e2) throw new Error(e2.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: cur.ref,
      event: "attachment_removed",
      actor_id: userId,
      actor_name: actorName,
      payload: { attachment_id: data.attachment_id },
    });
    return { ok: true, count: next.length };
  });

// يبقى خلف المصادقة بحقّ: رابط موقّع إلى ملف في مستودع خاص — منحُ قدرة
// على تنزيل مرفق، لا عرضُ بيان على شاشة.
export const getIncidentAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storage_path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("uploads")
      .createSignedUrl(data.storage_path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const getIncidentDetail = createServerFn({ method: "POST" })
  // قراءة عرض: تفاصيل البلاغ في الدرج (المراجعة التنفيذية والمرفقات).
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ incident_id: z.string().min(1).max(64) })
      .refine((v) => isNonDbId(v.incident_id) || z.string().uuid().safeParse(v.incident_id).success)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { buildOmsSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    const simRow = () =>
      buildOmsSimulation(Date.now()).incidents.find((i) => i.id === data.incident_id) ?? null;
    if (isSimulatedId(data.incident_id)) return simRow();
    // ٢٠٢٦/٠٨/٢٧ — معرّف `evr-*` يُحلّ من مجموعة «تقرير البلاغات» الحقيقية:
    // لا يمرّ بمسار المحاكاة ولا يُفقد على استعلام قاعدة يرفض غير الـUUID.
    if (isRealReportId(data.incident_id)) {
      const { findRealIncident } = await import("@/lib/exec/event-report.real.server");
      return findRealIncident(data.incident_id);
    }
    return resilient<OmsIncidentRow | null>(
      "oms-incident-detail",
      async () => {
        const { data: inc, error } = await context.supabase
          .from("sec_incidents")
          .select("*")
          .eq("id", data.incident_id)
          .single();
        if (error) throw new Error(error.message);
        return inc as unknown as OmsIncidentRow;
      },
      // بلاغٌ حقيقي مفقود غيابٌ لا فراغ — لا يُستبدل بصفٍّ مرجعي مختلف.
      () => false,
      () => null,
    );
  });

// ============================================================================
// LIST QUERIES — fresh reads with operational fields
// ============================================================================
// ثلاثتها نوافذ عرض: `optionalSupabaseAuth` + `resilient` — مهلة أو فشل أو
// نتيجة فارغة ⇒ المحاكاة المرجعية موسومةً `is_simulation=true`، وصفوف
// القاعدة الحيّة تفوز دائمًا متى وصلت.

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "oms-incidents",
      async () => {
        const { data, error } = await context.supabase
          .from("sec_incidents")
          .select("*")
          .order("reported_at", { ascending: false })
          .limit(500);
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as OmsIncidentRow[];
      },
      (rows) => rows.length === 0,
      // ٢٠٢٦/٠٨/٢٧ — أمر المالك: بديل البلاغات هو مجموعة «تقرير البلاغات»
      // الحقيقية لا `buildOmsSimulation().incidents`. أحدث 500 صف مرآةُ
      // سقف الاستعلام الحي أعلاه؛ الصفوف مجمّدة فلا يسمها `markSimulation`
      // — `is_simulation` غائب لأنها ليست محاكاة. صفوف القاعدة الحيّة
      // تفوز دائمًا متى وصلت (`resilient` كما هو).
      async () => {
        const { REAL_INCIDENTS } = await import("@/lib/exec/event-report.real.server");
        return REAL_INCIDENTS.slice(0, 500) as OmsIncidentRow[];
      },
    );
  });

export const listWorkOrders = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "oms-work-orders",
      async () => {
        const { data, error } = await context.supabase
          .from("sec_work_orders")
          .select("*")
          .order("opened_at", { ascending: false })
          .limit(500);
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as OmsWorkOrderRow[];
      },
      (rows) => rows.length === 0,
      // ٢٠٢٦/٠٩/٠٢ — بديل جدول الصيانة هو مجموعة تصدير SAP المستوردة
      // (249 أمرًا) لا المحاكاة المولّدة. إنتاجيةٌ بإقرار المالك في اليوم
      // نفسه («ارفع شارة المحاكاة، بيانات الصيانة إنتاجية») — صفوفها
      // مجمّدة فيتخطّاها `markSimulation` ولا شارة عليها. وبلا هوية أشخاص
      // لأي نداء (SEC-01) — يحرسه `maintenance-identity.contract.test.ts`.
      async () => {
        const { REAL_SEC_WORK_ORDERS } = await import("@/lib/exec/maintenance-report.real.server");
        return REAL_SEC_WORK_ORDERS as unknown as OmsWorkOrderRow[];
      },
    );
  });

export const listPermits = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildOmsSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "oms-permits",
      async () => {
        const { data, error } = await context.supabase
          .from("sec_permits")
          .select("*")
          .order("starts_at", { ascending: false })
          .limit(500);
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as OmsPermitRow[];
      },
      (rows) => rows.length === 0,
      () => buildOmsSimulation(Date.now()).permits,
    );
  });
