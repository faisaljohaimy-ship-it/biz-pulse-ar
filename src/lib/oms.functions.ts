import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================================
// OMS — Operations Management System (Stage 3 Batch A)
// Incidents · Work Orders · Permits · Workflow Engine · Activity Events
// All writes scoped to authenticated users via RLS; activity events recorded
// for every action to feed the timeline and KPI engine.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { JsonValue } from "./oms.shared";
export type { JsonValue, ActivityEvent } from "./oms.shared";

function genRef(prefix: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function scoreRisk(severity: string, priority: string, category: string): number {
  const sevMap: Record<string, number> = { low: 20, medium: 45, high: 70, critical: 90 };
  const prioMap: Record<string, number> = { low: 0, medium: 5, high: 10, critical: 15 };
  const catBoost = ["intrusion", "fire", "explosion", "weapon"].some((k) =>
    category.toLowerCase().includes(k),
  )
    ? 10
    : 0;
  return Math.min(100, (sevMap[severity] ?? 40) + (prioMap[priority] ?? 5) + catBoost);
}

// ============================================================================
// INCIDENTS
// ============================================================================

const createIncidentSchema = z.object({
  category: z.string().min(2).max(80),
  title_ar: z.string().min(3).max(200),
  title_en: z.string().min(3).max(200).optional().default(""),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  site_id: z.string().uuid().nullable().optional(),
  owner: z.string().max(120).optional(),
  assigned_to: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

export const createIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createIncidentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const ref = genRef("INC");
    const ai_risk_score = scoreRisk(data.severity, data.priority, data.category);
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";

    const { data: row, error } = await supabase
      .from("sec_incidents")
      .insert({
        ref,
        category: data.category,
        title_ar: data.title_ar,
        title_en: data.title_en || data.title_ar,
        severity: data.severity,
        priority: data.priority,
        status: "open",
        site_id: data.site_id ?? null,
        owner: data.owner ?? null,
        assigned_to: data.assigned_to ?? null,
        reported_at: new Date().toISOString(),
        ai_risk_score,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: row.id,
      entity_ref: ref,
      event: "registered",
      actor_id: userId,
      actor_name: actorName,
      payload: {
        severity: data.severity,
        priority: data.priority,
        ai_risk_score,
        notes: data.notes ?? null,
      },
    });

    try {
      const { publishEvent } = await import("./exec/event-bus.server");
      await publishEvent(supabase, {
        topic: "incident.created",
        source: "oms",
        severity:
          data.severity === "critical" ? "critical" : data.severity === "high" ? "warn" : "info",
        actor_id: userId,
        subject_type: "incident",
        subject_id: row.id,
        payload: { ref, category: data.category, priority: data.priority },
        metrics: { ai_risk_score },
      });
    } catch (err) {
      console.error("[createIncident] event publish", err);
    }

    // ── Auto SADEED analysis (Gemini with timeout + heuristic fallback) ──
    try {
      const { sadeedAnalyseIncident } = await import("./oms-sadeed.server");
      const analysis = await sadeedAnalyseIncident({
        ref,
        category: data.category,
        title_ar: data.title_ar,
        title_en: data.title_en || data.title_ar,
        severity: data.severity,
        priority: data.priority,
        status: "open",
        assigned_to: data.assigned_to ?? null,
        owner: data.owner ?? null,
        notes: data.notes ?? null,
      });
      await supabase
        .from("sec_incidents")
        .update({
          ai_summary: analysis.summary_ar,
          ai_risk_score: analysis.risk_score,
          aria_auto_analyzed: analysis.source === "gemini",
        })
        .eq("id", row.id);
      await supabase.from("sec_activity_events").insert({
        entity_type: "incident",
        entity_id: row.id,
        entity_ref: ref,
        event: "aria_auto_analyzed",
        actor_id: userId,
        actor_name: `سَدِيد (${analysis.source})`,
        payload: {
          risk_score: analysis.risk_score,
          recommendations: analysis.recommendations,
          immediate_actions: analysis.immediate_actions,
          summary_en: analysis.summary_en,
        },
      });
      return {
        ...row,
        ai_summary: analysis.summary_ar,
        ai_risk_score: analysis.risk_score,
        aria_auto_analyzed: analysis.source === "gemini",
      };
    } catch (err) {
      console.error("[createIncident] auto-aria failed", err);
      return row;
    }
  });

const updateIncidentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.string().max(120).nullable().optional(),
  owner: z.string().max(120).nullable().optional(),
  root_cause: z.string().max(2000).nullable().optional(),
});

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateIncidentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("sec_incidents")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: id,
      entity_ref: row.ref,
      event: "updated",
      actor_id: userId,
      actor_name: actorName,
      payload: patch as unknown as JsonValue,
    });
    return row;
  });

