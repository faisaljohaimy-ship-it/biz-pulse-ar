// Unified Integration Hub — live status, tests, and recent activity across
// all enterprise integrations. Reads real data from Supabase + connector env.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProviderId =
  | "microsoft_outlook"
  | "microsoft_onedrive"
  | "microsoft_sharepoint"
  | "microsoft_teams"
  | "sap"
  | "power_bi";

export type ProviderStatus = {
  id: ProviderId;
  name: string;
  name_ar: string;
  category: string;
  configured: boolean;
  connected: boolean;
  health: "healthy" | "degraded" | "error" | "unknown" | "not_configured";
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  events_24h: number;
  errors_24h: number;
  setup_hint_ar: string;
  setup_hint_en: string;
};

export type IntegrationsOverview = {
  providers: ProviderStatus[];
  totals: {
    total: number;
    connected: number;
    healthy: number;
    degraded: number;
    errors_24h: number;
    events_24h: number;
  };
  generated_at: string;
};

export type SyncEvent = {
  id: string;
  provider: string;
  kind: string;
  status: "ok" | "error" | "skipped" | "info";
  message: string;
  at: string;
  duration_ms: number | null;
  items_count: number | null;
};

const MS_PROVIDERS: Array<{
  id: ProviderId;
  env: string;
  name: string;
  name_ar: string;
  category: string;
  hint_en: string;
  hint_ar: string;
}> = [
  {
    id: "microsoft_outlook",
    env: "MICROSOFT_OUTLOOK_API_KEY",
    name: "Microsoft Outlook",
    name_ar: "مايكروسوفت آوتلوك",
    category: "Email",
    hint_en: "Connect via Integrations Setup → Microsoft Outlook",
    hint_ar: "اتصل عبر إعداد التكاملات → مايكروسوفت آوتلوك",
  },
  {
    id: "microsoft_onedrive",
    env: "MICROSOFT_ONEDRIVE_API_KEY",
    name: "Microsoft OneDrive",
    name_ar: "ون درايف",
    category: "Storage",
    hint_en: "Link OneDrive connector to enable document sync",
    hint_ar: "اربط موصل ون درايف لتفعيل مزامنة الملفات",
  },
  {
    id: "microsoft_sharepoint",
    env: "MICROSOFT_SHAREPOINT_API_KEY",
    name: "SharePoint",
    name_ar: "شير بوينت",
    category: "Docs",
    hint_en: "Link SharePoint connector for shared document sites",
    hint_ar: "اربط موصل شير بوينت لمواقع الملفات المشتركة",
  },
  {
    id: "microsoft_teams",
    env: "MICROSOFT_TEAMS_API_KEY",
    name: "Microsoft Teams",
    name_ar: "مايكروسوفت تيمز",
    category: "Comms",
    hint_en: "Link Teams connector for messages and presence",
    hint_ar: "اربط موصل تيمز للرسائل والحضور",
  },
];

function getPowerBiConfig() {
  const tenantId = process.env.POWERBI_TENANT_ID?.trim();
  const clientId = process.env.POWERBI_CLIENT_ID?.trim();
  const clientSecret = process.env.POWERBI_CLIENT_SECRET?.trim();
  const workspaceId = process.env.POWERBI_WORKSPACE_ID?.trim();
  if (!tenantId || !clientId || !clientSecret || !workspaceId) return null;
  return { tenantId, clientId, clientSecret, workspaceId };
}

function classifyHealth(
  configured: boolean,
  lastTestStatus: string | null,
  errors24h: number,
): ProviderStatus["health"] {
  if (!configured) return "not_configured";
  if (lastTestStatus === "error" || lastTestStatus === "missing_connector") return "error";
  if (errors24h > 3) return "degraded";
  if (lastTestStatus === "ok" && errors24h === 0) return "healthy";
  return "unknown";
}

