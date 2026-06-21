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
  };
}

export type AriaToolset = ReturnType<typeof buildAriaTools>;
