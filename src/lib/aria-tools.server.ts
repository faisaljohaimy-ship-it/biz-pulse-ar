import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const GW = "https://connector-gateway.lovable.dev";

function connectorHeaders(connectionKeyEnv: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env[connectionKeyEnv];
  if (!lovableKey || !connKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

function genRef(prefix: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function scoreRisk(severity: string, priority: string, category: string): number {
  const sevMap: Record<string, number> = { low: 20, medium: 45, high: 70, critical: 90 };
  const prioMap: Record<string, number> = { low: 0, medium: 5, high: 10, critical: 15 };
  const catBoost = ["intrusion", "fire", "explosion", "weapon"].some((k) => category.toLowerCase().includes(k)) ? 10 : 0;
  return Math.min(100, (sevMap[severity] ?? 40) + (prioMap[priority] ?? 5) + catBoost);
}

async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  entity_type: string,
  entity_id: string,
  entity_ref: string | null,
  event: string,
  payload: Record<string, unknown> = {},
) {
  await supabase.from("sec_activity_events").insert({
    entity_type, entity_id, entity_ref, event,
    actor_id: userId, actor_name: "ARIA", payload,
  });
}

/**
 * Build the ARIA executive toolbelt. All tools are RLS-scoped via the
 * request supabase client and gated by connector availability.
 */
export function buildAriaTools(supabase: SupabaseClient, userId: string) {
  return {
    create_task: tool({
      description:
        "Create an executive task in NEXUS for the current user. Use when the user asks to add a to-do, assign work, or schedule a deliverable.",
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(2000).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        assigned_agent: z.string().max(80).optional(),
        due_at: z.string().datetime().optional().describe("ISO 8601 due date"),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            priority: args.priority,
            assigned_agent: args.assigned_agent ?? null,
            due_at: args.due_at ?? null,
            status: "todo",
          })
          .select("id,title,priority,due_at")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, task: data };
      },
    }),

    query_kpis: tool({
      description:
        "Query live enterprise KPIs (value, target, trend, status). Optional name filter (partial match).",
      inputSchema: z.object({
        name_contains: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      execute: async (args) => {
        let q = supabase
          .from("pulse_kpis")
          .select("name,value,target,unit,trend,status,domain")
          .limit(args.limit);
        if (args.name_contains) q = q.ilike("name", `%${args.name_contains}%`);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, kpis: data ?? [] };
      },
    }),

    list_open_crises: tool({
      description: "List currently open crises with severity and owner.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(8) }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("pulse_crises")
          .select("id,title,severity,owner,impact,status")
          .eq("status", "open")
          .limit(args.limit);
        if (error) return { ok: false, error: error.message };
        return { ok: true, crises: data ?? [] };
      },
    }),

    send_executive_email: tool({
      description:
        "Send an HTML executive briefing email via Microsoft Outlook on behalf of the workspace.",
      inputSchema: z.object({
        to: z.string().email(),
        cc: z.string().email().optional(),
        subject: z.string().min(2).max(300),
        html: z.string().min(5).max(120000),
      }),
      execute: async (args) => {
        const headers = connectorHeaders("MICROSOFT_OUTLOOK_API_KEY");
        if (!headers) return { ok: false, error: "Outlook connector not configured" };
        const message: Record<string, unknown> = {
          subject: args.subject,
          body: { contentType: "HTML", content: args.html },
          toRecipients: [{ emailAddress: { address: args.to } }],
        };
        if (args.cc) message.ccRecipients = [{ emailAddress: { address: args.cc } }];
        try {
          const { httpJson } = await import("@/lib/api/http.server");
          await httpJson(`${GW}/microsoft_outlook/me/sendMail`, {
            method: "POST",
            headers,
            body: JSON.stringify({ message, saveToSentItems: true }),
            label: "aria-tools outlook sendMail",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { ok: false, error: `Outlook send failed: ${msg.slice(0, 240)}` };
        }
        return { ok: true, sentAt: new Date().toISOString() };
      },
    }),

    record_executive_decision: tool({
      description:
        "Record an executive decision / commitment / milestone in the pulse memory so it is tracked.",
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        kind: z.enum(["decision", "commitment", "milestone", "risk", "opportunity"]),
        owner: z.string().max(120).default(""),
        department: z.string().max(120).default(""),
        impact: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        due_at: z.string().datetime().optional(),
      }),
      execute: async (args) => {
        const key = `aria-${Date.now().toString(36)}`;
        const { data, error } = await supabase
          .from("pulse_memory")
          .insert({
            user_id: userId,
            key,
            kind: args.kind,
            title: args.title,
            title_en: args.title,
            owner: args.owner,
            department: args.department,
            impact: args.impact,
            due_at: args.due_at ?? null,
            source: "ARIA",
            source_en: "ARIA",
            status: "open",
          })
          .select("id,key,title,kind,impact")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, memory: data };
      },
    }),

    query_tasks: tool({
      description:
        "List the current user's tasks. Filter by status and/or priority. Use when the user asks about their tasks, to-do list, deliverables, pending work, مهامي, قائمة المهام.",
      inputSchema: z.object({
        status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("tasks")
          .select("id,title,status,priority,assigned_agent,due_at,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.priority) q = q.eq("priority", args.priority);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, tasks: data ?? [], count: data?.length ?? 0 };
      },
    }),

    update_task_status: tool({
      description:
        "Update the status of an existing task. Use when the user says 'mark X as done', 'أنهي مهمة', 'علّم كمكتمل', 'block task'.",
      inputSchema: z.object({
        task_id: z.string().uuid(),
        status: z.enum(["todo", "in_progress", "done", "blocked"]),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("tasks")
          .update({ status: args.status })
          .eq("id", args.task_id)
          .eq("user_id", userId)
          .select("id,title,status")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, task: data };
      },
    }),

    search_knowledge: tool({
      description:
        "Search the executive knowledge base (policies, briefings, documents). Use when the user asks 'what does our policy say about X', 'ابحث عن', 'ما السياسة في'.",
      inputSchema: z.object({
        query: z.string().min(2).max(200),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("knowledge_docs")
          .select("id,title,summary")
          .or(`title.ilike.%${args.query}%,summary.ilike.%${args.query}%`)
          .limit(args.limit);
        if (error) return { ok: false, error: error.message };
        return { ok: true, results: data ?? [], count: data?.length ?? 0 };
      },
    }),

    create_intelligence_alert: tool({
      description:
        "Raise an intelligence alert (risk signal, market event, operational anomaly) so it appears on the Intelligence dashboard. Use when the user reports a new risk/threat/signal to track.",
      inputSchema: z.object({
        title: z.string().min(3).max(200),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        owner: z.string().max(120).optional(),
        business_impact_score: z.number().int().min(0).max(100).default(50),
        summary: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("intelligence_alerts")
          .insert({
            user_id: userId,
            title: args.title,
            severity: args.severity,
            owner: args.owner ?? null,
            business_impact_score: args.business_impact_score,
            detail: args.summary ?? null,
            source: "ARIA",
          })
          .select("id,title,severity,business_impact_score")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, alert: data };
      },
    }),

    // ====================================================================
    // INDUSTRIAL SECURITY — OMS TOOLS
    // ====================================================================

    sec_create_incident: tool({
      description:
        "Create a new security incident (بلاغ/حادثة). Use ALWAYS when user reports an incident, intrusion, fire, leak, breach, تسرّب, اختراق, حريق, بلاغ, حادث.",
      inputSchema: z.object({
        category: z.string().min(2).max(80).describe("intrusion|fire|leak|access|theft|safety|other"),
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        owner: z.string().max(120).optional(),
        assigned_to: z.string().max(120).optional(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const ref = genRef("INC");
        const ai_risk_score = scoreRisk(args.severity, args.priority, args.category);
        const { data, error } = await supabase.from("sec_incidents").insert({
          ref, category: args.category,
          title_ar: args.title_ar,
          title_en: args.title_en || args.title_ar,
          severity: args.severity, priority: args.priority, status: "open",
          owner: args.owner ?? null, assigned_to: args.assigned_to ?? null,
          reported_at: new Date().toISOString(), ai_risk_score, created_by: userId,
        }).select("id,ref,title_ar,severity,priority,ai_risk_score,status").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "incident", data.id, data.ref, "registered",
          { severity: args.severity, priority: args.priority, ai_risk_score, notes: args.notes ?? null });
        return { ok: true, incident: data };
      },
    }),

    sec_update_incident: tool({
      description: "Update incident status/priority/assignee/root cause. Status: open|investigating|contained|resolved|closed.",
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assigned_to: z.string().max(120).optional(),
        root_cause: z.string().max(2000).optional(),
      }),
      execute: async ({ id, ...patch }) => {
        const { data, error } = await supabase.from("sec_incidents").update(patch).eq("id", id)
          .select("id,ref,status,priority").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "incident", id, data.ref, "updated", patch);
        return { ok: true, incident: data };
      },
    }),

    sec_list_incidents: tool({
      description: "List recent security incidents. Filter by status/severity.",
      inputSchema: z.object({
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_incidents")
          .select("id,ref,title_ar,category,severity,priority,status,ai_risk_score,reported_at,assigned_to")
          .order("reported_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.severity) q = q.eq("severity", args.severity);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, incidents: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_create_work_order: tool({
      description: "Create a maintenance work order (أمر عمل). preventive or corrective. Optionally link to a source incident.",
      inputSchema: z.object({
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        kind: z.enum(["preventive", "corrective"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        asset_kind: z.string().min(2).max(80).describe("camera|gate|sensor|access|fence|fire-system|other"),
        asset_code: z.string().max(80).optional(),
        assigned_to: z.string().max(120).optional(),
        contractor: z.string().max(120).optional(),
        due_at: z.string().optional(),
        source_incident_id: z.string().uuid().optional(),
      }),
      execute: async (args) => {
        const ref = genRef("WO");
        const { data, error } = await supabase.from("sec_work_orders").insert({
          ref, title_ar: args.title_ar, title_en: args.title_en || args.title_ar,
          kind: args.kind, priority: args.priority, status: "open",
          asset_kind: args.asset_kind, asset_code: args.asset_code ?? null,
          assigned_to: args.assigned_to ?? null, contractor: args.contractor ?? null,
          due_at: args.due_at ?? null, opened_at: new Date().toISOString(),
          source_incident_id: args.source_incident_id ?? null, created_by: userId,
        }).select("id,ref,title_ar,kind,priority,status,due_at").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "work_order", data.id, data.ref, "created",
          { kind: args.kind, priority: args.priority, source_incident_id: args.source_incident_id ?? null });
        return { ok: true, work_order: data };
      },
    }),

    sec_close_work_order: tool({
      description: "Close/complete a work order with completion notes. Auto-contains the source incident if linked.",
      inputSchema: z.object({
        id: z.string().uuid(),
        completion_notes: z.string().min(3).max(2000),
      }),
      execute: async ({ id, completion_notes }) => {
        const { data, error } = await supabase.from("sec_work_orders")
          .update({ status: "closed", closed_at: new Date().toISOString(), completion_notes })
          .eq("id", id).select("ref,source_incident_id").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "work_order", id, data.ref, "completed", { completion_notes });
        if (data.source_incident_id) {
          await supabase.from("sec_incidents").update({ status: "contained" }).eq("id", data.source_incident_id);
          await logEvent(supabase, userId, "incident", data.source_incident_id, null, "auto_contained_by_work_order", { work_order_ref: data.ref });
        }
        return { ok: true, ref: data.ref };
      },
    }),

    sec_list_work_orders: tool({
      description: "List work orders. Filter by status/kind/priority.",
      inputSchema: z.object({
        status: z.enum(["open", "assigned", "in-progress", "on-hold", "closed", "cancelled"]).optional(),
        kind: z.enum(["preventive", "corrective"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_work_orders")
          .select("id,ref,title_ar,kind,priority,status,asset_kind,assigned_to,due_at,opened_at")
          .order("opened_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.kind) q = q.eq("kind", args.kind);
        if (args.priority) q = q.eq("priority", args.priority);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, work_orders: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_create_permit: tool({
      description: "Create a Permit-To-Work (تصريح عمل) for a contractor.",
      inputSchema: z.object({
        work_type: z.string().min(2).max(80).describe("hot-work|confined-space|electrical|height|excavation|general"),
        contractor: z.string().min(2).max(160),
        risk_level: z.enum(["low", "medium", "high", "critical"]),
        starts_at: z.string(),
        ends_at: z.string(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const ref = genRef("PTW");
        const { data, error } = await supabase.from("sec_permits").insert({
          ref, work_type: args.work_type, contractor: args.contractor,
          risk_level: args.risk_level, status: "pending",
          starts_at: args.starts_at, ends_at: args.ends_at,
          notes: args.notes ?? null,
        }).select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "permit", data.id, data.ref, "created", { risk_level: args.risk_level });
        return { ok: true, permit: data };
      },
    }),

    sec_decide_permit: tool({
      description: "Approve or reject a pending permit-to-work.",
      inputSchema: z.object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      }),
      execute: async ({ id, decision, note }) => {
        const { data, error } = await supabase.from("sec_permits")
          .update({ status: decision }).eq("id", id).select("ref").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "permit", id, data.ref, decision, { note: note ?? null });
        return { ok: true, ref: data.ref, decision };
      },
    }),

    sec_list_permits: tool({
      description: "List permits-to-work. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["pending", "approved", "rejected", "active", "expired", "closed"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_permits")
          .select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at")
          .order("starts_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, permits: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_schedule_patrol: tool({
      description: "Schedule a security patrol round (دورية). Provide team, route, and number of checkpoints.",
      inputSchema: z.object({
        team: z.string().min(2).max(120),
        route: z.string().min(2).max(200),
        checkpoints_total: z.number().int().min(1).max(100).default(10),
      }),
      execute: async (args) => {
        const ref = genRef("PT");
        const { data, error } = await supabase.from("sec_patrols").insert({
          ref, team: args.team, route: args.route,
          checkpoints_total: args.checkpoints_total, checkpoints_done: 0,
          status: "scheduled",
        }).select("id,ref,team,route,status,checkpoints_total").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "patrol", data.id, data.ref, "scheduled", { team: args.team, route: args.route });
        return { ok: true, patrol: data };
      },
    }),

    sec_list_patrols: tool({
      description: "List patrol rounds. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["scheduled", "active", "completed", "missed"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_patrols")
          .select("id,ref,team,route,status,checkpoints_total,checkpoints_done,started_at,ended_at")
          .order("created_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, patrols: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_register_visitor: tool({
      description: "Register a visitor (زائر) checking into a site. Issues a badge ref.",
      inputSchema: z.object({
        full_name: z.string().min(2).max(160),
        host: z.string().min(2).max(160),
        organization: z.string().max(160).optional(),
        purpose: z.string().max(300).optional(),
        badge_no: z.string().max(40).optional(),
      }),
      execute: async (args) => {
        const ref = genRef("V");
        const { data, error } = await supabase.from("sec_visitors").insert({
          ref, full_name: args.full_name, host: args.host,
          organization: args.organization ?? null, purpose: args.purpose ?? null,
          badge_no: args.badge_no ?? ref, status: "inside",
          check_in_at: new Date().toISOString(),
        }).select("id,ref,full_name,host,badge_no,status").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "visitor", data.id, data.ref, "checked_in", { host: args.host });
        return { ok: true, visitor: data };
      },
    }),

    sec_checkout_visitor: tool({
      description: "Check out a visitor by id. Marks status=left and sets check_out_at.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await supabase.from("sec_visitors")
          .update({ status: "left", check_out_at: new Date().toISOString() })
          .eq("id", id).select("ref,full_name").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "visitor", id, data.ref, "checked_out", {});
        return { ok: true, ref: data.ref };
      },
    }),

    sec_list_visitors: tool({
      description: "List recent visitors. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["expected", "inside", "left", "overdue"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_visitors")
          .select("id,ref,full_name,organization,host,status,check_in_at,check_out_at")
          .order("check_in_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, visitors: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_list_cctv_alerts: tool({
      description: "List CCTV / AI camera alerts. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["new", "triaged", "dispatched", "resolved", "false_positive"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = supabase.from("sec_cctv_alerts")
          .select("id,ref,camera_code,alert_type,confidence,status,detected_at,notes")
          .order("detected_at", { ascending: false }).limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, alerts: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_triage_cctv_alert: tool({
      description: "Triage a CCTV alert: set status to triaged/dispatched/resolved/false_positive with notes.",
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["triaged", "dispatched", "resolved", "false_positive"]),
        notes: z.string().max(1000).optional(),
        acknowledged_by: z.string().max(160).optional(),
      }),
      execute: async ({ id, status, notes, acknowledged_by }) => {
        const { data, error } = await supabase.from("sec_cctv_alerts")
          .update({ status, notes: notes ?? null, acknowledged_by: acknowledged_by ?? "ARIA" })
          .eq("id", id).select("ref,camera_code").single();
        if (error) return { ok: false, error: error.message };
        await logEvent(supabase, userId, "cctv_alert", id, data.ref, status, { notes: notes ?? null });
        return { ok: true, ref: data.ref };
      },
    }),

    sec_navigate: tool({
      description:
        "Navigate the user to a specific page in NEXUS. Use when user says 'open X', 'go to', 'افتح', 'انتقل'. Returns a target route the UI will navigate to.",
      inputSchema: z.object({
        target: z.enum([
          "/dashboard", "/sec", "/sec/exec", "/sec/twin", "/sec/incidents",
          "/sec/maintenance", "/sec/permits", "/sec/patrols", "/sec/visitors",
          "/sec/cctv", "/sec/kpi", "/sec/ai", "/sec/projects", "/sec/risks",
          "/sec/circles", "/sec/sections", "/tasks", "/intelligence",
          "/executive", "/executive-reports", "/briefing", "/integrations",
        ]),
        reason: z.string().max(200).optional(),
      }),
      execute: async ({ target, reason }) => ({ ok: true, navigate_to: target, reason: reason ?? null }),
    }),
  };
}

export type AriaToolset = ReturnType<typeof buildAriaTools>;
