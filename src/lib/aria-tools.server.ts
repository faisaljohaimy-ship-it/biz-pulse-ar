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
        const res = await fetch(`${GW}/microsoft_outlook/me/sendMail`, {
          method: "POST",
          headers,
          body: JSON.stringify({ message, saveToSentItems: true }),
        });
        if (!res.ok) {
          const txt = await res.text();
          return { ok: false, error: `Outlook ${res.status}: ${txt.slice(0, 240)}` };
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
            summary: args.summary ?? null,
            source: "ARIA",
          })
          .select("id,title,severity,business_impact_score")
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, alert: data };
      },
    }),
  };
}

export type AriaToolset = ReturnType<typeof buildAriaTools>;