export const addCorrectiveAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        incident_id: z.string().uuid(),
        action: z.string().min(3).max(500),
        owner: z.string().max(120).optional(),
        due_at: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: cur, error: e1 } = await supabase
      .from("sec_incidents")
      .select("ref, corrective_actions")
      .eq("id", data.incident_id)
      .single();
    if (e1) throw new Error(e1.message);
    const prev = Array.isArray(cur.corrective_actions)
      ? (cur.corrective_actions as JsonValue[])
      : [];
    const next: JsonValue[] = [
      ...prev,
      {
        id: crypto.randomUUID(),
        action: data.action,
        owner: data.owner ?? actorName,
        due_at: data.due_at ?? null,
        added_by: actorName,
        added_at: new Date().toISOString(),
        done: false,
      },
    ];
    const { error: e2 } = await supabase
      .from("sec_incidents")
      .update({ corrective_actions: next as never })
      .eq("id", data.incident_id);
    if (e2) throw new Error(e2.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: cur.ref,
      event: "corrective_action_added",
      actor_id: userId,
      actor_name: actorName,
      payload: { action: data.action, owner: data.owner ?? actorName },
    });
    return { ok: true };
  });

export const escalateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ incident_id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: row, error } = await supabase
      .from("sec_incidents")
      .update({ escalated: true, priority: "critical" })
      .eq("id", data.incident_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: row.ref,
      event: "escalated",
      actor_id: userId,
      actor_name: actorName,
      payload: { reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const closeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        incident_id: z.string().uuid(),
        root_cause: z.string().min(3).max(2000),
        executive_review: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const now = new Date();
    const { data: cur, error: e1 } = await supabase
      .from("sec_incidents")
      .select("ref, reported_at")
      .eq("id", data.incident_id)
      .single();
    if (e1) throw new Error(e1.message);
    const response_minutes = Math.max(
      1,
      Math.round((now.getTime() - new Date(cur.reported_at).getTime()) / 60000),
    );
    const { error } = await supabase
      .from("sec_incidents")
      .update({
        status: "closed",
        resolved_at: now.toISOString(),
        response_minutes,
        root_cause: data.root_cause,
      })
      .eq("id", data.incident_id);
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: cur.ref,
      event: "closed",
      actor_id: userId,
      actor_name: actorName,
      payload: {
        root_cause: data.root_cause,
        executive_review: data.executive_review ?? null,
        response_minutes,
      },
    });
    return { ok: true, response_minutes };
  });

// ============================================================================
// WORK ORDERS
// ============================================================================

const FAULT_TYPE_KEYS = [
  "electrical",
  "hvac",
  "plumbing",
  "civil",
  "cctv",
  "access_control",
  "gates_barriers",
  "fire_alarm",
  "lighting",
  "network",
  "other",
] as const;

