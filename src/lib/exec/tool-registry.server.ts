import { z, type ZodTypeAny } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { apiError } from "@/lib/api";
import { httpFetch, httpJson } from "@/lib/api/http.server";

/**
 * Tool execution context passed to every executor.
 *
 * `supabase` is **whatever client the caller of `executeTool` passed** — it is
 * NOT guaranteed to be RLS-bound. Server functions pass the signed-in user's
 * client (RLS applies), but the cron/hook path (`/api/public/hooks/run-agent`)
 * runs the agent with the service-role client, which bypasses RLS entirely.
 * Every executor that reads or writes tenant data must therefore scope by
 * `ctx.orgId` itself (and fail closed when it is missing) instead of relying
 * on row-level security to do it. The table-touching executors here do
 * (sql.read, kb.search, sec.*, rag.*). `supabase.invoke_edge_function` cannot:
 * it hands the same client's credentials to code outside this file, so on the
 * service-role path the edge function itself is the only tenant boundary.
 */
export type ToolContext = {
  supabase: SupabaseClient<Database>;
  actorId: string;
  /** Verified tenant context; never inferred independently inside a tool. */
  orgId: string;
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
  /** Disabled executors stay discoverable through getExecutor for DB rows, but are not exposed to agents. */
  disabled?: boolean;
  /** Optional rich description; surfaced to the LLM via the AI SDK tool. */
  description?: string;
  /**
   * Whether repeating the call is harmless (read-only). The orchestrator
   * retries timeouts/transient errors ONLY for idempotent calls; anything
   * with a side effect (send, post, upload, insert, update, non-GET HTTP)
   * runs exactly once, because a timeout there means "outcome unknown", not
   * "did not happen". A function form decides per input (e.g. rest.http GET).
   * Missing = not idempotent (fail safe: never duplicate a side effect).
   */
  idempotent?: boolean | ((input: unknown) => boolean);
  execute: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
  rollback?: (rollbackPayload: Record<string, unknown> | null, ctx: ToolContext) => Promise<void>;
};

/* ----------------------------- M365 / Graph ----------------------------- */

async function lovableConnector(connectorKeyEnv: string, gateway: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env[connectorKeyEnv];
  if (!lovableKey || !connKey) {
    throw apiError(
      "forbidden",
      `Connector ${connectorKeyEnv} not configured. Link the connector in Settings.`,
      {
        details: { connectorKeyEnv },
      },
    );
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

const outlookSendMailInputSchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(200_000),
  cc: z.array(z.string().email()).optional(),
});

const outlookSendMail: ToolExecutor = {
  id: "m365.outlook.send_mail",
  idempotent: false,
  input: outlookSendMailInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof outlookSendMailInputSchema>;
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
      // A retried POST can send the same mail twice.
      retries: 0,
    });
    return { output: { sent: true, recipients: data.to.length } };
  },
};

const teamsPostInputSchema = z.object({
  teamId: z.string().min(1),
  channelId: z.string().min(1),
  content: z.string().min(1).max(28000),
});

const teamsPost: ToolExecutor = {
  id: "m365.teams.post_message",
  idempotent: false,
  input: teamsPostInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof teamsPostInputSchema>;
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
        retries: 0,
      },
    );
    return { output: { messageId: json.id ?? null } };
  },
};

const sharepointUploadInputSchema = z.object({
  siteId: z.string().min(1),
  filename: z.string().min(1).max(255),
  contentBase64: z.string().min(1),
});

const sharepointUpload: ToolExecutor = {
  id: "m365.sharepoint.upload_file",
  idempotent: false,
  input: sharepointUploadInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof sharepointUploadInputSchema>;
    const c = await lovableConnector(
      "MICROSOFT_SHAREPOINT_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_sharepoint",
    );
    // decode base64
    const bin = Uint8Array.from(atob(data.contentBase64), (ch) => ch.charCodeAt(0));
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
        retries: 0,
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

const graphGetUserInputSchema = z.object({ userId: z.string().min(1) });

const graphGetUser: ToolExecutor = {
  id: "m365.graph.get_user",
  idempotent: true,
  input: graphGetUserInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof graphGetUserInputSchema>;
    const c = await lovableConnector(
      "MICROSOFT_OUTLOOK_API_KEY",
      "https://connector-gateway.lovable.dev/microsoft_outlook",
    );
    const json = await httpJson(`${c.gateway}/users/${encodeURIComponent(data.userId)}`, {
      headers: c.headers,
      label: "tool graph get_user",
    });
    return { output: json };
  },
};

