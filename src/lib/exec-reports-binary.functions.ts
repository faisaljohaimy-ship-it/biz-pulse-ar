// Production publisher: builds real PDF + XLSX from live KPIs, archives them
// to SharePoint, and emails via Microsoft Outlook with both files attached.
// Reuses the structured error envelope from exec-reports.functions.ts so the
// existing Executive Reports Error Card renders precise stage diagnostics.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomUUID } from "crypto";
import { httpFetch } from "@/lib/api/http.server";
import { isApiError } from "@/lib/api";
import { hasPlatformRole } from "@/lib/authz.server";
import type { PublishErrorEnvelope, PublishStage } from "./exec-reports.functions";

const SP_GW = "https://connector-gateway.lovable.dev/microsoft_sharepoint";
const OUT_GW = "https://connector-gateway.lovable.dev/microsoft_outlook";

function fail(env: Omit<PublishErrorEnvelope, "__publishError" | "requestId">): never {
  const payload: PublishErrorEnvelope = { __publishError: true, requestId: randomUUID(), ...env };
  throw new Error(JSON.stringify(payload));
}

async function failFromResponse(stage: PublishStage, res: Response): Promise<never> {
  const status = res.status;
  let raw = "",
    code = "",
    providerMsg = "";
  try {
    raw = await res.text();
    const j = raw ? JSON.parse(raw) : null;
    code = j?.error?.code ?? j?.code ?? "";
    providerMsg = j?.error?.message ?? j?.message ?? "";
  } catch {
    /* keep raw */
  }
  fail({
    stage,
    status,
    code: code || `http_${status}`,
    message_en: providerMsg || `Microsoft Graph request failed (${status}).`,
    message_ar: providerMsg || `فشل طلب Microsoft Graph (${status}).`,
    raw: raw.slice(0, 400),
  });
}

function spHeaders() {
  const k = process.env.LOVABLE_API_KEY,
    sp = process.env.MICROSOFT_SHAREPOINT_API_KEY;
  if (!k || !sp)
    fail({
      stage: "config",
      message_en: "SharePoint connector is not configured.",
      message_ar: "موصّل SharePoint غير مُهيّأ.",
      hint_en: "Link Microsoft SharePoint under Project → Connectors.",
      hint_ar: "اربط موصّل Microsoft SharePoint من إعدادات المشروع.",
    });
  return { Authorization: `Bearer ${k}`, "X-Connection-Api-Key": sp };
}

function outlookHeaders() {
  const k = process.env.LOVABLE_API_KEY,
    o = process.env.MICROSOFT_OUTLOOK_API_KEY;
  if (!k || !o)
    fail({
      stage: "config",
      message_en: "Microsoft Outlook connector is not configured.",
      message_ar: "موصّل Microsoft Outlook غير مُهيّأ.",
      hint_en: "Link Microsoft Outlook under Project → Connectors.",
      hint_ar: "اربط موصّل Microsoft Outlook من إعدادات المشروع.",
    });
  return { Authorization: `Bearer ${k}`, "X-Connection-Api-Key": o };
}

function safeName(s: string, ext: string): string {
  const base = s.replace(/[^\w\-. \u0600-\u06FF]+/g, "_").slice(0, 60) || "report";
  return `${base}.${ext}`;
}

function toBase64(bytes: Uint8Array): string {
  // Worker runtime: Buffer is available via nodejs_compat.
  return Buffer.from(bytes).toString("base64");
}

async function spUploadBinary(
  stage: PublishStage,
  siteId: string,
  folderPath: string,
  filename: string,
  body: Uint8Array,
  contentType: string,
) {
  const path = `/sites/${encodeURIComponent(siteId)}/drive/root:/${encodeURI(folderPath)}/${encodeURIComponent(filename)}:/content`;
  let r: Response;
  try {
    r = await httpFetch(`${SP_GW}${path}`, {
      method: "PUT",
      headers: { ...spHeaders(), "Content-Type": contentType },
      body: body as unknown as BodyInit,
      label: "sharepoint/upload",
      timeoutMs: 60_000,
      retries: 1,
    });
  } catch (e) {
    const msg = isApiError(e) ? e.message : String(e);
    fail({
      stage,
      code: isApiError(e) ? e.code : "upstream_failed",
      message_en: `SharePoint upload network failure: ${msg}`,
      message_ar: `فشل اتصال SharePoint: ${msg}`,
    });
  }
  if (!r.ok) await failFromResponse(stage, r);
  return (await r.json()) as { id: string; name: string; webUrl: string; size: number };
}

