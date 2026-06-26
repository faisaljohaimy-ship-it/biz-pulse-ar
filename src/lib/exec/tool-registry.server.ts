import { z, type ZodTypeAny } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { apiError } from "@/lib/api";
import { httpFetch, httpJson } from "@/lib/api/http.server";

/**
 * Tool execution context passed to every executor. Supabase client is
 * already authenticated as the caller (RLS applies) unless the executor
 * explicitly opts into elevated privileges through `loadAdmin()`.
 */
export type ToolContext = {
  supabase: SupabaseClient<Database>;
  actorId: string;
  correlationId: string;
  executionId: string;
};

export type ToolResult = {
  output: unknown;
  /** Data needed to perform a rollback later, if applicable. */
  rollbackPayload?: Record<string, unknown>;
};

export type ToolExecutor = {
  id: string;
  input: ZodTypeAny;
  execute: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
  rollback?: (
    rollbackPayload: Record<string, unknown> | null,
    ctx: ToolContext,
  ) => Promise<void>;
};

/* ----------------------------- M365 / Graph ----------------------------- */

async function lovableConnector(connectorKeyEnv: string, gateway: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env[connectorKeyEnv];
  if (!lovableKey || !connKey) {
    throw apiError("forbidden", `Connector ${connectorKeyEnv} not configured. Link the connector in Settings.`, {
      details: { connectorKeyEnv },
    });
  }
  return {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    } as Record<string, string>,
    gateway,
  };
}

const outlookSendMail: ToolExecutor = {
  id: "m365.outlook.send_mail",
  input: z.object({
    to: z.array(z.string().email()).min(1),
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(200_000),
    cc: z.array(z.string().email()).optional(),
  }),
  async execute(input) {
    const data = input as z.infer<typeof outlookSendMail.input>;
    const c = await lovableConnector(
      "MICROSOFT_OUTLOOK_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_outlook",
    );
    const message: Record<string, unknown> = {
      subject: data.subject,
      body: { contentType: "HTML", content: data.body },
      toRecipients: data.to.map((a: string) => ({ emailAddress: { address: a } })),
    };
    if (data.cc?.length) {
      message.ccRecipients = data.cc.map((a: string) => ({
        emailAddress: { address: a },
      }));
    }
    await httpJson(`${c.gateway}/me/sendMail`, {
      method: "POST",
      headers: c.headers,
      body: JSON.stringify({ message, saveToSentItems: true }),
      label: "tool outlook sendMail",
    });
    return { output: { sent: true, recipients: data.to.length } };
  },
};

const teamsPost: ToolExecutor = {
  id: "m365.teams.post_message",
  input: z.object({
    teamId: z.string().min(1),
    channelId: z.string().min(1),
    content: z.string().min(1).max(28000),
  }),
  async execute(input) {
    const data = input as z.infer<typeof teamsPost.input>;
    const c = await lovableConnector(
      "MICROSOFT_TEAMS_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_teams",
    );
    const json = await httpJson<{ id?: string }>(
      `${c.gateway}/teams/${encodeURIComponent(data.teamId)}/channels/${encodeURIComponent(data.channelId)}/messages`,
      {
        method: "POST",
        headers: c.headers,
        body: JSON.stringify({ body: { contentType: "html", content: data.content } }),
        label: "tool teams post",
      },
    );
    return { output: { messageId: json.id ?? null } };
  },
};

