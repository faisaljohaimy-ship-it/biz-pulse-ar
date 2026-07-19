import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
import {
  prepareAriaOutboundMessage,
  sendAriaOutboundMessageDirectInternal,
  ariaAutoApproveEnabled,
} from "@/lib/aria/outbound-messaging.server";
import {
  resolveOwnerEmail,
  resolveOwnerSms,
  isOwnerEmail,
  isOwnerSms,
  hasExplicitOutboundIntent,
} from "@/lib/aria/outbound-recipient-policy.server";

function genRef(prefix: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function scoreRisk(severity: string, priority: string, category: string): number {
  const sevMap: Record<string, number> = {
    low: 20,
    medium: 45,
    high: 70,
    critical: 90,
  };
  const prioMap: Record<string, number> = {
    low: 0,
    medium: 5,
    high: 10,
    critical: 15,
  };
  const catBoost = ["intrusion", "fire", "explosion", "weapon"].some((k) =>
    category.toLowerCase().includes(k),
  )
    ? 10
    : 0;
  return Math.min(100, (sevMap[severity] ?? 40) + (prioMap[priority] ?? 5) + catBoost);
}

async function getActorOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  void supabase;
  const { getCurrentOrgIdForUser } = await import("@/lib/authz.server");
  return getCurrentOrgIdForUser(userId);
}

type AuditResult = { ok: true } | { ok: false; error: string };

