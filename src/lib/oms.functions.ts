import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================================
// OMS — Operations Management System (Stage 3 Batch A)
// Incidents · Work Orders · Permits · Workflow Engine · Activity Events
// All writes scoped to authenticated users via RLS; activity events recorded
// for every action to feed the timeline and KPI engine.
// ============================================================================

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type ActivityEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_ref: string | null;
  event: string;
  actor_id: string | null;
  actor_name: string | null;
  payload: JsonValue;
  occurred_at: string;
};

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
  .inputValidator((d: unknown) => createWorkOrderSchema.parse(d))
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
  .inputValidator((d: unknown) =>
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
// ============================================================================

export const getEntityTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ entity_type: z.string(), entity_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sec_activity_events")
      .select("*")
      .eq("entity_type", data.entity_type)
      .eq("entity_id", data.entity_id)
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ActivityEvent[];
  });

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sec_activity_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityEvent[];
  });

// ============================================================================
// OMS KPI snapshot — pulls live counts
// ============================================================================

export const getOmsKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
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
    const incidents = (inc.data ?? []) as Array<{
      status: string;
      severity: string;
      response_minutes: number | null;
      reported_at: string;
      ai_risk_score: number | null;
    }>;
    const workOrders = (wo.data ?? []) as Array<{
      status: string;
      kind: string;
      due_at: string | null;
    }>;
    const permits = (perm.data ?? []) as Array<{ status: string; ends_at: string }>;
    const now = Date.now();
    const open = incidents.filter((i) => i.status !== "closed" && i.status !== "resolved");
    const critical = incidents.filter((i) => i.severity === "critical");
    const closed = incidents.filter((i) => i.response_minutes != null);
    const avgResp = closed.length
      ? Math.round(closed.reduce((s, i) => s + (i.response_minutes ?? 0), 0) / closed.length)
      : 0;
    const woOpen = workOrders.filter((w) => w.status !== "closed" && w.status !== "cancelled");
    const woOverdue = woOpen.filter((w) => w.due_at && new Date(w.due_at).getTime() < now);
    const completionPct = workOrders.length
      ? Math.round(((workOrders.length - woOpen.length) / workOrders.length) * 100)
      : 100;
    const permOpen = permits.filter(
      (p) => p.status === "approved" && new Date(p.ends_at).getTime() > now,
    );
    const permPending = permits.filter((p) => p.status === "pending");
    const avgRisk = incidents.length
      ? Math.round(incidents.reduce((s, i) => s + (i.ai_risk_score ?? 40), 0) / incidents.length)
      : 0;
    const readiness = Math.max(
      0,
      Math.min(100, 100 - critical.length * 8 - woOverdue.length * 3 - Math.max(0, avgRisk - 50)),
    );
    return {
      incidents: {
        total: incidents.length,
        open: open.length,
        critical: critical.length,
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
      activity_24h: (acts.data ?? []).length,
      executive_readiness: readiness,
    };
  });

// ============================================================================
// ARIA — operational analysis stub (calls existing AI Gateway later;
// here we return a heuristic recommendation built from incident state)
// ============================================================================

export const ariaAnalyzeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ incident_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inc, error } = await context.supabase
      .from("sec_incidents")
      .select("*")
      .eq("id", data.incident_id)
      .single();
    if (error) throw new Error(error.message);

    const { ariaAnalyseIncident } = await import("./oms-aria.server");
    const analysis = await ariaAnalyseIncident({
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
        aria_auto_analyzed: analysis.source === "gpt-5",
      })
      .eq("id", data.incident_id);

    await context.supabase.from("sec_activity_events").insert({
      entity_type: "incident",
      entity_id: data.incident_id,
      entity_ref: inc.ref,
      event: "aria_analyzed",
      actor_id: context.userId,
      actor_name: `ARIA (${analysis.source})`,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ incident_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inc, error } = await context.supabase
      .from("sec_incidents")
      .select("*")
      .eq("id", data.incident_id)
      .single();
    if (error) throw new Error(error.message);
    return inc;
  });

// ============================================================================
// LIST QUERIES — fresh reads with operational fields
// ============================================================================

export const listIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sec_incidents")
      .select("*")
      .order("reported_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listWorkOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sec_work_orders")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPermits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sec_permits")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