const createWorkOrderSchema = z.object({
  title_ar: z.string().min(3).max(200),
  title_en: z.string().max(200).optional().default(""),
  kind: z.enum(["preventive", "corrective"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  // ٢٠٢٦/٠٩/١٣ — «نوع العطل» حلّ محلّ «الأصل» في نافذة الإنشاء. المفتاح
  // إنجليزيّ ومقيَّد بالقائمة نفسها التي يقيّدها `check` في القاعدة.
  fault_type: z.enum(FAULT_TYPE_KEYS),
  // الأصل لم يعد يُلتقط من النافذة، ويبقى اختياريًّا للمنشئين الآخرين
  // (مثل «تحويل بلاغ إلى أمر عمل» الذي يمرّر incident_response).
  asset_kind: z.string().min(2).max(80).optional(),
  asset_code: z.string().max(80).optional(),
  assignee_team: z.string().min(2).max(120),
  contractor_name: z.string().min(2).max(120),
  // العمودان القديمان يبقيان لمنشئٍ آخر: «إنشاء أمر عمل من البلاغ» يمرّر
  // مالك البلاغ في `assigned_to`. نافذة الإنشاء لم تعد تلتقطهما.
  assigned_to: z.string().max(120).optional(),
  contractor: z.string().max(120).optional(),
  due_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  decision: z.enum(["none", "approve", "return"]).default("none"),
  source_incident_id: z.string().uuid().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  building_id: z.string().uuid().nullable().optional(),
});

/** الدور الوحيد الذي يملك الاعتماد أو الإرجاع (أمر المالك ٢٠٢٦/٠٩/١٣). */
const APPROVER_ROLE = "work_order_approver";

/**
 * هل يملك صاحب الجلسة الاعتماد؟ — تُقرأ من `has_role` على **جدول الأدوار
 * المنفصل**، لا من `profiles` القابل لتعديل المستخدم (منع تصعيد صلاحية).
 */
async function canApprove(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    // **الترحيل مُطبَّق على الإنتاج (٢٠٢٦/٠٩/١٣، بيد المالك)** والقيمة
    // قائمة في تعداد `app_role` — أكّدته لصقة التحقّق. والقالب باقٍ لأن
    // `integrations/supabase/types.ts` **لم يُعَد توليده** بعد التطبيق:
    // التوليد يحتاج صلاحيةً على مشروع `jhutlofapjfjjeajawie` لا تملكها
    // هذه الجلسة. يسقط القالب من نفسه متى أُعيد التوليد.
    _role: APPROVER_ROLE as Database["public"]["Enums"]["app_role"],
  });
  return data === true;
}

/**
 * صلاحية الاعتماد لواجهة المستخدم — **المصدر نفسه الذي يحرس الكتابة**.
 *
 * الواجهة لا تحتفظ بحالة صلاحية محلية: تسأل هذه النقطة، وهي تسأل
 * `has_role` كما يسألها فرضُ الكتابة أدناه وtrigger القاعدة. مصدرٌ ثالث
 * يعني يومًا يفترقون فيه، فيظهر الزرّ لمن تردّه القاعدة أو العكس.
 */
export const getWorkOrderPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return { canApproveWorkOrders: await canApprove(supabase, userId) };
  });