export const getIntegrationsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationsOverview> => {
    const supabase = context.supabase;
    const now = Date.now();
    const dayAgoIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    // Microsoft integration row (single per org via RLS)
    const { data: msRow } = await supabase
      .from("integration_microsoft")
      .select(
        "last_tested_at,last_test_status,last_test_error,last_sync_at,last_sync_status,sync_outlook_enabled,sync_sharepoint_enabled",
      )
      .maybeSingle();

    // Microsoft sync log — last 24h counts per kind
    const { data: msLog } = await supabase
      .from("integration_microsoft_sync_log")
      .select("kind,status,started_at")
      .gte("started_at", dayAgoIso)
      .limit(500);

    const msCounts: Record<string, { events: number; errors: number }> = {};
    for (const row of msLog ?? []) {
      const k = row.kind ?? "manual";
      if (!msCounts[k]) msCounts[k] = { events: 0, errors: 0 };
      msCounts[k].events += 1;
      if (row.status === "error") msCounts[k].errors += 1;
    }

    // SAP connections
    const { data: sapConns } = await supabase
      .from("sap_connections")
      .select("id,label,enabled,last_test_at,last_test_status,last_test_error");

    const { data: sapLog } = await supabase
      .from("sap_sync_log")
      .select("status,created_at")
      .gte("created_at", dayAgoIso)
      .limit(500);

    let sapEvents = 0;
    let sapErrors = 0;
    for (const row of sapLog ?? []) {
      sapEvents += 1;
      if ((row.status ?? 200) >= 400) sapErrors += 1;
    }

    const providers: ProviderStatus[] = [];

    // Build Microsoft providers
    for (const meta of MS_PROVIDERS) {
      const configured = Boolean(process.env[meta.env]);
      const kindKey =
        meta.id === "microsoft_outlook"
          ? "outlook"
          : meta.id === "microsoft_sharepoint"
            ? "sharepoint"
            : null;
      const counts = kindKey ? msCounts[kindKey] : undefined;
      const events24h = counts?.events ?? 0;
      const errors24h = counts?.errors ?? 0;
      const lastTest = msRow?.last_test_status ?? null;
      providers.push({
        id: meta.id,
        name: meta.name,
        name_ar: meta.name_ar,
        category: meta.category,
        configured,
        connected: configured && lastTest === "ok",
        health: classifyHealth(configured, lastTest, errors24h),
        last_test_at: msRow?.last_tested_at ?? null,
        last_test_status: lastTest,
        last_test_error: msRow?.last_test_error ?? null,
        last_sync_at: msRow?.last_sync_at ?? null,
        last_sync_status: msRow?.last_sync_status ?? null,
        events_24h: events24h,
        errors_24h: errors24h,
        setup_hint_en: meta.hint_en,
        setup_hint_ar: meta.hint_ar,
      });
    }

    // SAP aggregate provider
    const anySapEnabled = (sapConns ?? []).some((c) => c.enabled);
    const latestSapTest = (sapConns ?? [])
      .filter((c) => c.last_test_at)
      .sort((a, b) => (b.last_test_at ?? "").localeCompare(a.last_test_at ?? ""))[0];

    providers.push({
      id: "sap",
      name: "SAP S/4HANA",
      name_ar: "SAP S/4HANA",
      category: "ERP",
      configured: (sapConns ?? []).length > 0,
      connected: anySapEnabled && latestSapTest?.last_test_status === "ok",
      health: classifyHealth(
        (sapConns ?? []).length > 0,
        latestSapTest?.last_test_status ?? null,
        sapErrors,
      ),
      last_test_at: latestSapTest?.last_test_at ?? null,
      last_test_status: latestSapTest?.last_test_status ?? null,
      last_test_error: latestSapTest?.last_test_error ?? null,
      last_sync_at: null,
      last_sync_status: null,
      events_24h: sapEvents,
      errors_24h: sapErrors,
      setup_hint_en: "Add a SAP connection in Admin → SAP",
      setup_hint_ar: "أضف اتصال SAP من الإدارة → SAP",
    });

    const powerBiConfigured = Boolean(getPowerBiConfig());
    providers.push({
      id: "power_bi",
      name: "Power BI",
      name_ar: "باور بي آي",
      category: "Analytics",
      configured: powerBiConfigured,
      connected: false,
      health: powerBiConfigured ? "unknown" : "not_configured",
      last_test_at: null,
      last_test_status: null,
      last_test_error: null,
      last_sync_at: null,
      last_sync_status: null,
      events_24h: 0,
      errors_24h: 0,
      setup_hint_en: "Link Power BI connector to enable embedded reports",
      setup_hint_ar: "اربط موصل باور بي آي لتفعيل التقارير المدمجة",
    });

    const totals = {
      total: providers.length,
      connected: providers.filter((p) => p.connected).length,
      healthy: providers.filter((p) => p.health === "healthy").length,
      degraded: providers.filter((p) => p.health === "degraded" || p.health === "error").length,
      errors_24h: providers.reduce((s, p) => s + p.errors_24h, 0),
      events_24h: providers.reduce((s, p) => s + p.events_24h, 0),
    };

    return { providers, totals, generated_at: new Date().toISOString() };
  });

