// Cron-triggered runner: processes due `report_schedules`.
// Called by pg_cron with `apikey` header == SUPABASE_PUBLISHABLE_KEY.
// Public route — guard the handler ourselves.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/executive-reports-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { buildExecutiveSnapshot } = await import("@/lib/reports/snapshot.server");
        const { buildExecPdf, buildExecXlsx, htmlSummaryFromSnapshot } = await import("@/lib/reports/builder.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("report_schedules")
          .select("*")
          .eq("enabled", true)
          .lte("next_run_at", nowIso)
          .limit(20);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const SP_GW = "https://connector-gateway.lovable.dev/microsoft_sharepoint";
        const OUT_GW = "https://connector-gateway.lovable.dev/microsoft_outlook";
        const lov = process.env.LOVABLE_API_KEY;
        const sp = process.env.MICROSOFT_SHAREPOINT_API_KEY;
        const out = process.env.MICROSOFT_OUTLOOK_API_KEY;

        const results: Array<{ id: string; status: "ok" | "skipped" | "failed"; detail?: string }> = [];

        for (const s of due ?? []) {
          if (!lov || !sp || !out) {
            results.push({ id: s.id, status: "skipped", detail: "connector_not_configured" });
            await supabaseAdmin.from("report_schedules").update({
              last_run_at: nowIso, last_status: "skipped", last_error: "connector_not_configured",
              next_run_at: advance(s.frequency, s.hour_utc, s.weekday),
            }).eq("id", s.id);
            continue;
          }
          try {
            const snap = await buildExecutiveSnapshot(supabaseAdmin, { range: s.range_window as "24h" | "7d" | "30d" });
            const title = s.name;
            const stamp = nowIso.slice(0, 10);
            const ym = nowIso.slice(0, 7);
            const folder = `NEXIOS%20Reports/${ym}`;
            const pdfName = safe(`${title}-${stamp}`, "pdf");
            const xlsxName = safe(`${title}-${stamp}`, "xlsx");
            const pdfBytes = await buildExecPdf(snap, { title });
            const xlsxBytes = buildExecXlsx(snap, { title });

            const pdfItem = await spUpload(SP_GW, lov, sp, s.site_id, folder, pdfName, pdfBytes, "application/pdf");
            const xlsxItem = await spUpload(SP_GW, lov, sp, s.site_id, folder, xlsxName, xlsxBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            const pdfShare = await createLink(SP_GW, lov, sp, s.site_id, pdfItem.id).catch(() => null);
            const xlsxShare = await createLink(SP_GW, lov, sp, s.site_id, xlsxItem.id).catch(() => null);

            const html = htmlSummaryFromSnapshot(snap, { title })
              + `<p style="font:12px/1.6 system-ui;color:#334155;text-align:center"><a href="${pdfShare ?? pdfItem.webUrl}">Open PDF</a> · <a href="${xlsxShare ?? xlsxItem.webUrl}">Open Excel</a></p>`;

            const mailRes = await fetch(`${OUT_GW}/me/sendMail`, {
              method: "POST",
              headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": out, "Content-Type": "application/json" },
              body: JSON.stringify({
                message: {
                  subject: title,
                  body: { contentType: "HTML", content: html },
                  toRecipients: (s.recipients as string[]).map(address => ({ emailAddress: { address } })),
                  attachments: [
                    { "@odata.type": "#microsoft.graph.fileAttachment", name: pdfName, contentType: "application/pdf", contentBytes: b64(pdfBytes) },
                    { "@odata.type": "#microsoft.graph.fileAttachment", name: xlsxName, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", contentBytes: b64(xlsxBytes) },
                  ],
                },
                saveToSentItems: true,
              }),
            });
            if (!mailRes.ok) throw new Error(`outlook_${mailRes.status}: ${(await mailRes.text()).slice(0, 200)}`);

            await supabaseAdmin.from("report_schedules").update({
              last_run_at: nowIso, last_status: "ok", last_error: null,
              last_share_url: pdfShare ?? pdfItem.webUrl,
              next_run_at: advance(s.frequency, s.hour_utc, s.weekday),
            }).eq("id", s.id);

            await supabaseAdmin.from("audit_logs").insert({
              user_id: s.created_by,
              action: "executive_report.scheduled_run",
              entity: "report_schedule",
              entity_id: s.id,
              route: "/api/public/hooks/executive-reports-run",
              metadata: { title, recipients: s.recipients, pdf: pdfShare ?? pdfItem.webUrl, xlsx: xlsxShare ?? xlsxItem.webUrl },
            });

            results.push({ id: s.id, status: "ok" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await supabaseAdmin.from("report_schedules").update({
              last_run_at: nowIso, last_status: "failed", last_error: msg.slice(0, 500),
              next_run_at: advance(s.frequency, s.hour_utc, s.weekday),
            }).eq("id", s.id);
            results.push({ id: s.id, status: "failed", detail: msg.slice(0, 200) });
          }
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

function safe(name: string, ext: string): string {
  const base = name.replace(/[^\w\-. \u0600-\u06FF]+/g, "_").slice(0, 60) || "report";
  return `${base}.${ext}`;
}

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function advance(frequency: string, hour: number, weekday: number | null): string {
  const next = new Date();
  next.setUTCHours(hour, 0, 0, 0);
  if (frequency === "weekly" && weekday != null) {
    do { next.setUTCDate(next.getUTCDate() + 1); } while (next.getUTCDay() !== weekday);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

async function spUpload(GW: string, lov: string, sp: string, siteId: string, folder: string, filename: string, body: Uint8Array, contentType: string) {
  const r = await fetch(`${GW}/sites/${encodeURIComponent(siteId)}/drive/root:/${encodeURI(folder)}/${encodeURIComponent(filename)}:/content`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": sp, "Content-Type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!r.ok) throw new Error(`sharepoint_${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as { id: string; name: string; webUrl: string; size: number };
}

async function createLink(GW: string, lov: string, sp: string, siteId: string, itemId: string): Promise<string | null> {
  const r = await fetch(`${GW}/sites/${encodeURIComponent(siteId)}/drive/items/${itemId}/createLink`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": sp, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "view", scope: "organization" }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { link?: { webUrl?: string } };
  return j.link?.webUrl ?? null;
}
