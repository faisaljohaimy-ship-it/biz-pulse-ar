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

// Schema ground-truth pulled from information_schema. Embedding columns here
// (a) feeds the LLM via the tool description so it stops guessing names, and
// (b) lets us validate column tokens before talking to PostgREST.
const TABLE_COLUMNS: Record<string, readonly string[]> = {
  sec_incidents: ["id","ref","site_id","category","title_ar","title_en","severity","status","owner","reported_at","resolved_at","response_minutes","root_cause","ai_summary","created_at","updated_at","priority","assigned_to","escalated","ai_risk_score","org_id"],
  sec_work_orders: ["id","ref","site_id","building_id","asset_kind","asset_code","kind","title_ar","title_en","priority","status","assigned_to","contractor","opened_at","due_at","closed_at","notes","created_at","updated_at","source_incident_id","org_id"],
  sec_patrols: ["id","ref","site_id","team","route","status","checkpoints_total","checkpoints_done","started_at","ended_at","created_at","updated_at","org_id"],
  sec_permits: ["id","ref","site_id","work_type","contractor","risk_level","status","starts_at","ends_at","approver","notes","approved_by","approved_at","created_at","updated_at","org_id"],
  sec_visitors: ["id","ref","site_id","full_name","organization","host","purpose","badge_no","check_in_at","check_out_at","status","vehicle_plate","expected_at","gate_id","created_at","org_id"],
  sec_assets: ["id","code","name_ar","name_en","kind","site_id","health","status","last_seen_at","created_at","updated_at","org_id"],
  sec_sites: ["id","code","name_ar","name_en","lat","lng","sensitivity","status","guards_count","notes","circle_id","created_at","updated_at","org_id"],
  sec_cameras: ["id","building_id","site_id","code","kind","status","health","resolution","last_seen_at","created_at","updated_at","org_id"],
  sec_gates: ["id","building_id","site_id","code","kind","status","health","last_event_at","events_today","created_at","updated_at","org_id"],
  sec_sensors: ["id","building_id","site_id","code","sensor_type","status","reading","threshold","unit","last_reading_at","created_at","updated_at","org_id"],
  sec_activity_events: ["id","entity_type","entity_id","entity_ref","event","actor_id","actor_name","occurred_at","org_id"],
  sec_buildings: ["id","site_id","code","name_ar","name_en","floors","status","created_at","updated_at","org_id"],
  sec_circles: ["id","code","name_ar","name_en","manager","lat","lng","staff_count","created_at","updated_at","org_id"],
  sec_sections: ["id","code","name_ar","name_en","head","staff_count","created_at","updated_at","org_id"],
  sec_projects: ["id","ref","circle_id","name_ar","name_en","kind","status","progress","budget_sar","spent_sar","starts_at","ends_at","manager","contractor","health","created_at","updated_at","org_id"],
  sec_cctv_alerts: ["id","ref","site_id","camera_code","alert_type","confidence","status","detected_at","acknowledged_by","notes","created_at","org_id"],
  sec_patrol_teams: ["id","circle_id","code","name_ar","leader","members_count","vehicle_plate","status","created_at","updated_at","org_id"],
  sec_contractors: ["id","ref","name","contract_no","workers_count","compliance_score","status","expires_at","permit_types","insurance_expiry","created_at","updated_at","org_id"],
  sec_control_rooms: ["id","circle_id","code","name_ar","name_en","operators_count","status","shift_lead","screens_count","created_at","updated_at","org_id"],
} as const;

const ALLOWED_TABLE_NAMES = Object.keys(TABLE_COLUMNS) as [string, ...string[]];

// Compact schema hint embedded in the tool description so the model has the
// full column catalog at decode time (kills schema drift on column names).
const SCHEMA_HINT = ALLOWED_TABLE_NAMES
  .map((t) => `${t}(${TABLE_COLUMNS[t].join(",")})`)
  .join(" | ");

const filterValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const filterOp = z.object({
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
  value: z.union([filterValue, z.array(filterValue)]),
});

