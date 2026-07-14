import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================================
// OMS — Operations Management System (Stage 3 Batch A)
// Incidents · Work Orders · Permits · Workflow Engine · Activity Events
// All writes scoped to authenticated users via RLS; activity events recorded
// for every action to feed the timeline and KPI engine.
// ============================================================================

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
  .validator((d: unknown) => createIncidentSchema.parse(d))
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

    // ── Auto ARIA analysis (gpt-5 with timeout + heuristic fallback) ──
    try {
      const { ariaAnalyseIncident } = await import("./oms-aria.server");
      const analysis = await ariaAnalyseIncident({
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
          aria_auto_analyzed: analysis.source === "gpt-5",
        })
        .eq("id", row.id);
      await supabase.from("sec_activity_events").insert({
        entity_type: "incident",
        entity_id: row.id,
        entity_ref: ref,
        event: "aria_auto_analyzed",
        actor_id: userId,
        actor_name: `ARIA (${analysis.source})`,
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
        aria_auto_analyzed: analysis.source === "gpt-5",
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
  .validator((d: unknown) => updateIncidentSchema.parse(d))
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
  .validator((d: unknown) =>
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
  .validator((d: unknown) =>
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
  .validator((d: unknown) =>
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

const createWorkOrderSchema = z.object({
  title_ar: z.string().min(3).max(200),
  title_en: z.string().max(200).optional().default(""),
  kind: z.enum(["preventive", "corrective"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_kind: z.string().min(2).max(80),
  asset_code: z.string().max(80).optional(),
  assigned_to: z.string().max(120).optional(),
  contractor: z.string().max(120).optional(),
  due_at: z.string().optional(),
  notes: z.string().max(2000).optional(),
  source_incident_id: z.string().uuid().nullable().optional(),
  site_id: z.string().uuid().nullable().optional(),
  building_id: z.string().uuid().nullable().optional(),
});

export const createWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createWorkOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const ref = genRef("WO");
    const { data: row, error } = await supabase
      .from("sec_work_orders")
      .insert({
        ref,
        title_ar: data.title_ar,
        title_en: data.title_en || data.title_ar,
        kind: data.kind,
        priority: data.priority,
        status: "open",
        asset_kind: data.asset_kind,
        asset_code: data.asset_code ?? null,
        assigned_to: data.assigned_to ?? null,
        contractor: data.contractor ?? null,
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
        source_incident_id: data.source_incident_id ?? null,
      },
    });
    return row;
  });

export const approveWorkOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ work_order_id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const actorName =
      (claims?.user_metadata as { name?: string } | undefined)?.name ?? claims?.email ?? "مستخدم";
    const { data: row, error } = await supabase
      .from("sec_work_orders")
      .update({
        status: "in_progress",
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
  .validator((d: unknown) =>
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
        actor_name: "ARIA Workflow",
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
  .validator((d: unknown) => createPermitSchema.parse(d))
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
  .validator((d: unknown) =>
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
  .validator((d: unknown) =>
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
  ariaAnalyzeIncident,
  setExecutiveReview,
  addIncidentAttachment,
  removeIncidentAttachment,
  getIncidentAttachmentUrl,
  getIncidentDetail,
  listIncidents,
  listWorkOrders,
  listPermits,
} from "./oms.functions.reports";
