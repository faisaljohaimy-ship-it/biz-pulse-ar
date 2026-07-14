// Auto-split from oms.functions.ts — timeline, activity, KPIs, ARIA analysis,
// executive review, attachments, and list queries. Re-exported by oms.functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { JsonValue, ActivityEvent } from "./oms.shared";

// ============================================================================

export const getEntityTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
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
  .validator((d: unknown) => z.object({ incident_id: z.string().uuid() }).parse(d))
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
  .validator((d: unknown) =>
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
  .validator((d: unknown) => attachmentSchema.parse(d))
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
  .validator((d: unknown) =>
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
  .validator((d: unknown) => z.object({ storage_path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("uploads")
      .createSignedUrl(data.storage_path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const getIncidentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ incident_id: z.string().uuid() }).parse(d))
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