/* ------------------------------- REST/Webhook --------------------------- */

const ALLOWED_HOSTS = new Set<string>([
  "ai.gateway.lovable.dev",
  "connector-gateway.lovable.dev",
  // extend per deployment via env later
]);

async function resolveActorOrgId(ctx: ToolContext): Promise<string> {
  if (!ctx.orgId) throw new Error("Verified organization context is required");
  return ctx.orgId;
}

const restHttpInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const restHttp: ToolExecutor = {
  id: "rest.http",
  // GET is a read; every other verb may change upstream state.
  idempotent: (input) => (input as { method?: unknown } | null)?.method === "GET",
  input: restHttpInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof restHttpInputSchema>;
    const url = new URL(data.url);
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      throw apiError(
        "forbidden",
        `Host ${url.hostname} not in REST allowlist. Add it in tool-registry ALLOWED_HOSTS.`,
        {
          details: { host: url.hostname },
        },
      );
    }
    const res = await httpFetch(url, {
      method: data.method,
      headers: data.headers,
      body: data.body == null ? undefined : JSON.stringify(data.body),
      label: `tool rest ${data.method}`,
      // Non-GET: one attempt — a transport retry could repeat the side effect.
      ...(data.method === "GET" ? {} : { retries: 0 }),
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

const webhookDispatchInputSchema = z.object({
  url: z.string().url(),
  payload: z.record(z.string(), z.unknown()),
});

const webhookDispatch: ToolExecutor = {
  id: "webhook.dispatch",
  idempotent: false,
  input: webhookDispatchInputSchema,
  async execute(input) {
    const data = input as z.infer<typeof webhookDispatchInputSchema>;
    const url = new URL(data.url);
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      throw apiError("forbidden", `Webhook host ${url.hostname} not in allowlist.`, {
        details: { host: url.hostname },
      });
    }
    const res = await httpFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.payload),
      label: "tool webhook dispatch",
      retries: 0,
    });
    if (!res.ok) {
      throw apiError("upstream_failed", `Webhook dispatch failed (${res.status})`, {
        status: res.status,
      });
    }
    return { output: { status: res.status } };
  },
};

/* --------------------------------- SQL ---------------------------------- */