const sqlRead: ToolExecutor = {
  id: "sql.read",
  input: z.object({
    table: z.enum(ALLOWED_TABLE_NAMES),
    // "*" selects every column. Otherwise must be valid identifier tokens.
    columns: z
      .array(z.string().regex(/^(\*|[a-zA-Z_][a-zA-Z0-9_]*)$/))
      .min(1)
      .default(["*"]),
    // Plain value => eq. Object { op, value } => any supported operator.
    filters: z.record(z.string(), z.union([filterValue, filterOp])).optional(),
    order_by: z
      .object({
        column: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
        ascending: z.boolean().default(false),
      })
      .optional(),
    limit: z.number().int().positive().max(500).default(50),
    count_only: z.boolean().default(false),
  }),
  async execute(input, ctx) {
    const data = input as z.infer<typeof sqlRead.input>;
    const cols = TABLE_COLUMNS[data.table];
    if (!cols) {
      throw new Error(`Table ${data.table} not in sql.read allowlist`);
    }

    // Validate referenced columns against the real schema. Reject unknowns
    // BEFORE hitting PostgREST so the agent gets an actionable error.
    const knownCols = new Set<string>(cols);
    const selected = data.columns.includes("*") ? ["*"] : data.columns;
    for (const c of selected) {
      if (c !== "*" && !knownCols.has(c)) {
        throw new Error(
          `Unknown column "${c}" on ${data.table}. Valid columns: ${cols.join(",")}`,
        );
      }
    }
    for (const k of Object.keys(data.filters ?? {})) {
      if (!knownCols.has(k)) {
        throw new Error(
          `Unknown filter column "${k}" on ${data.table}. Valid columns: ${cols.join(",")}`,
        );
      }
    }
    if (data.order_by && !knownCols.has(data.order_by.column)) {
      throw new Error(
        `Unknown order_by column "${data.order_by.column}" on ${data.table}.`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = ctx.supabase as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any;
    if (data.count_only) {
      q = client.from(data.table).select("id", { count: "exact", head: true });
    } else {
      q = client.from(data.table).select(selected.join(","));
    }

    for (const [k, raw] of Object.entries(data.filters ?? {})) {
      if (raw !== null && typeof raw === "object" && "op" in (raw as object)) {
        const spec = raw as z.infer<typeof filterOp>;
        switch (spec.op) {
          case "eq":  q = q.eq(k, spec.value); break;
          case "neq": q = q.neq(k, spec.value); break;
          case "gt":  q = q.gt(k, spec.value); break;
          case "gte": q = q.gte(k, spec.value); break;
          case "lt":  q = q.lt(k, spec.value); break;
          case "lte": q = q.lte(k, spec.value); break;
          case "like":  q = q.like(k, String(spec.value)); break;
          case "ilike": q = q.ilike(k, String(spec.value)); break;
          case "in":    q = q.in(k, Array.isArray(spec.value) ? spec.value : [spec.value]); break;
          case "is":    q = q.is(k, spec.value as null | boolean); break;
        }
      } else {
        q = q.eq(k, raw);
      }
    }

    if (data.order_by) {
      q = q.order(data.order_by.column, { ascending: data.order_by.ascending });
    }
    if (!data.count_only) {
      q = q.limit(data.limit);
    }

    const { data: rows, error, count } = await q;
    if (error) throw new Error(`sql.read failed: ${error.message}`);
    if (data.count_only) {
      return { output: { count: count ?? 0, rows: [] } };
    }
    return {
      output: { rows: rows ?? [], count: Array.isArray(rows) ? rows.length : 0 },
    };
  },
  description:
    `Read rows from a whitelisted public.sec_* table via PostgREST. ` +
    `Use enum 'table' (must be exact). Columns must exist on that table; use ["*"] to fetch all. ` +
    `Filters accept either plain values (= equality) or {op,value} with op in [eq,neq,gt,gte,lt,lte,like,ilike,in,is]. ` +
    `Bilingual columns are name_ar/name_en, title_ar/title_en — there is no "name" or "title". ` +
    `For counts set count_only=true (returns {count}). ` +
    `Schema: ${SCHEMA_HINT}`,
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