const sharepointUpload: ToolExecutor = {
  id: "m365.sharepoint.upload_file",
  input: z.object({
    siteId: z.string().min(1),
    filename: z.string().min(1).max(255),
    contentBase64: z.string().min(1),
  }),
  async execute(input) {
    const data = input as z.infer<typeof sharepointUpload.input>;
    const c = await lovableConnector(
      "MICROSOFT_SHAREPOINT_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_sharepoint",
    );
    // decode base64
    const bin = Uint8Array.from(atob(data.contentBase64), (ch) =>
      ch.charCodeAt(0),
    );
    if (bin.byteLength > 4 * 1024 * 1024) {
      throw apiError("validation_failed", "File exceeds 4MB single-shot upload limit");
    }
    const res = await httpFetch(
      `${c.gateway}/sites/${encodeURIComponent(data.siteId)}/drive/root:/${encodeURIComponent(data.filename)}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: c.headers.Authorization,
          "X-Connection-Api-Key": c.headers["X-Connection-Api-Key"],
          "Content-Type": "application/octet-stream",
        },
        body: bin,
        label: "tool sharepoint upload",
      },
    );
    if (!res.ok) {
      throw apiError("upstream_failed", `SharePoint upload failed (${res.status})`, {
        status: res.status,
        details: { body: (await res.text().catch(() => "")).slice(0, 300) },
      });
    }
    const json = (await res.json()) as { id?: string; webUrl?: string };
    return {
      output: { fileId: json.id, webUrl: json.webUrl },
      rollbackPayload: { fileId: json.id ?? null, siteId: data.siteId },
    };
  },
};

const graphGetUser: ToolExecutor = {
  id: "m365.graph.get_user",
  input: z.object({ userId: z.string().min(1) }),
  async execute(input) {
    const data = input as z.infer<typeof graphGetUser.input>;
    const c = await lovableConnector(
      "MICROSOFT_OUTLOOK_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_outlook",
    );
    const json = await httpJson(
      `${c.gateway}/users/${encodeURIComponent(data.userId)}`,
      { headers: c.headers, label: "tool graph get_user" },
    );
    return { output: json };
  },
};

/* ------------------------------- REST/Webhook --------------------------- */

const ALLOWED_HOSTS = new Set<string>([
  "ai.gateway.lovable.dev",
  "connector-gateway.lovable.dev",
  // extend per deployment via env later
]);

const restHttp: ToolExecutor = {
  id: "rest.http",
  input: z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.unknown().optional(),
  }),
  async execute(input) {
    const data = input as z.infer<typeof restHttp.input>;
    const url = new URL(data.url);
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      throw apiError("forbidden", `Host ${url.hostname} not in REST allowlist. Add it in tool-registry ALLOWED_HOSTS.`, {
        details: { host: url.hostname },
      });
    }
    const res = await httpFetch(url, {
      method: data.method,
      headers: data.headers,
      body: data.body == null ? undefined : JSON.stringify(data.body),
      label: `tool rest ${data.method}`,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw
    }
    if (!res.ok) {
      throw apiError("upstream_failed", `REST ${data.method} ${url.host} failed (${res.status})`, {
        status: res.status,
        details: { body: parsed },
      });
    }
    return { output: { status: res.status, body: parsed } };
  },
};

const webhookDispatch: ToolExecutor = {
  id: "webhook.dispatch",
  input: z.object({
    url: z.string().url(),
    payload: z.record(z.string(), z.unknown()),
  }),
  async execute(input) {
    const data = input as z.infer<typeof webhookDispatch.input>;
    const res = await httpFetch(data.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.payload),
      label: "tool webhook dispatch",
    });
    if (!res.ok) {
      throw apiError("upstream_failed", `Webhook dispatch failed (${res.status})`, { status: res.status });
    }
    return { output: { status: res.status } };
  },
};

/* --------------------------------- SQL ---------------------------------- */

const ALLOWED_TABLES = new Set<string>([
  "sec_incidents",
  "sec_work_orders",
  "sec_patrols",
  "sec_permits",
  "sec_visitors",
  "sec_assets",
  "sec_sites",
  "sec_cameras",
  "sec_gates",
  "sec_sensors",
  "sec_activity_events",
  "sec_buildings",
  "sec_circles",
  "sec_sections",
  "sec_projects",
  "sec_cctv_alerts",
  "sec_patrol_teams",
  "sec_contractors",
  "sec_control_rooms",
]);

const sqlRead: ToolExecutor = {
  id: "sql.read",
  input: z.object({
    table: z.string().min(1),
    columns: z.array(z.string().regex(/^[a-zA-Z0-9_,*]+$/)).min(1),
    filters: z.record(z.string(), z.unknown()).optional(),
    limit: z.number().int().positive().max(500).optional(),
  }),
  async execute(input, ctx) {
    const data = input as z.infer<typeof sqlRead.input>;
    if (!ALLOWED_TABLES.has(data.table)) {
      throw new Error(`Table ${data.table} not in sql.read allowlist`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (ctx.supabase as any).from(data.table).select(data.columns.join(","));
    for (const [k, v] of Object.entries(data.filters ?? {})) {
      q = q.eq(k, v);
    }
    q = q.limit(data.limit ?? 50);
    const { data: rows, error } = await q;
    if (error) throw new Error(`sql.read failed: ${error.message}`);
    return { output: { rows, count: Array.isArray(rows) ? rows.length : 0 } };
  },
};

/* ----------------------------- Edge Function ---------------------------- */

const edgeInvoke: ToolExecutor = {
  id: "supabase.invoke_edge_function",
  input: z.object({
    name: z.string().min(1).regex(/^[a-z0-9-_]+$/),
    payload: z.unknown().optional(),
  }),
  async execute(input, ctx) {
    const data = input as z.infer<typeof edgeInvoke.input>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: res, error } = await (ctx.supabase as any).functions.invoke(
      data.name,
      { body: data.payload ?? {} },
    );
    if (error) throw new Error(`Edge invoke failed: ${error.message}`);
    return { output: res };
  },
};

/* -------------------------- Internal SEC tools -------------------------- */

const secCreateIncident: ToolExecutor = {
  id: "sec.create_incident",
  input: z.object({
    title: z.string().min(3).max(200),
    severity: z.enum(["low", "medium", "high", "critical"]),
    description: z.string().max(5000).optional(),
    site_id: z.string().uuid().optional(),
  }),
  async execute(input, ctx) {
    const data = input as z.infer<typeof secCreateIncident.input>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (ctx.supabase as any)
      .from("sec_incidents")
      .insert({
        title: data.title,
        severity: data.severity,
        description: data.description ?? null,
        site_id: data.site_id ?? null,
        status: "open",
        reported_by: ctx.actorId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`create_incident failed: ${error.message}`);
    return {
      output: { incidentId: row.id },
      rollbackPayload: { incidentId: row.id },
    };
  },
  async rollback(payload, ctx) {
    const id = (payload as { incidentId?: string } | null)?.incidentId;
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx.supabase as any)
      .from("sec_incidents")
      .update({ status: "cancelled" })
      .eq("id", id);
  },
};

const secUpdateWorkOrder: ToolExecutor = {
  id: "sec.update_work_order",
  input: z.object({
    id: z.string().uuid(),
    status: z.string().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  }),
  async execute(input, ctx) {
    const data = input as z.infer<typeof secUpdateWorkOrder.input>;
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    if (!Object.keys(patch).length) {
      throw new Error("No fields to update");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: before } = await (ctx.supabase as any)
      .from("sec_work_orders")
      .select("status,assigned_to")
      .eq("id", data.id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (ctx.supabase as any)
      .from("sec_work_orders")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(`update_work_order failed: ${error.message}`);
    return {
      output: { ok: true },
      rollbackPayload: { id: data.id, before: before ?? null },
    };
  },
  async rollback(payload, ctx) {
    const p = payload as {
      id?: string;
      before?: { status?: string; assigned_to?: string | null };
    } | null;
    if (!p?.id || !p.before) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx.supabase as any)
      .from("sec_work_orders")
      .update(p.before)
      .eq("id", p.id);
  },
};

/* ----------------------------- Disabled stubs --------------------------- */

function disabledExecutor(id: string, reason: string): ToolExecutor {
  return {
    id,
    input: z.unknown(),
    async execute() {
      throw new Error(
        `Tool ${id} disabled: ${reason}. Enable after linking the required connector.`,
      );
    },
  };
}

/* ---------------------------- Registry exports -------------------------- */

const REGISTRY: Record<string, ToolExecutor> = Object.fromEntries(
  [
    outlookSendMail,
    teamsPost,
    sharepointUpload,
    graphGetUser,
    restHttp,
    webhookDispatch,
    sqlRead,
    edgeInvoke,
    secCreateIncident,
    secUpdateWorkOrder,
    disabledExecutor("sap.execute", "SAP connector not linked"),
    disabledExecutor("oracle.execute", "Oracle connector not linked"),
    disabledExecutor("azure_ad.execute", "Azure AD admin grant not configured"),
    disabledExecutor("n8n.execute", "n8n MCP workflow not yet bound"),
  ].map((e) => [e.id, e]),
);

export function getExecutor(toolId: string): ToolExecutor | null {
  return REGISTRY[toolId] ?? null;
}

export function listExecutorIds(): string[] {
  return Object.keys(REGISTRY);
}
