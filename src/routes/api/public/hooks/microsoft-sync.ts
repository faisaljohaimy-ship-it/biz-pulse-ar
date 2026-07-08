import { createFileRoute } from "@tanstack/react-router";
import { httpFetch } from "@/lib/api/http.server";
import { isApiError } from "@/lib/api";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

type IntegrationRow = {
  id: string;
  org_id: string;
  sync_outlook_enabled: boolean;
  sync_sharepoint_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  default_site_id: string | null;
};

async function callGraph(
  connector: string,
  path: string,
  lovableKey: string,
  connectorKey: string,
) {
  try {
    const r = await httpFetch(`${GATEWAY_URL}/${connector}${path}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectorKey,
      },
      label: `graph/${connector}`,
      timeoutMs: 20_000,
      retries: 2,
    });
    const text = await r.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    return { ok: r.ok, status: r.status, body, text };
  } catch (err) {
    const msg = isApiError(err) ? `${err.code}:${err.message}` : String(err);
    return { ok: false, status: 0, body: null, text: msg };
  }
}

export const Route = createFileRoute("/api/public/hooks/microsoft-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.MICROSOFT_SYNC_HOOK_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        const provided = auth.startsWith("Bearer ")
          ? auth.slice(7)
          : (request.headers.get("x-sync-secret") ?? "");
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        const outlookKey = process.env.MICROSOFT_OUTLOOK_API_KEY;
        const sharepointKey = process.env.MICROSOFT_SHAREPOINT_API_KEY;
        if (!lovableKey) {
          return new Response(JSON.stringify({ error: "missing_lovable_key" }), { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Pick orgs eligible for a run (interval elapsed and at least one sync enabled)
        const { data: rows, error } = await supabaseAdmin
          .from("integration_microsoft")
          .select(
            "id, org_id, sync_outlook_enabled, sync_sharepoint_enabled, sync_interval_minutes, last_sync_at, default_site_id",
          )
          .or("sync_outlook_enabled.eq.true,sync_sharepoint_enabled.eq.true");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const now = Date.now();
        const eligible = (rows ?? []).filter((r: IntegrationRow) => {
          const interval = Math.max(1, r.sync_interval_minutes ?? 15) * 60_000;
          const last = r.last_sync_at ? new Date(r.last_sync_at).getTime() : 0;
          return now - last >= interval;
        });

        const results: Array<{ org_id: string; outlook?: unknown; sharepoint?: unknown }> = [];

        for (const row of eligible as IntegrationRow[]) {
          const orgResult: { org_id: string; outlook?: unknown; sharepoint?: unknown } = {
            org_id: row.org_id,
          };
          let aggregateOk = true;
          let aggregateError: string | null = null;

          if (row.sync_outlook_enabled && outlookKey) {
            const t0 = Date.now();
            const r = await callGraph(
              "microsoft_outlook",
              "/me/messages?$top=25&$select=id,subject,from,receivedDateTime,isRead&$orderby=receivedDateTime desc",
              lovableKey,
              outlookKey,
            );
            const count = (r.body as { value?: unknown[] } | null)?.value?.length ?? 0;
            await supabaseAdmin.from("integration_microsoft_sync_log").insert({
              org_id: row.org_id,
              kind: "outlook",
              status: r.ok ? "ok" : "error",
              items_count: count,
              duration_ms: Date.now() - t0,
              error: r.ok ? null : r.text.slice(0, 500),
              details: { http_status: r.status },
            });
            orgResult.outlook = { ok: r.ok, count };
            if (!r.ok) {
              aggregateOk = false;
              aggregateError = `outlook:${r.status}`;
            }
          }

          if (row.sync_sharepoint_enabled && sharepointKey) {
            const t0 = Date.now();
            const path = row.default_site_id
              ? `/sites/${row.default_site_id}/drive/root/children?$top=25&$select=id,name,lastModifiedDateTime,size,webUrl&$orderby=lastModifiedDateTime desc`
              : `/sites/root/drives`;
            const r = await callGraph("microsoft_sharepoint", path, lovableKey, sharepointKey);
            const count = (r.body as { value?: unknown[] } | null)?.value?.length ?? 0;
            await supabaseAdmin.from("integration_microsoft_sync_log").insert({
              org_id: row.org_id,
              kind: "sharepoint",
              status: r.ok ? "ok" : "error",
              items_count: count,
              duration_ms: Date.now() - t0,
              error: r.ok ? null : r.text.slice(0, 500),
              details: {
                http_status: r.status,
                scope: row.default_site_id ? "site_children" : "root_drives",
              },
            });
            orgResult.sharepoint = { ok: r.ok, count };
            if (!r.ok) {
              aggregateOk = false;
              aggregateError =
                (aggregateError ? aggregateError + "; " : "") + `sharepoint:${r.status}`;
            }
          }

          await supabaseAdmin
            .from("integration_microsoft")
            .update({
              last_sync_at: new Date().toISOString(),
              last_sync_status: aggregateOk ? "ok" : "error",
              last_sync_error: aggregateOk ? null : aggregateError,
            })
            .eq("id", row.id);

          results.push(orgResult);
        }

        return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