async function spCreateLink(siteId: string, itemId: string): Promise<string | null> {
  let r: Response;
  try {
    r = await httpFetch(
      `${SP_GW}/sites/${encodeURIComponent(siteId)}/drive/items/${itemId}/createLink`,
      {
        method: "POST",
        headers: { ...spHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type: "view", scope: "organization" }),
        label: "sharepoint/createLink",
        timeoutMs: 15_000,
        retries: 1,
      },
    );
  } catch {
    return null;
  }
  if (!r.ok) return null;
  const j = (await r.json()) as { link?: { webUrl?: string } };
  return j.link?.webUrl ?? null;
}

export type PublishBinaryInput = {
  siteId: string;
  title: string;
  subtitle?: string;
  range: "24h" | "7d" | "30d";
  recipients: string[];
  filenamePrefix?: string;
  scheduleId?: string;
};

export type PublishBinaryResult = {
  ok: true;
  generatedAt: string;
  pdf: { itemId: string; name: string; size: number; webUrl: string; shareUrl: string | null };
  xlsx: { itemId: string; name: string; size: number; webUrl: string; shareUrl: string | null };
  outlook: { recipients: string[]; messageId: string | null };
};

export const publishExecutiveReportBinary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: PublishBinaryInput) => {
    if (!d?.siteId)
      fail({
        stage: "validation",
        message_en: "Missing SharePoint site.",
        message_ar: "موقع SharePoint مفقود.",
      });
    if (!d?.title || d.title.length > 240)
      fail({ stage: "validation", message_en: "Invalid title.", message_ar: "العنوان غير صالح." });
    if (!Array.isArray(d.recipients) || d.recipients.length === 0) {
      fail({
        stage: "validation",
        message_en: "At least one recipient is required.",
        message_ar: "يلزم مستلم واحد على الأقل.",
      });
    }
    if (d.recipients.length > 25) {
      fail({
        stage: "validation",
        message_en: "Too many recipients (max 25).",
        message_ar: "عدد المستلمين كبير (الحد 25).",
      });
    }
    const bad = d.recipients.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
    if (bad)
      fail({
        stage: "validation",
        message_en: `Invalid recipient: ${bad}`,
        message_ar: `بريد غير صالح: ${bad}`,
      });
    if (!["24h", "7d", "30d"].includes(d.range)) {
      fail({
        stage: "validation",
        message_en: "Invalid range.",
        message_ar: "نطاق زمني غير صالح.",
      });
    }
    return d;
  })
  .handler(async ({ data, context }): Promise<PublishBinaryResult> => {
    const { supabase, userId, claims } = context;
    const isAdmin = await hasPlatformRole(userId, "admin");
    if (!isAdmin)
      fail({
        stage: "authorization",
        status: 403,
        code: "role_required",
        message_en: "Admin role is required to publish executive reports.",
        message_ar: "نشر التقارير التنفيذية يتطلب صلاحية المسؤول (admin).",
      });

    const { buildExecutiveSnapshot } = await import("@/lib/reports/snapshot.server");
    const { buildExecPdf, buildExecXlsx, htmlSummaryFromSnapshot } =
      await import("@/lib/reports/builder.server");
    const snap = await buildExecutiveSnapshot(supabase, { range: data.range });

    const generatedAt = new Date().toISOString();
    const ym = generatedAt.slice(0, 7);
    const folder = `NEXIOS%20Reports/${ym}`;
    const slug = (data.filenamePrefix ?? data.title) + "-" + generatedAt.slice(0, 10);
    const pdfName = safeName(slug, "pdf");
    const xlsxName = safeName(slug, "xlsx");

    const [pdfBytes, xlsxBytes] = await Promise.all([
      buildExecPdf(snap, { title: data.title, subtitle: data.subtitle }),
      Promise.resolve(buildExecXlsx(snap, { title: data.title })),
    ]);

    // 1) Upload both to SharePoint
    const pdfItem = await spUploadBinary(
      "sharepoint_upload",
      data.siteId,
      folder,
      pdfName,
      pdfBytes,
      "application/pdf",
    );
    const xlsxItem = await spUploadBinary(
      "sharepoint_upload",
      data.siteId,
      folder,
      xlsxName,
      xlsxBytes,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const [pdfShare, xlsxShare] = await Promise.all([
      spCreateLink(data.siteId, pdfItem.id).catch(() => null),
      spCreateLink(data.siteId, xlsxItem.id).catch(() => null),
    ]);

    // 2) Send Outlook mail with attachments + KPI summary body
    const html =
      htmlSummaryFromSnapshot(snap, { title: data.title, subtitle: data.subtitle }) +
      `<p style="font:12px/1.6 system-ui;color:#334155;margin-top:8px;text-align:center">
          <a href="${pdfShare ?? pdfItem.webUrl}">Open PDF in SharePoint</a> ·
          <a href="${xlsxShare ?? xlsxItem.webUrl}">Open Excel in SharePoint</a>
        </p>`;

    const message = {
      message: {
        subject: data.title,
        body: { contentType: "HTML", content: html },
        toRecipients: data.recipients.map((address) => ({ emailAddress: { address } })),
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: pdfName,
            contentType: "application/pdf",
            contentBytes: toBase64(pdfBytes),
          },
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: xlsxName,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            contentBytes: toBase64(xlsxBytes),
          },
        ],
      },
      saveToSentItems: true,
    };

    let mr: Response;
    try {
      mr = await httpFetch(`${OUT_GW}/me/sendMail`, {
        method: "POST",
        headers: { ...outlookHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(message),
        label: "outlook/sendMail",
        timeoutMs: 30_000,
        retries: 1,
      });
    } catch (e) {
      const msg = isApiError(e) ? e.message : String(e);
      fail({
        stage: "teams_post" as PublishStage,
        code: isApiError(e) ? e.code : "upstream_failed",
        message_en: `Report archived to SharePoint, but Outlook network failed: ${msg}`,
        message_ar: `تمت الأرشفة، لكن فشل اتصال Outlook: ${msg}`,
        raw: JSON.stringify({
          pdf: pdfShare ?? pdfItem.webUrl,
          xlsx: xlsxShare ?? xlsxItem.webUrl,
        }),
      });
    }
    if (!mr.ok) {
      // Partial success: SharePoint succeeded; surface error with the share URLs
      let raw = "",
        code = "",
        providerMsg = "";
      try {
        raw = await mr.text();
        const j = raw ? JSON.parse(raw) : null;
        code = j?.error?.code ?? "";
        providerMsg = j?.error?.message ?? "";
      } catch {
        /* ignore */
      }
      fail({
        stage: "teams_post" as PublishStage, // reuse stage taxonomy; UI maps it as "delivery"
        status: mr.status,
        code: code || `http_${mr.status}`,
        message_en: "Report archived to SharePoint, but Outlook delivery failed.",
        message_ar: "تمت أرشفة التقرير في SharePoint، لكن فشل إرساله عبر Outlook.",
        hint_en: providerMsg || "Verify Outlook connector and recipient addresses.",
        hint_ar: providerMsg || "تحقق من موصّل Outlook وعناوين المستلمين.",
        raw: JSON.stringify({
          pdf: pdfShare ?? pdfItem.webUrl,
          xlsx: xlsxShare ?? xlsxItem.webUrl,
          providerRaw: raw.slice(0, 300),
        }),
      });
    }

    // Audit log (best-effort)
    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "executive_report.publish_binary",
        entity: "sharepoint_item",
        entity_id: pdfItem.id,
        route: "/executive-reports",
        metadata: {
          title: data.title,
          siteId: data.siteId,
          range: data.range,
          recipients: data.recipients,
          pdf: { itemId: pdfItem.id, shareUrl: pdfShare ?? pdfItem.webUrl, size: pdfItem.size },
          xlsx: {
            itemId: xlsxItem.id,
            shareUrl: xlsxShare ?? xlsxItem.webUrl,
            size: xlsxItem.size,
          },
          scheduleId: data.scheduleId ?? null,
          authorEmail: claims?.email ?? null,
        },
      });
    } catch {
      /* best-effort */
    }

    return {
      ok: true,
      generatedAt,
      pdf: {
        itemId: pdfItem.id,
        name: pdfItem.name,
        size: pdfItem.size,
        webUrl: pdfItem.webUrl,
        shareUrl: pdfShare,
      },
      xlsx: {
        itemId: xlsxItem.id,
        name: xlsxItem.name,
        size: xlsxItem.size,
        webUrl: xlsxItem.webUrl,
        shareUrl: xlsxShare,
      },
      outlook: { recipients: data.recipients, messageId: null },
    };
  });