async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  entity_type: string,
  entity_id: string,
  entity_ref: string | null,
  event: string,
  payload: Record<string, unknown> = {},
): Promise<AuditResult> {
  const org_id = await getActorOrgId(supabase, userId);
  if (!org_id) return { ok: false, error: "Actor is not assigned to an organization" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("sec_activity_events").insert({
    org_id,
    entity_type,
    entity_id,
    entity_ref,
    event,
    actor_id: userId,
    actor_name: "ARIA",
    payload: payload as Json,
  });
  if (error) {
    console.error("[aria-tools] security audit write failed", {
      entity_type,
      entity_id,
      event,
      error: error.message,
    });
    return { ok: false, error: `Audit write failed: ${error.message}` };
  }
  return { ok: true };
}

async function requireOperationalWriterRole(userId: string): Promise<string | null> {
  const { hasAnyPlatformRole } = await import("@/lib/authz.server");
  return (await hasAnyPlatformRole(userId, ["admin", "manager"]))
    ? null
    : "Forbidden: this industrial-security action requires admin or manager role.";
}

function safePostgrestSearchTerm(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type AriaToolRuntimeContext = {
  /** Current, authentic user turn. Never populate from RAG or tool output. */
  lastUserText?: string;
};

/**
 * Build the ARIA executive toolbelt. All tools are RLS-scoped via the
 * request supabase client and gated by connector availability.
 */
export function buildAriaTools(
  supabase: SupabaseClient,
  userId: string,
  runtime: AriaToolRuntimeContext = {},
) {
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
        "Query live enterprise KPIs (value, delta, trend, tone). Optional label filter (partial match).",
      inputSchema: z.object({
        name_contains: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      execute: async (args) => {
        let q = supabase
          .from("pulse_kpis")
          .select("key,label,label_en,value,delta,trend,tone")
          .limit(args.limit);
        if (args.name_contains) {
          const safe = safePostgrestSearchTerm(args.name_contains);
          if (safe) {
            const term = `%${safe}%`;
            q = q.or(`label.ilike.${term},label_en.ilike.${term},key.ilike.${term}`);
          }
        }
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, kpis: data ?? [] };
      },
    }),

    list_open_crises: tool({
      description: "List currently open crises with risk score and owner.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("pulse_crises")
          .select(
            "id,title,title_en,risk_score,probability,owner,impact,impact_en,action,action_en,category",
          )
          .order("risk_score", { ascending: false })
          .limit(args.limit);
        if (error) return { ok: false, error: error.message };
        return { ok: true, crises: data ?? [] };
      },
    }),

    // ── HCIS Compliance + Digital PTW (new modules) ──────────────────────
    hcis_compliance_status: tool({
      description:
        "HCIS compliance percentage — overall and per region (central/western/eastern/southern). Use for questions like 'ما نسبة امتثال المنطقة الغربية؟'.",
      inputSchema: z.object({
        region: z.enum(["central", "western", "eastern", "southern"]).optional(),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        const seeded = await db
          .from("hcis_compliance_status")
          .select("region_code,status,is_simulation");
        let source = "hcis_compliance_status";
        type HcisStatusRow = {
          region: string;
          status: string;
          isSimulation: boolean;
        };
        let rows: HcisStatusRow[] = (
          (seeded.data ?? []) as Array<{
            region_code: string;
            status: string;
            is_simulation?: boolean;
          }>
        ).map((row) => ({
          region: row.region_code,
          status: row.status,
          isSimulation: row.is_simulation === true,
        }));
        if (seeded.error) {
          const legacy = await db.from("hcis_assessments").select("region,status");
          if (legacy.error) {
            return {
              ok: false,
              error: `${seeded.error.message}; fallback failed: ${legacy.error.message}`,
            };
          }
          source = "hcis_assessments";
          rows = (legacy.data ?? []).map((row: { region: string; status: string }) => ({
            ...row,
            isSimulation: false,
          }));
        }
        const pct = (rs: Array<{ status: string }>) => {
          const scored = rs.filter(
            (r) => r.status !== "not_applicable" && r.status !== "not_assessed",
          );
          if (!scored.length) return null;
          const w = (s: string) => (s === "compliant" ? 1 : s === "partial" ? 0.5 : 0);
          return Math.round((scored.reduce((a, r) => a + w(r.status), 0) / scored.length) * 100);
        };
        const byRegion: Record<string, number | null> = {};
        for (const r of ["central", "western", "eastern", "southern"])
          byRegion[r] = pct(rows.filter((x) => x.region === r));
        const assessedCount = rows.filter(
          (row) => row.status !== "not_assessed" && row.status !== "not_applicable",
        ).length;
        return {
          ok: true,
          overallPct: pct(rows),
          byRegion: args.region ? { [args.region]: byRegion[args.region] } : byRegion,
          assessedCount,
          totalCount: rows.length,
          dataAvailable: assessedCount > 0,
          isSimulation: rows.some((row) => row.isSimulation),
          source,
        };
      },
    }),

    hcis_critical_findings: tool({
      description:
        "List critical/high-severity or overdue HCIS compliance findings (gaps) with their target dates. Use for 'ما الفجوات الحرجة المتأخرة؟'.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        const { data, error } = await db
          .from("hcis_findings")
          .select("title_ar,region,severity,status,target_date")
          .neq("status", "resolved")
          .order("target_date", { ascending: true })
          .limit(50);
        if (error) return { ok: false, error: error.message };
        const rows = (data ?? []) as Array<{
          severity: string;
          status: string;
        }>;
        const critical = rows.filter(
          (r) => r.status === "overdue" || r.severity === "critical" || r.severity === "high",
        );
        return {
          ok: true,
          findings: critical.slice(0, args.limit),
          count: critical.length,
        };
      },
    }),

    ptw_active_permits: tool({
      description:
        "List currently ACTIVE work permits (PTW), optionally filtered by region or type (hot_work, confined_space, restricted_area, excavation, lifting, electrical_isolation). Use for 'كم تصريح عمل ساخن ساري في الشرقية؟' / 'من يعمل في المنطقة المحظورة الآن؟'.",
      inputSchema: z.object({
        region: z.enum(["central", "western", "eastern", "southern"]).optional(),
        type_key: z.string().max(40).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        let q = db
          .from("permits")
          .select("ref,type_key,region,location,contractor,worker_count,ends_at,status")
          .eq("status", "active")
          .order("ends_at", { ascending: true })
          .limit(args.limit);
        if (args.region) q = q.eq("region", args.region);
        if (args.type_key) q = q.eq("type_key", args.type_key);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, permits: data ?? [], count: (data ?? []).length };
      },
    }),

    send_executive_email: tool({
      description:
        "Send an HTML executive email. Direct send is allowed only when the recipient is the registered ARIA owner AND the current user message explicitly asks to send an email; otherwise the message is routed to the reviewed approval flow so it is not silently dropped.",
      inputSchema: z.object({
        to: z.string().email().optional(),
        cc: z.string().email().optional(),
        subject: z.string().min(2).max(300),
        html: z.string().min(5).max(120000),
      }),
      execute: async (args) => {
        try {
          const intentText = runtime.lastUserText ?? "";
          const isOwner = isOwnerEmail(args.to);
          const explicit = hasExplicitOutboundIntent(intentText, "email");
          if (isOwner && explicit && ariaAutoApproveEnabled()) {
            const payload = {
              channel: "email" as const,
              ...args,
              to: resolveOwnerEmail(args.to),
            };
            return await sendAriaOutboundMessageDirectInternal({
              userId,
              payload,
              explicitIntentText: intentText,
            });
          }
          // Non-owner recipient OR non-explicit intent OR direct-send disabled
          // → route through the reviewed approval flow with the requested
          // recipient instead of failing.
          const payload = {
            channel: "email" as const,
            ...args,
            to: args.to ?? resolveOwnerEmail(undefined),
          };
          return await prepareAriaOutboundMessage(supabase, userId, payload);
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    send_executive_sms: tool({
      description:
        "Send an executive SMS/MMS. Direct send is allowed only when the recipient is the registered ARIA owner AND the current user message explicitly asks to send an SMS; otherwise the message is routed to the reviewed approval flow so it is not silently dropped.",
      inputSchema: z.object({
        to: z.string().min(8).max(24).optional().describe("Optional E.164 recipient"),
        body: z.string().min(1).max(1600),
        media_urls: z.array(z.string().url()).max(10).optional(),
      }),
      execute: async (args) => {
        try {
          const intentText = runtime.lastUserText ?? "";
          const isOwner = isOwnerSms(args.to);
          const explicit = hasExplicitOutboundIntent(intentText, "sms");
          if (isOwner && explicit && ariaAutoApproveEnabled()) {
            const payload = {
              channel: "sms" as const,
              to: resolveOwnerSms(args.to),
              body: args.body,
              mediaUrls: args.media_urls,
            };
            return await sendAriaOutboundMessageDirectInternal({
              userId,
              payload,
              explicitIntentText: intentText,
            });
          }
          const payload = {
            channel: "sms" as const,
            to: args.to ?? resolveOwnerSms(undefined),
            body: args.body,
            mediaUrls: args.media_urls,
          };
          return await prepareAriaOutboundMessage(supabase, userId, payload);
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
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
        const q = safePostgrestSearchTerm(args.query);
        if (!q) return { ok: true, results: [], count: 0 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- HCIS reference table ships in its migration
        const db = supabase as unknown as { from: (t: string) => any };
        const [general, hcis] = await Promise.all([
          supabase
            .from("knowledge_docs")
            .select("id,title,content")
            .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(args.limit),
          // NEXIOS aria_knowledge schema is (title, source, content, tags).
          db
            .from("aria_knowledge")
            .select("id,title,content,source,tags")
            .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(args.limit),
        ]);
        if (general.error && hcis.error) {
          return {
            ok: false,
            error: `Knowledge search failed: ${general.error.message}; ${hcis.error.message}`,
          };
        }
        const results = [
          ...(
            (general.data ?? []) as Array<{
              id: string;
              title: string;
              content: string;
            }>
          ).map((row) => ({ ...row, source: "knowledge_docs" })),
          ...(
            (hcis.data ?? []) as Array<{
              id: string;
              title: string;
              content: string;
              source: string;
              tags: string[];
            }>
          ).map((row) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            citation: `[KB:${row.title}]`,
            source: row.source,
            tags: row.tags,
          })),
        ].slice(0, args.limit);
        return { ok: true, results, count: results.length };
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
        category: z
          .string()
          .min(2)
          .max(80)
          .describe("intrusion|fire|leak|access|theft|safety|other"),
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        owner: z.string().max(120).optional(),
        assigned_to: z.string().max(120).optional(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const ref = genRef("INC");
        const ai_risk_score = scoreRisk(args.severity, args.priority, args.category);
        const { data, error } = await supabase
          .from("sec_incidents")
          .insert({
            ref,
            org_id,
            category: args.category,
            title_ar: args.title_ar,
            title_en: args.title_en || args.title_ar,
            severity: args.severity,
            priority: args.priority,
            status: "open",
            owner: args.owner ?? null,
            assigned_to: args.assigned_to ?? null,
            reported_at: new Date().toISOString(),
            ai_risk_score,
            created_by: userId,
          })
          .select("id,ref,title_ar,severity,priority,ai_risk_score,status")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(
          supabase,
          userId,
          "incident",
          data.id,
          data.ref,
          "registered",
          {
            severity: args.severity,
            priority: args.priority,
            ai_risk_score,
            notes: args.notes ?? null,
          },
        );
        return { ok: true, incident: data, audit };
      },
    }),

    sec_update_incident: tool({
      description:
        "Update incident status/priority/assignee/root cause. Status: open|investigating|contained|resolved|closed.",
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assigned_to: z.string().max(120).optional(),
        root_cause: z.string().max(2000).optional(),
      }),
      execute: async ({ id, ...patch }) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const { data, error } = await supabase
          .from("sec_incidents")
          .update(patch)
          .eq("id", id)
          .select("id,ref,status,priority")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "incident", id, data.ref, "updated", patch);
        return { ok: true, incident: data, audit };
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
        let q = supabase
          .from("sec_incidents")
          .select(
            "id,ref,title_ar,category,severity,priority,status,ai_risk_score,reported_at,assigned_to",
          )
          .order("reported_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.severity) q = q.eq("severity", args.severity);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, incidents: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_create_work_order: tool({
      description:
        "Create a maintenance work order (أمر عمل). preventive or corrective. Optionally link to a source incident.",
      inputSchema: z.object({
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        kind: z.enum(["preventive", "corrective"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        asset_kind: z
          .string()
          .min(2)
          .max(80)
          .describe("camera|gate|sensor|access|fence|fire-system|other"),
        asset_code: z.string().max(80).optional(),
        assigned_to: z.string().max(120).optional(),
        contractor: z.string().max(120).optional(),
        due_at: z.string().datetime().optional(),
        source_incident_id: z.string().uuid().optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const ref = genRef("WO");
        const { data, error } = await supabase
          .from("sec_work_orders")
          .insert({
            ref,
            org_id,
            title_ar: args.title_ar,
            title_en: args.title_en || args.title_ar,
            kind: args.kind,
            priority: args.priority,
            status: "open",
            asset_kind: args.asset_kind,
            asset_code: args.asset_code ?? null,
            assigned_to: args.assigned_to ?? null,
            contractor: args.contractor ?? null,
            due_at: args.due_at ?? null,
            opened_at: new Date().toISOString(),
            source_incident_id: args.source_incident_id ?? null,
            created_by: userId,
          })
          .select("id,ref,title_ar,kind,priority,status,due_at")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "work_order", data.id, data.ref, "created", {
          kind: args.kind,
          priority: args.priority,
          source_incident_id: args.source_incident_id ?? null,
        });
        return { ok: true, work_order: data, audit };
      },
    }),

    sec_close_work_order: tool({
      description:
        "Close/complete a work order with completion notes. Auto-contains the source incident if linked.",
      inputSchema: z.object({
        id: z.string().uuid(),
        completion_notes: z.string().min(3).max(2000),
      }),
      execute: async ({ id, completion_notes }) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const { data, error } = await supabase
          .from("sec_work_orders")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            completion_notes,
            notes: completion_notes,
          })
          .eq("id", id)
          .select("ref,source_incident_id")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "work_order", id, data.ref, "completed", {
          completion_notes,
        });
        let linkedIncidentAudit: AuditResult | null = null;
        if (data.source_incident_id) {
          const { error: incidentError } = await supabase
            .from("sec_incidents")
            .update({ status: "contained" })
            .eq("id", data.source_incident_id);
          linkedIncidentAudit = incidentError
            ? {
                ok: false,
                error: `Linked incident update failed: ${incidentError.message}`,
              }
            : await logEvent(
                supabase,
                userId,
                "incident",
                data.source_incident_id,
                null,
                "auto_contained_by_work_order",
                { work_order_ref: data.ref },
              );
        }
        return { ok: true, ref: data.ref, audit, linkedIncidentAudit };
      },
    }),

    sec_list_work_orders: tool({
      description: "List work orders. Filter by status/kind/priority.",
      inputSchema: z.object({
        status: z
          .enum(["open", "assigned", "in-progress", "on-hold", "closed", "cancelled"])
          .optional(),
        kind: z.enum(["preventive", "corrective"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_work_orders")
          .select("id,ref,title_ar,kind,priority,status,asset_kind,assigned_to,due_at,opened_at")
          .order("opened_at", { ascending: false })
          .limit(args.limit);
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
      inputSchema: z
        .object({
          work_type: z
            .string()
            .min(2)
            .max(80)
            .describe("hot-work|confined-space|electrical|height|excavation|general"),
          contractor: z.string().min(2).max(160),
          risk_level: z.enum(["low", "medium", "high", "critical"]),
          starts_at: z.string().datetime(),
          ends_at: z.string().datetime(),
          notes: z.string().max(2000).optional(),
        })
        .refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
          message: "ends_at must be later than starts_at",
          path: ["ends_at"],
        }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const ref = genRef("PTW");
        const { data, error } = await supabase
          .from("sec_permits")
          .insert({
            ref,
            org_id,
            created_by: userId,
            work_type: args.work_type,
            contractor: args.contractor,
            risk_level: args.risk_level,
            status: "pending",
            starts_at: args.starts_at,
            ends_at: args.ends_at,
            notes: args.notes ?? null,
          })
          .select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "permit", data.id, data.ref, "created", {
          risk_level: args.risk_level,
        });
        return { ok: true, permit: data, audit };
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
        // Defense-in-depth: faithfully mirror the effective RLS policy
        // `sec_permits_admin_write` (has_role(auth.uid(),'admin')) — writing to
        // sec_permits requires the platform admin role. Checking it here gives
        // a clear early 403 instead of an opaque RLS rejection. Additive only
        // (never loosens); RLS remains the primary enforcement.
        const { hasPlatformRole } = await import("@/lib/authz.server");
        if (!(await hasPlatformRole(userId, "admin"))) {
          return {
            ok: false,
            error: "Forbidden: deciding a permit-to-work requires the admin role.",
          };
        }
        const { data, error } = await supabase
          .from("sec_permits")
          .update({ status: decision })
          .eq("id", id)
          .select("ref")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "permit", id, data.ref, decision, {
          note: note ?? null,
        });
        return { ok: true, ref: data.ref, decision, audit };
      },
    }),

    sec_list_permits: tool({
      description: "List permits-to-work. Filter by status.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "approved", "rejected", "active", "expired", "closed"])
          .optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_permits")
          .select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at")
          .order("starts_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, permits: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_schedule_patrol: tool({
      description:
        "Schedule a security patrol round (دورية). Provide team, route, and number of checkpoints.",
      inputSchema: z.object({
        team: z.string().min(2).max(120),
        route: z.string().min(2).max(200),
        checkpoints_total: z.number().int().min(1).max(100).default(10),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const ref = genRef("PT");
        const { data, error } = await supabase
          .from("sec_patrols")
          .insert({
            ref,
            org_id,
            team: args.team,
            route: args.route,
            checkpoints_total: args.checkpoints_total,
            checkpoints_done: 0,
            status: "scheduled",
          })
          .select("id,ref,team,route,status,checkpoints_total")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "patrol", data.id, data.ref, "scheduled", {
          team: args.team,
          route: args.route,
        });
        return { ok: true, patrol: data, audit };
      },
    }),

    sec_list_patrols: tool({
      description: "List patrol rounds. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["scheduled", "active", "completed", "missed"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_patrols")
          .select("id,ref,team,route,status,checkpoints_total,checkpoints_done,started_at,ended_at")
          .order("created_at", { ascending: false })
          .limit(args.limit);
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
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const ref = genRef("V");
        const { data, error } = await supabase
          .from("sec_visitors")
          .insert({
            ref,
            org_id,
            created_by: userId,
            full_name: args.full_name,
            host: args.host,
            organization: args.organization ?? null,
            purpose: args.purpose ?? null,
            badge_no: args.badge_no ?? ref,
            status: "inside",
            check_in_at: new Date().toISOString(),
          })
          .select("id,ref,full_name,host,badge_no,status")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "visitor", data.id, data.ref, "checked_in", {
          host: args.host,
        });
        return { ok: true, visitor: data, audit };
      },
    }),

    sec_checkout_visitor: tool({
      description: "Check out a visitor by id. Marks status=left and sets check_out_at.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const { data, error } = await supabase
          .from("sec_visitors")
          .update({ status: "left", check_out_at: new Date().toISOString() })
          .eq("id", id)
          .select("ref,full_name")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "visitor", id, data.ref, "checked_out", {});
        return { ok: true, ref: data.ref, audit };
      },
    }),

    sec_list_visitors: tool({
      description: "List recent visitors. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["expected", "inside", "left", "overdue"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_visitors")
          .select("id,ref,full_name,organization,host,status,check_in_at,check_out_at")
          .order("check_in_at", { ascending: false })
          .limit(args.limit);
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
        let q = supabase
          .from("sec_cctv_alerts")
          .select("id,ref,camera_code,alert_type,confidence,status,detected_at,notes")
          .order("detected_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, alerts: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_triage_cctv_alert: tool({
      description:
        "Triage a CCTV alert: set status to triaged/dispatched/resolved/false_positive with notes.",
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["triaged", "dispatched", "resolved", "false_positive"]),
        notes: z.string().max(1000).optional(),
        acknowledged_by: z.string().max(160).optional(),
      }),
      execute: async ({ id, status, notes, acknowledged_by }) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const { data, error } = await supabase
          .from("sec_cctv_alerts")
          .update({
            status,
            notes: notes ?? null,
            acknowledged_by: acknowledged_by ?? "ARIA",
          })
          .eq("id", id)
          .select("ref,camera_code")
          .single();
        if (error) return { ok: false, error: error.message };
        const audit = await logEvent(supabase, userId, "cctv_alert", id, data.ref, status, {
          notes: notes ?? null,
        });
        return { ok: true, ref: data.ref, audit };
      },
    }),

    sec_navigate: tool({
      description:
        "Navigate the user to a specific page in NEXUS. Use when user says 'open X', 'go to', 'افتح', 'انتقل'. Returns a target route the UI will navigate to.",
      inputSchema: z.object({
        target: z.enum([
          "/dashboard",
          "/sec",
          "/sec/exec",
          "/sec/twin",
          "/sec/incidents",
          "/sec/maintenance",
          "/sec/permits",
          "/sec/patrols",
          "/sec/visitors",
          "/sec/cctv",
          "/sec/kpi",
          "/sec/ai",
          "/sec/projects",
          "/sec/risks",
          "/sec/circles",
          "/sec/sections",
          "/tasks",
          "/intelligence",
          "/executive",
          "/executive-reports",
          "/briefing",
          "/integrations",
        ]),
        reason: z.string().max(200).optional(),
      }),
      execute: async ({ target, reason }) => ({
        ok: true,
        navigate_to: target,
        reason: reason ?? null,
      }),
    }),

    // ─── Article 24 §5 — Generative image tool ───────────────────────────
    // Calls the Lovable AI Gateway (Gemini image model), stores the result
    // in the caller's private aria-attachments bucket, and returns a
    // 1-hour signed URL for inline markdown embedding.
    generate_image: tool({
      description:
        "Generate a new image from a text prompt (Arabic or English). Use when the user asks to draw / render / produce / design an image, diagram, poster, mock-up, or illustration. Returns a signed URL you MUST embed inline as ![alt](url).",
      inputSchema: z.object({
        prompt: z.string().min(4).max(1500).describe("Concrete visual prompt."),
        alt: z.string().max(200).optional().describe("Accessible alt text."),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      }),
      execute: async ({ prompt, alt, aspect_ratio }) => {
        const imageRate = await enforceRateLimit(`aria-image:${userId}`, 5, 600);
        if (imageRate.unavailable) {
          return { ok: false, error: "image_rate_limit_unavailable" };
        }
        if (!imageRate.allowed) return { ok: false, error: "image_rate_limit_exceeded" };

        const key = process.env.LOVABLE_API_KEY?.trim();
        if (!key) return { ok: false, error: "missing_lovable_api_key" };
        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "nexios-aria-generate-image",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              modalities: ["image", "text"],
              messages: [
                {
                  role: "user",
                  content: `Generate an image (${aspect_ratio}). ${prompt}`,
                },
              ],
            }),
            signal: AbortSignal.timeout(60_000),
          });
          if (!upstream.ok) {
            const detail = (await upstream.text().catch(() => "")).slice(0, 240);
            return { ok: false, error: `gateway_${upstream.status}`, detail };
          }
          const j = (await upstream.json()) as {
            choices?: Array<{
              message?: {
                images?: Array<{ image_url?: { url?: string } }>;
                content?: string;
              };
            }>;
          };
          const dataUrl = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!dataUrl || !dataUrl.startsWith("data:")) {
            return { ok: false, error: "no_image_in_response" };
          }
          const commaIdx = dataUrl.indexOf(",");
          if (commaIdx < 6) return { ok: false, error: "invalid_image_data_url" };
          const meta = dataUrl.slice(5, commaIdx); // e.g. image/png;base64
          const mime = meta.split(";")[0] || "";
          if (!/^(?:image\/png|image\/jpeg|image\/webp)$/.test(mime) || !/;base64$/i.test(meta)) {
            return { ok: false, error: "unsupported_generated_image_type" };
          }
          const b64 = dataUrl.slice(commaIdx + 1);
          if (b64.length > 14_000_000) return { ok: false, error: "generated_image_too_large" };
          const bytes = Buffer.from(b64, "base64");
          if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
            return { ok: false, error: "generated_image_too_large" };
          }
          const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
          const objectPath = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: upErr } = await supabaseAdmin.storage
            .from("aria-attachments")
            .upload(objectPath, bytes, { contentType: mime, upsert: false });
          if (upErr) return { ok: false, error: `upload_failed:${upErr.message}` };
          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from("aria-attachments")
            .createSignedUrl(objectPath, 60 * 60);
          if (signErr || !signed?.signedUrl) {
            return {
              ok: false,
              error: `sign_failed:${signErr?.message ?? "unknown"}`,
            };
          }
          const safeAlt = (alt ?? prompt.slice(0, 80)).replace(/[[\]\r\n]/g, " ").trim();
          return {
            ok: true,
            kind: "image",
            mime,
            size_bytes: bytes.length,
            url: signed.signedUrl,
            path: objectPath,
            prompt,
            alt: safeAlt,
            markdown: `![${safeAlt}](${signed.signedUrl})`,
          };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "generate_image_failed",
          };
        }
      },
    }),
  };
}

export type AriaToolset = ReturnType<typeof buildAriaTools>;