export const createWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createWorkOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";

    // ── فرض الصلاحية على الخادم، فوق حاجز القاعدة لا بدلًا منه ────────────
    // القاعدة تحرسها بـ`enforce_work_order_approval`، لكن ذلك الترحيل لم
    // يُطبَّق بعد (المشروع موقوف — أُبلغ المالك). فبغير هذا الشرط يبقى
    // المسار مكشوفًا حتى يُشغَّل الحاجز. وحين يُشغَّل يبقى الشرطان معًا:
    // الخادم يردّ برسالة، والقاعدة تردّ من لا يمرّ بالخادم أصلًا.
    if (data.decision !== "none" && !(await canApprove(supabase, userId))) {
      throw new Error("not_authorized_to_approve");
    }
    const status =
      data.decision === "approve" ? "approved" : data.decision === "return" ? "returned" : "open";
    const decidedAt = data.decision === "none" ? null : new Date().toISOString();

    const ref = genRef("WO");
    const { data: row, error } = await supabase
      .from("sec_work_orders")
      .insert({
        ref,
        title_ar: data.title_ar,
        title_en: data.title_en || data.title_ar,
        kind: data.kind,
        priority: data.priority,
        status,
        // ── قوالب ترحيل ٢٠٢٦/٠٩/١٣ — دَينُ توليدٍ لا دَينُ ترحيل ──────────
        // **الترحيل مُطبَّق على الإنتاج** (بيد المالك ٢٠٢٦/٠٩/١٣): الأعمدة
        // الأربعة قائمة و`asset_kind` صار يقبل NULL — أكّدته لصقة التحقّق
        // (‏`4 · YES · 1 · 1`). فالإنشاء المصادَق لم يعد معلَّقًا عليه.
        //
        // والقوالب باقية لأن `integrations/supabase/types.ts` **لم يُعَد
        // توليده**: التوليد يقرأ المخطط الحيّ ويحتاج صلاحيةً على مشروع
        // `jhutlofapjfjjeajawie` لا تملكها هذه الجلسة. فهي اليوم تُخفي
        // **تأخّرَ ملفّ أنواع** لا غيابَ عمود. تسقط كلُّها من نفسها متى
        // أُعيد التوليد، وبقاؤها بعدها خطأ يلتقطه المراجع لا المصرّف.
        fault_type: data.fault_type as never,
        asset_kind: (data.asset_kind ?? null) as unknown as string,
        asset_code: data.asset_code ?? null,
        assignee_team: data.assignee_team as never,
        contractor_name: data.contractor_name as never,
        assigned_to: data.assigned_to ?? null,
        contractor: data.contractor ?? null,
        return_reason: (data.decision === "return" ? (data.notes ?? null) : null) as never,
        approved_by: decidedAt ? userId : null,
        approved_at: decidedAt,
        due_at: data.due_at ?? null,
        notes: data.notes ?? null,
        opened_at: new Date().toISOString(),
        source_incident_id: data.source_incident_id ?? null,
        site_id: data.site_id ?? null,
        building_id: data.building_id ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "work_order",
      entity_id: row.id,
      entity_ref: ref,
      event: "created",
      actor_id: userId,
      actor_name: actorName,
      payload: {
        kind: data.kind,
        priority: data.priority,
        fault_type: data.fault_type,
        decision: data.decision,
        source_incident_id: data.source_incident_id ?? null,
      },
    });
    return row;
  });

/**
 * اعتماد أمر عملٍ قائم — **كان معطوبًا عطلين، أحدهما يُخفي الآخر.**
 *
 * ① كان يكتب `in_progress` بشُرطةٍ سفلية، و`sec_work_orders_status_chk`
 * يقبل `in-progress` بشَرطة. فكل نداءٍ يُردّ من القاعدة بانتهاك قيد —
 * أي أن زرّ الاعتماد **لم يعمل قطّ**. وهذا هو العطل الظاهر.
 *
 * ② والأخطر ما كان يستره: `in-progress` ليست حالة اعتماد أصلًا. وترحيل
 * ٢٠٢٦/٠٩/١٣ أضاف `approved` و`returned` **وحدهما** إلى نطاق
 * `enforce_work_order_approval`. فلو صُحِّحت الشُرطة وحدها لمرّ الاعتماد
 * بحالةٍ لا يحرسها الـtrigger — أي **اعتمادٌ بلا حاجز**، من أي حساب
 * مصادَق. تصحيحُ الحرف كان سيحوّل عطلًا صاخبًا إلى ثغرةٍ صامتة.
 *
 * فالحالة المكتوبة `approved`، ويعود المسار تحت الحاجز الذي وُضع له.
 *
 * وشرط `canApprove` فوق الـtrigger لا بدلًا منه: القاعدة تردّ من يستدعي
 * PostgREST مباشرةً، والخادم يردّ برسالةٍ مفهومة بدل استثناء قاعدة خام.
 * وهو نفس الترتيب المطبَّق في `createWorkOrder` — مصدرٌ واحد لا ثالث.
 */