// Schema ground-truth pulled from information_schema. Embedding columns here
// (a) feeds the LLM via the tool description so it stops guessing names, and
// (b) lets us validate column tokens before talking to PostgREST.
const TABLE_COLUMNS: Record<string, readonly string[]> = {
  sec_incidents: [
    "id",
    "ref",
    "site_id",
    "category",
    "title_ar",
    "title_en",
    "severity",
    "status",
    "owner",
    "reported_at",
    "resolved_at",
    "response_minutes",
    "root_cause",
    "ai_summary",
    "created_at",
    "updated_at",
    "priority",
    "assigned_to",
    "escalated",
    "ai_risk_score",
    "org_id",
    "created_by",
    "attachments_count",
    "aria_auto_analyzed",
    "executive_review",
  ],
  sec_work_orders: [
    "id",
    "ref",
    "site_id",
    "building_id",
    "asset_kind",
    "asset_code",
    "kind",
    "title_ar",
    "title_en",
    "priority",
    "status",
    "assigned_to",
    "contractor",
    "opened_at",
    "due_at",
    "closed_at",
    "notes",
    "completion_notes",
    "created_at",
    "updated_at",
    "source_incident_id",
    "org_id",
    "created_by",
    "approved_by",
    "approved_at",
  ],
  sec_patrols: [
    "id",
    "ref",
    "site_id",
    "team",
    "route",
    "status",
    "checkpoints_total",
    "checkpoints_done",
    "started_at",
    "ended_at",
    "created_at",
    "updated_at",
    "org_id",
    "created_by",
  ],
  sec_permits: [
    "id",
    "ref",
    "site_id",
    "work_type",
    "contractor",
    "risk_level",
    "status",
    "starts_at",
    "ends_at",
    "approver",
    "notes",
    "approved_by",
    "approved_at",
    "created_at",
    "updated_at",
    "org_id",
    "created_by",
  ],
  sec_visitors: [
    "id",
    "ref",
    "site_id",
    "full_name",
    "organization",
    "host",
    "purpose",
    "badge_no",
    "check_in_at",
    "check_out_at",
    "status",
    "vehicle_plate",
    "expected_at",
    "gate_id",
    "created_at",
    "org_id",
    "created_by",
    "id_number",
    "phone",
    "qr_token",
  ],
  sec_vehicles: [
    "id",
    "ref",
    "plate",
    "vehicle_type",
    "driver_name",
    "driver_phone",
    "driver_id_number",
    "company",
    "contractor_id",
    "site_id",
    "gate_id",
    "status",
    "check_in_at",
    "check_out_at",
    "permit_no",
    "permit_expires_at",
    "notes",
    "created_at",
    "updated_at",
    "org_id",
    "created_by",
  ],
  sec_assets: [
    "id",
    "code",
    "name_ar",
    "name_en",
    "kind",
    "site_id",
    "health",
    "status",
    "last_seen_at",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_sites: [
    "id",
    "code",
    "name_ar",
    "name_en",
    "lat",
    "lng",
    "sensitivity",
    "status",
    "guards_count",
    "notes",
    "circle_id",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_cameras: [
    "id",
    "building_id",
    "site_id",
    "code",
    "kind",
    "status",
    "health",
    "resolution",
    "last_seen_at",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_gates: [
    "id",
    "building_id",
    "site_id",
    "code",
    "kind",
    "status",
    "health",
    "last_event_at",
    "events_today",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_sensors: [
    "id",
    "building_id",
    "site_id",
    "code",
    "sensor_type",
    "status",
    "reading",
    "threshold",
    "unit",
    "last_reading_at",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_activity_events: [
    "id",
    "entity_type",
    "entity_id",
    "entity_ref",
    "event",
    "actor_id",
    "actor_name",
    "occurred_at",
    "org_id",
  ],
  sec_buildings: [
    "id",
    "site_id",
    "code",
    "name_ar",
    "name_en",
    "floors",
    "status",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_circles: [
    "id",
    "code",
    "name_ar",
    "name_en",
    "manager",
    "lat",
    "lng",
    "staff_count",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_sections: [
    "id",
    "code",
    "name_ar",
    "name_en",
    "head",
    "staff_count",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_projects: [
    "id",
    "ref",
    "circle_id",
    "name_ar",
    "name_en",
    "kind",
    "status",
    "progress",
    "budget_sar",
    "spent_sar",
    "starts_at",
    "ends_at",
    "manager",
    "contractor",
    "health",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_cctv_alerts: [
    "id",
    "ref",
    "site_id",
    "camera_code",
    "alert_type",
    "confidence",
    "status",
    "detected_at",
    "acknowledged_by",
    "notes",
    "created_at",
    "org_id",
  ],
  sec_patrol_teams: [
    "id",
    "circle_id",
    "code",
    "name_ar",
    "leader",
    "members_count",
    "vehicle_plate",
    "status",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_contractors: [
    "id",
    "ref",
    "name",
    "contract_no",
    "workers_count",
    "compliance_score",
    "status",
    "expires_at",
    "permit_types",
    "insurance_expiry",
    "allowed_site_ids",
    "phone",
    "email",
    "created_at",
    "updated_at",
    "org_id",
    "created_by",
  ],
  sec_control_rooms: [
    "id",
    "circle_id",
    "code",
    "name_ar",
    "name_en",
    "operators_count",
    "status",
    "shift_lead",
    "screens_count",
    "created_at",
    "updated_at",
    "org_id",
  ],
  sec_knowledge_articles: [
    "id",
    "doc_code",
    "category_id",
    "title_ar",
    "title_en",
    "summary_ar",
    "summary_en",
    "body_ar",
    "body_en",
    "procedure_ar",
    "procedure_en",
    "requirements_ar",
    "requirements_en",
    "risk_level",
    "priority",
    "status",
    "version",
    "owner",
    "review_date",
    "created_at",
    "updated_at",
    "created_by",
    "org_id",
  ],
} as const;

const ALLOWED_TABLE_NAMES = Object.keys(TABLE_COLUMNS) as [string, ...string[]];

// Compact schema hint embedded in the tool description so the model has the
// full column catalog at decode time (kills schema drift on column names).
const SCHEMA_HINT = ALLOWED_TABLE_NAMES.map((t) => `${t}(${TABLE_COLUMNS[t].join(",")})`).join(
  " | ",
);

const filterValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const filterOp = z.object({
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"]),
  value: z.union([filterValue, z.array(filterValue)]),
});

const sqlReadInputSchema = z.object({
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
});

const sqlRead: ToolExecutor = {
  id: "sql.read",
  idempotent: true,
  input: sqlReadInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof sqlReadInputSchema>;
    // Tenant scope is mandatory and comes from the verified context, never
    // from the model's filters. The cron/hook path hands this tool the
    // service-role client (RLS bypassed), so without this filter one org's
    // agent could read every org's rows. No org ⇒ refuse before any query.
    const orgId = await resolveActorOrgId(ctx);
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
        throw new Error(`Unknown column "${c}" on ${data.table}. Valid columns: ${cols.join(",")}`);
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
      throw new Error(`Unknown order_by column "${data.order_by.column}" on ${data.table}.`);
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
    // Applied before (and independently of) any model-supplied filter: a
    // model filter on org_id can only narrow this further, never widen it.
    q = q.eq("org_id", orgId);

    for (const [k, raw] of Object.entries(data.filters ?? {})) {
      if (raw !== null && typeof raw === "object" && "op" in (raw as object)) {
        const spec = raw as z.infer<typeof filterOp>;
        switch (spec.op) {
          case "eq":
            q = q.eq(k, spec.value);
            break;
          case "neq":
            q = q.neq(k, spec.value);
            break;
          case "gt":
            q = q.gt(k, spec.value);
            break;
          case "gte":
            q = q.gte(k, spec.value);
            break;
          case "lt":
            q = q.lt(k, spec.value);
            break;
          case "lte":
            q = q.lte(k, spec.value);
            break;
          case "like":
            q = q.like(k, String(spec.value));
            break;
          case "ilike":
            q = q.ilike(k, String(spec.value));
            break;
          case "in":
            q = q.in(k, Array.isArray(spec.value) ? spec.value : [spec.value]);
            break;
          case "is":
            q = q.is(k, spec.value as null | boolean);
            break;
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
    `Read rows from a whitelisted public.sec_* table via PostgREST, always scoped to the current organization. ` +
    `Use enum 'table' (must be exact). Columns must exist on that table; use ["*"] to fetch all. ` +
    `Filters accept either plain values (= equality) or {op,value} with op in [eq,neq,gt,gte,lt,lte,like,ilike,in,is]. ` +
    `Bilingual columns are name_ar/name_en, title_ar/title_en — there is no "name" or "title". ` +
    `For counts set count_only=true (returns {count}). ` +
    `Schema: ${SCHEMA_HINT}`,
};

/* ----------------------------- Edge Function ---------------------------- */

const edgeInvokeInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-_]+$/),
  payload: z.unknown().optional(),
});

const edgeInvoke: ToolExecutor = {
  id: "supabase.invoke_edge_function",
  // An edge function may write anything; never assume a retry is safe.
  idempotent: false,
  input: edgeInvokeInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof edgeInvokeInputSchema>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: res, error } = await (ctx.supabase as any).functions.invoke(data.name, {
      body: data.payload ?? {},
    });
    if (error) throw new Error(`Edge invoke failed: ${error.message}`);
    return { output: res };
  },
};

/* -------------------------- Internal SEC tools -------------------------- */

const secCreateIncidentInputSchema = z.object({
  category: z.string().min(2).max(80).default("other"),
  title_ar: z.string().min(3).max(200),
  title_en: z.string().max(200).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  owner: z.string().max(120).optional(),
  assigned_to: z.string().max(120).optional(),
  notes: z.string().max(5000).optional(),
  site_id: z.string().uuid().optional(),
});

const secCreateIncident: ToolExecutor = {
  id: "sec.create_incident",
  idempotent: false,
  input: secCreateIncidentInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof secCreateIncidentInputSchema>;
    const orgId = await resolveActorOrgId(ctx);
    const severityScore: Record<z.infer<typeof secCreateIncidentInputSchema>["severity"], number> =
      {
        low: 20,
        medium: 45,
        high: 70,
        critical: 90,
      };
    const priorityBoost: Record<z.infer<typeof secCreateIncidentInputSchema>["priority"], number> =
      {
        low: 0,
        medium: 5,
        high: 10,
        critical: 15,
      };
    const riskScore = Math.min(100, severityScore[data.severity] + priorityBoost[data.priority]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (ctx.supabase as any)
      .from("sec_incidents")
      .insert({
        ref: `INC-${Date.now().toString(36).toUpperCase()}`,
        org_id: orgId,
        category: data.category,
        title_ar: data.title_ar,
        title_en: data.title_en ?? data.title_ar,
        severity: data.severity,
        priority: data.priority,
        owner: data.owner ?? ctx.actorId,
        assigned_to: data.assigned_to ?? null,
        root_cause: data.notes ?? null,
        site_id: data.site_id ?? null,
        status: "open",
        reported_at: new Date().toISOString(),
        ai_risk_score: riskScore,
        created_by: ctx.actorId,
      })
      .select("id,ref,title_ar,severity,priority,status,ai_risk_score")
      .single();
    if (error) throw new Error(`create_incident failed: ${error.message}`);
    return {
      output: { incident: row },
      rollbackPayload: { incidentId: row.id },
    };
  },
  async rollback(payload, ctx) {
    const id = (payload as { incidentId?: string } | null)?.incidentId;
    if (!id) return;
    const orgId = await resolveActorOrgId(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rbErr } = await (ctx.supabase as any)
      .from("sec_incidents")
      .update({ status: "closed", root_cause: "Rolled back by agent runtime" })
      .eq("id", id)
      .eq("org_id", orgId);
    // A failed rollback silently leaves the incident open — surface it.
    if (rbErr) console.error("[tool-registry] incident rollback failed:", rbErr.message);
  },
};

/** Semantic kb.search over-fetches so the tenant post-filter can still fill `limit`. */
const KB_SCOPE_OVERFETCH = 4;
const KB_SCOPE_POOL_MAX = 40;

type KbHit = { id?: unknown } & Record<string, unknown>;

/**
 * Keeps only the RPC hits whose article is in this run's org scope, checked
 * by id against `sec_knowledge_articles` with the org filter. Order is kept.
 * A failed check throws — an unverifiable hit is never returned.
 */
async function keepKbHitsInOrgScope(
  ctx: ToolContext,
  hits: KbHit[],
  orgScope: string,
): Promise<KbHit[]> {
  const ids = hits.map((hit) => hit.id).filter((id): id is string => typeof id === "string");
  if (!ids.length) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("sec_knowledge_articles")
    .select("id")
    .in("id", ids)
    .or(orgScope);
  if (error) throw new Error(`kb.search scope check failed: ${error.message}`);
  const allowed = new Set(((data ?? []) as Array<{ id: string }>).map((row) => row.id));
  return hits.filter((hit) => typeof hit.id === "string" && allowed.has(hit.id));
}

const kbSearch: ToolExecutor = {
  id: "kb.search",
  idempotent: true,
  description:
    "Search the Industrial Security Knowledge Repository (sec_knowledge_articles), scoped to the current organization plus global articles. Returns the top matching bilingual SOPs/policies/procedures with doc_code and summary. Use whenever the user asks 'what is the procedure for X', 'which SOP applies', or needs official policy guidance.",
  input: z.object({
    query: z.string().min(2).max(500),
    category_code: z
      .enum([
        "IS-POL",
        "IS-REG",
        "IS-SOP",
        "IS-WI",
        "IS-INC",
        "IS-INV",
        "IS-ERP",
        "IS-RSK",
        "IS-CRS",
        "IS-VIS",
        "IS-CON",
        "IS-PTW",
        "IS-GAT",
        "IS-ACS",
        "IS-PAT",
        "IS-CCT",
        "IS-AST",
        "IS-CIP",
        "IS-FLS",
        "IS-HAZ",
        "IS-EXE",
        "IS-EVT",
        "IS-HAJ",
        "IS-BCM",
        "IS-DRP",
        "IS-AUD",
        "IS-KPI",
        "IS-FRM",
        "IS-TPL",
        "IS-CHK",
      ])
      .optional(),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  async execute(input, ctx) {
    const data = input as { query: string; category_code?: string; limit: number };
    // Same tenant rule as sql.read: the client may be service-role (cron/hook
    // path), so RLS is no guarantee here. In scope = what the read policy
    // grants a member: the verified org's own articles plus global ones
    // (org_id IS NULL). No org ⇒ refuse before embedding or querying.
    const orgId = await resolveActorOrgId(ctx);
    const orgScope = `org_id.is.null,org_id.eq.${orgId}`;
    const { embedText } = await import("@/lib/kb-embed.server");
    let vec: number[] | null = null;
    try {
      vec = await embedText(data.query, "retrieval-query");
    } catch {
      vec = null;
    }

    if (vec) {
      // `sec_kb_search` has no org predicate and returns no org_id (changing
      // that is a schema change). Over-fetch, then keep only hits whose
      // article is re-matched by id inside the org scope.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (ctx.supabase as any).rpc("sec_kb_search", {
        _query: vec,
        _category_code: data.category_code ?? null,
        _limit: Math.min(data.limit * KB_SCOPE_OVERFETCH, KB_SCOPE_POOL_MAX),
      });
      if (error) throw new Error(`kb.search failed: ${error.message}`);
      const hits = await keepKbHitsInOrgScope(ctx, (rows ?? []) as KbHit[], orgScope);
      return { output: { mode: "semantic", hits: hits.slice(0, data.limit) } };
    }

    // Keyword fallback (sanitize PostgREST filter chars)
    const kq = data.query.replace(/[,()]/g, " ").trim();
    if (!kq) return { output: { mode: "keyword", hits: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (ctx.supabase as any)
      .from("sec_knowledge_articles")
      .select("doc_code, title_ar, title_en, summary_ar, summary_en, risk_level, priority")
      .eq("status", "published")
      // Separate `or` groups are ANDed by PostgREST: (org scope) AND (match).
      .or(orgScope)
      .or(
        [
          `title_ar.ilike.%${kq}%`,
          `title_en.ilike.%${kq}%`,
          `summary_ar.ilike.%${kq}%`,
          `summary_en.ilike.%${kq}%`,
        ].join(","),
      )
      .limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(`kb.search keyword failed: ${error.message}`);
    return { output: { mode: "keyword", hits: rows ?? [] } };
  },
};

/* -------------------------- Governed SADEED RAG ------------------------- */

const ragSearchVerifiedInputSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  category_code: z.string().trim().max(80).optional(),
  limit: z.number().int().min(2).max(12).default(8),
});

const ragSearchVerified: ToolExecutor = {
  id: "rag.search_verified",
  idempotent: true,
  description:
    "Search only the current tenant's verified industrial-security corpus through hybrid retrieval and the SADEED evidence gate. A passed result always has at least two citations.",
  input: ragSearchVerifiedInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof ragSearchVerifiedInputSchema>;
    const [{ retrieveWithEvidenceGate }, { safeExcerpt }] = await Promise.all([
      import("@/lib/sadeed/rag/retrieve.server"),
      import("@/lib/sadeed/rag/sanitize.server"),
    ]);
    const outcome = await retrieveWithEvidenceGate(ctx.supabase, {
      query: data.query,
      orgId: ctx.orgId,
      categoryCode: data.category_code ?? null,
      limit: data.limit,
      route: "agent-tool:rag.search_verified",
      correlationId: ctx.correlationId,
    });
    return {
      output: {
        gate_result: outcome.gate_result,
        reason: outcome.reason ?? null,
        max_similarity: outcome.max_similarity,
        citation_count: outcome.citation_count,
        citations:
          outcome.gate_result === "passed"
            ? outcome.hits.map((hit) => ({
                id: hit.id,
                doc_code: hit.doc_code,
                title_ar: hit.title_ar,
                title_en: hit.title_en,
                excerpt_ar: safeExcerpt(hit.summary_ar ?? hit.summary_en ?? "", 900),
                similarity: hit.similarity,
              }))
            : [],
      },
    };
  },
};

const ragRecordGapInputSchema = z.object({ query: z.string().trim().min(3).max(2000) });

const ragRecordGap: ToolExecutor = {
  id: "rag.record_gap",
  idempotent: false,
  description:
    "Record an unanswered industrial-security question in the current tenant's knowledge backlog. This never creates retrievable knowledge.",
  input: ragRecordGapInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof ragRecordGapInputSchema>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gapId, error } = await (ctx.supabase as any).rpc("rag_record_gap_for_org", {
      _org_id: ctx.orgId,
      _query: data.query,
    });
    if (error) throw new Error(`rag.record_gap failed: ${error.message}`);
    return { output: { recorded: true, gap_id: gapId } };
  },
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const ragProposeCandidateInputSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  answer: z.string().trim().min(3).max(12000),
});

const ragProposeCandidate: ToolExecutor = {
  id: "rag.propose_candidate",
  idempotent: false,
  description:
    "Save a proposed Q&A for administrator review. It is always stored unverified and is never returned by retrieval until separately approved or ingested from an authoritative source.",
  input: ragProposeCandidateInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof ragProposeCandidateInputSchema>;
    const contentHash = await sha256(`${ctx.orgId}\n${data.question}\n${data.answer}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (ctx.supabase as any)
      .from("rag_candidates")
      .upsert(
        {
          org_id: ctx.orgId,
          question: data.question,
          answer: data.answer,
          source_kind: "model_generated",
          citation_chunk_id: null,
          verified: false,
          content_sha256: contentHash,
        },
        { onConflict: "org_id,content_sha256", ignoreDuplicates: true },
      )
      .select("id,verified,created_at")
      .maybeSingle();
    if (error) throw new Error(`rag.propose_candidate failed: ${error.message}`);
    return {
      output: {
        candidate_id: row?.id ?? null,
        stored: true,
        verified: false,
        retrieval_eligible: false,
        review_required: true,
      },
    };
  },
};

const secUpdateWorkOrderInputSchema = z.object({
  id: z.string().uuid(),
  status: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

const secUpdateWorkOrder: ToolExecutor = {
  id: "sec.update_work_order",
  idempotent: false,
  input: secUpdateWorkOrderInputSchema,
  async execute(input, ctx) {
    const data = input as z.infer<typeof secUpdateWorkOrderInputSchema>;
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    if (!Object.keys(patch).length) {
      throw new Error("No fields to update");
    }
    // Same tenant rule as sql.read: the client may be service-role, so the
    // row must be matched inside the verified org — never by id alone.
    const orgId = await resolveActorOrgId(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: before, error: readError } = await (ctx.supabase as any)
      .from("sec_work_orders")
      .select("status,assigned_to")
      .eq("id", data.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (readError) throw new Error(`update_work_order failed: ${readError.message}`);
    // An update that matches nothing must not be reported as `ok: true`.
    if (!before)
      throw new Error("update_work_order failed: work order not found in this organization");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (ctx.supabase as any)
      .from("sec_work_orders")
      .update(patch)
      .eq("id", data.id)
      .eq("org_id", orgId);
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
    const orgId = await resolveActorOrgId(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx.supabase as any)
      .from("sec_work_orders")
      .update(p.before)
      .eq("id", p.id)
      .eq("org_id", orgId);
  },
};

/* ----------------------------- Disabled stubs --------------------------- */

function disabledExecutor(id: string, reason: string): ToolExecutor {
  return {
    id,
    disabled: true,
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
    kbSearch,
    ragSearchVerified,
    ragRecordGap,
    ragProposeCandidate,
    disabledExecutor("sap.execute", "SAP connector not linked"),
    disabledExecutor("oracle.execute", "Oracle connector not linked"),
    disabledExecutor("azure_ad.execute", "Azure AD admin grant not configured"),
    disabledExecutor("n8n.execute", "n8n MCP workflow not yet bound"),
  ].map((e) => [e.id, e]),
);

export function getExecutor(toolId: string): ToolExecutor | null {
  return REGISTRY[toolId] ?? null;
}

/** Resolves the executor's `idempotent` flag for one concrete input; unset ⇒ false. */
export function isIdempotentCall(executor: ToolExecutor, input: unknown): boolean {
  const flag = executor.idempotent;
  if (typeof flag === "function") return flag(input) === true;
  return flag === true;
}

export function listExecutorIds(): string[] {
  return Object.entries(REGISTRY)
    .filter(([, executor]) => !executor.disabled)
    .map(([id]) => id);
}