// ── Schedule CRUD (admin only via RLS) ────────────────────────────────────
export type ReportScheduleRow = {
  id: string;
  org_id: string;
  name: string;
  frequency: "daily" | "weekly";
  hour_utc: number;
  weekday: number | null;
  range_window: "24h" | "7d" | "30d";
  site_id: string;
  team_id: string | null;
  channel_id: string | null;
  recipients: string[];
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_share_url: string | null;
  created_at: string;
  updated_at: string;
};

export const listReportSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReportScheduleRow[]> => {
    const { data, error } = await context.supabase
      .from("report_schedules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReportScheduleRow[];
  });

export type UpsertScheduleInput = {
  id?: string;
  name: string;
  frequency: "daily" | "weekly";
  hour_utc: number;
  weekday?: number | null;
  range_window: "24h" | "7d" | "30d";
  site_id: string;
  recipients: string[];
  enabled: boolean;
};

function computeNextRun(s: {
  frequency: "daily" | "weekly";
  hour_utc: number;
  weekday?: number | null;
}): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), s.hour_utc, 0, 0),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  if (s.frequency === "weekly" && typeof s.weekday === "number") {
    while (next.getUTCDay() !== s.weekday) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

export const upsertReportSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: UpsertScheduleInput) => {
    if (!d?.name || d.name.length > 120) throw new Error("Invalid name");
    if (!["daily", "weekly"].includes(d.frequency)) throw new Error("Invalid frequency");
    if (d.hour_utc < 0 || d.hour_utc > 23) throw new Error("hour_utc must be 0–23");
    if (d.frequency === "weekly" && (d.weekday == null || d.weekday < 0 || d.weekday > 6))
      throw new Error("weekday required");
    if (!["24h", "7d", "30d"].includes(d.range_window)) throw new Error("Invalid range");
    if (!d.site_id) throw new Error("site_id required");
    if (!Array.isArray(d.recipients) || d.recipients.length === 0 || d.recipients.length > 25)
      throw new Error("recipients 1–25");
    const bad = d.recipients.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));
    if (bad) throw new Error(`Invalid recipient: ${bad}`);
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isAdmin = await hasPlatformRole(userId, "admin");
    if (!isAdmin) throw new Error("Admin role required");

    const next_run_at = computeNextRun({
      frequency: data.frequency,
      hour_utc: data.hour_utc,
      weekday: data.weekday ?? null,
    });
    const row = {
      name: data.name,
      frequency: data.frequency,
      hour_utc: data.hour_utc,
      weekday: data.frequency === "weekly" ? (data.weekday ?? null) : null,
      range_window: data.range_window,
      site_id: data.site_id,
      recipients: data.recipients,
      enabled: data.enabled,
      next_run_at,
    };
    if (data.id) {
      const { data: r, error } = await supabase
        .from("report_schedules")
        .update(row)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return r as ReportScheduleRow;
    }
    const { data: r, error } = await supabase
      .from("report_schedules")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return r as ReportScheduleRow;
  });

export const deleteReportSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isAdmin = await hasPlatformRole(userId, "admin");
    if (!isAdmin) throw new Error("Admin role required");
    const { error } = await supabase.from("report_schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