export const approveWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ work_order_id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    if (!(await canApprove(supabase, userId))) {
      throw new Error("not_authorized_to_approve");
    }
    const { data: row, error } = await supabase
      .from("sec_work_orders")
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.work_order_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "work_order",
      entity_id: data.work_order_id,
      entity_ref: row.ref,
      event: "approved",
      actor_id: userId,
      actor_name: actorName,
      payload: { note: data.note ?? null },
    });
    return { ok: true };
  });

export const completeWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        work_order_id: z.string().uuid(),
        completion_notes: z.string().min(3).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("sec_work_orders")
      .update({ status: "closed", closed_at: now, completion_notes: data.completion_notes })
      .eq("id", data.work_order_id)
      .select("ref, source_incident_id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "work_order",
      entity_id: data.work_order_id,
      entity_ref: row.ref,
      event: "completed",
      actor_id: userId,
      actor_name: actorName,
      payload: { completion_notes: data.completion_notes },
    });
    // If sourced from an incident, mark it contained
    if (row.source_incident_id) {
      await supabase
        .from("sec_incidents")
        .update({ status: "contained" })
        .eq("id", row.source_incident_id);
      await supabase.from("sec_activity_events").insert({
        entity_type: "incident",
        entity_id: row.source_incident_id,
        entity_ref: null,
        event: "auto_contained_by_work_order",
        actor_id: userId,
        actor_name: "سَدِيد — سير العمل",
        payload: { work_order_ref: row.ref },
      });
    }
    return { ok: true };
  });

// ============================================================================
// PERMITS
// ============================================================================

const createPermitSchema = z.object({
  work_type: z.string().min(2).max(80),
  contractor: z.string().min(2).max(160),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  starts_at: z.string(),
  ends_at: z.string(),
  site_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const createPermit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPermitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const ref = genRef("PTW");
    const { data: row, error } = await supabase
      .from("sec_permits")
      .insert({
        ref,
        work_type: data.work_type,
        contractor: data.contractor,
        risk_level: data.risk_level,
        status: "pending",
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        site_id: data.site_id ?? null,
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "permit",
      entity_id: row.id,
      entity_ref: ref,
      event: "submitted",
      actor_id: userId,
      actor_name: actorName,
      payload: { work_type: data.work_type, risk_level: data.risk_level },
    });
    return row;
  });

export const approvePermit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ permit_id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: row, error } = await supabase
      .from("sec_permits")
      .update({
        status: "approved",
        approver: actorName,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.permit_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "permit",
      entity_id: data.permit_id,
      entity_ref: row.ref,
      event: "approved",
      actor_id: userId,
      actor_name: actorName,
      payload: { note: data.note ?? null },
    });
    return { ok: true };
  });

export const denyPermit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ permit_id: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: row, error } = await supabase
      .from("sec_permits")
      .update({
        status: "revoked",
        approver: actorName,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.permit_id)
      .select("ref")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("sec_activity_events").insert({
      entity_type: "permit",
      entity_id: data.permit_id,
      entity_ref: row.ref,
      event: "denied",
      actor_id: userId,
      actor_name: actorName,
      payload: { reason: data.reason },
    });
    return { ok: true };
  });

// ============================================================================
// ACTIVITY EVENTS — feed timeline + KPI engine

// Reports/queries moved to a focused module; re-exported so `@/lib/oms.functions`
// stays the single import surface.
export {
  getEntityTimeline,
  getRecentActivity,
  getOmsKpis,
  sadeedAnalyzeIncident,
  setExecutiveReview,
  addIncidentAttachment,
  removeIncidentAttachment,
  getIncidentAttachmentUrl,
  getIncidentDetail,
  listIncidents,
  listWorkOrders,
  listPermits,
} from "./oms.functions.reports";