export const listRecentIntegrationEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncEvent[]> => {
    const supabase = context.supabase;

    const [msRes, sapRes] = await Promise.all([
      supabase
        .from("integration_microsoft_sync_log")
        .select("id,kind,status,items_count,duration_ms,error,details,started_at")
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("sap_sync_log")
        .select("id,entity,method,path,status,items_count,duration_ms,error,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const events: SyncEvent[] = [];

    for (const row of msRes.data ?? []) {
      events.push({
        id: `ms-${row.id}`,
        provider: `Microsoft ${row.kind}`,
        kind: row.kind ?? "sync",
        status: row.status === "ok" ? "ok" : row.status === "error" ? "error" : "skipped",
        message:
          row.error ??
          (typeof row.details === "string" ? row.details : `${row.items_count ?? 0} items`),
        at: row.started_at,
        duration_ms: row.duration_ms,
        items_count: row.items_count,
      });
    }

    for (const row of sapRes.data ?? []) {
      const isError = (row.status ?? 200) >= 400 || Boolean(row.error);
      events.push({
        id: `sap-${row.id}`,
        provider: "SAP",
        kind: row.entity,
        status: isError ? "error" : "ok",
        message:
          row.error ??
          `${row.method} ${row.path ?? ""} → ${row.status ?? "?"}${row.items_count ? ` (${row.items_count})` : ""}`,
        at: row.created_at,
        duration_ms: row.duration_ms,
        items_count: row.items_count,
      });
    }

    events.sort((a, b) => b.at.localeCompare(a.at));
    return events.slice(0, 30);
  });

const testSchema = z.object({
  provider: z.enum([
    "microsoft_outlook",
    "microsoft_onedrive",
    "microsoft_sharepoint",
    "microsoft_teams",
    "sap",
    "power_bi",
  ]),
});

export type ProviderTestResult = { ok: boolean; status: number; message: string };

export const testProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => testSchema.parse(d))
  .handler(async ({ data, context }): Promise<ProviderTestResult> => {
    const provider = data.provider;
    const lovableKey = process.env.LOVABLE_API_KEY;

    const { httpFetch } = await import("@/lib/api/http.server");

    // Microsoft providers share MS Graph via connector gateway
    const msMap: Partial<Record<ProviderId, { env: string; path: string }>> = {
      microsoft_outlook: { env: "MICROSOFT_OUTLOOK_API_KEY", path: "/me" },
      microsoft_onedrive: { env: "MICROSOFT_ONEDRIVE_API_KEY", path: "/v1.0/me/drive" },
      microsoft_sharepoint: { env: "MICROSOFT_SHAREPOINT_API_KEY", path: "/v1.0/sites/root" },
      microsoft_teams: { env: "MICROSOFT_TEAMS_API_KEY", path: "/v1.0/me/joinedTeams?$top=1" },
    };
    const ms = msMap[provider];
    if (ms) {
      if (!lovableKey) return { ok: false, status: 0, message: "Lovable API key missing" };
      const key = process.env[ms.env];
      if (!key) return { ok: false, status: 0, message: `${provider} connector not linked` };
      const base =
        provider === "microsoft_outlook"
          ? "https://connector-gateway.lovable.dev/microsoft_outlook"
          : `https://connector-gateway.lovable.dev/${provider.replace("microsoft_", "microsoft_")}`;
      try {
        const r = await httpFetch(`${base}${ms.path}`, {
          headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key },
          label: `${provider} test`,
          timeoutMs: 12_000,
          retries: 1,
        });
        const body = await r.text();
        return { ok: r.ok, status: r.status, message: r.ok ? "Connected" : body.slice(0, 400) };
      } catch (e) {
        return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e) };
      }
    }

    if (provider === "sap") {
      const { data: conn } = await context.supabase
        .from("sap_connections")
        .select("id,base_url,enabled")
        .eq("enabled", true)
        .limit(1)
        .maybeSingle();
      if (!conn) return { ok: false, status: 0, message: "No enabled SAP connection" };
      try {
        const r = await httpFetch(`${conn.base_url.replace(/\/$/, "")}/`, {
          method: "HEAD",
          label: "sap reachability",
          timeoutMs: 10_000,
          retries: 0,
        });
        const status = r.status;
        const ok = status < 500;
        await context.supabase
          .from("sap_connections")
          .update({
            last_test_at: new Date().toISOString(),
            last_test_status: ok ? "ok" : "error",
            last_test_error: ok ? null : `HTTP ${status}`,
          })
          .eq("id", conn.id);
        return {
          ok,
          status,
          message: ok ? `SAP endpoint reachable (${status})` : `SAP HTTP ${status}`,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await context.supabase
          .from("sap_connections")
          .update({
            last_test_at: new Date().toISOString(),
            last_test_status: "error",
            last_test_error: msg.slice(0, 500),
          })
          .eq("id", conn.id);
        return { ok: false, status: 0, message: msg };
      }
    }

    if (provider === "power_bi") {
      const config = getPowerBiConfig();
      if (!config) {
        return {
          ok: false,
          status: 0,
          message: "Power BI tenant, client, secret, and workspace are required",
        };
      }

      try {
        const tokenBody = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: "https://analysis.windows.net/powerbi/api/.default",
        });
        const tokenResponse = await httpFetch(
          `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenBody.toString(),
            label: "power-bi oauth",
            timeoutMs: 12_000,
            retries: 1,
          },
        );
        if (!tokenResponse.ok) {
          return { ok: false, status: tokenResponse.status, message: "Power BI OAuth failed" };
        }
        const tokenJson = (await tokenResponse.json()) as { access_token?: string };
        if (!tokenJson.access_token) {
          return { ok: false, status: 502, message: "Power BI access token missing" };
        }

        const reportsResponse = await httpFetch(
          `https://api.powerbi.com/v1.0/myorg/groups/${encodeURIComponent(config.workspaceId)}/reports?$top=1`,
          {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
            label: "power-bi workspace test",
            timeoutMs: 12_000,
            retries: 1,
          },
        );
        return {
          ok: reportsResponse.ok,
          status: reportsResponse.status,
          message: reportsResponse.ok ? "Connected" : "Power BI workspace test failed",
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return { ok: false, status: 0, message: "Unknown provider" };
  });
