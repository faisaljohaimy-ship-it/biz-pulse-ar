import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SP_GW = "https://connector-gateway.lovable.dev/microsoft_sharepoint";
const TEAMS_GW = "https://connector-gateway.lovable.dev/microsoft_teams";

// ─── Structured error envelope ────────────────────────────────────────────
// We serialize a JSON envelope into Error.message so the client can parse it
// and render a precise, localized message + remediation hint per stage.
export type PublishStage =
  | "config"
  | "authorization"
  | "validation"
  | "sharepoint_upload"
  | "sharepoint_link"
  | "teams_post"
  | "unknown";

export type PublishErrorEnvelope = {
  __publishError: true;
  stage: PublishStage;
  status?: number;
  code?: string;
  message_en: string;
  message_ar: string;
  hint_en?: string;
  hint_ar?: string;
  raw?: string;
};

function fail(env: Omit<PublishErrorEnvelope, "__publishError">): never {
  const payload: PublishErrorEnvelope = { __publishError: true, ...env };
  throw new Error(JSON.stringify(payload));
}

async function failFromResponse(stage: PublishStage, res: Response): Promise<never> {
  const status = res.status;
  let raw = "";
  let code = "";
  let providerMsg = "";
  try {
    raw = await res.text();
    const j = raw ? JSON.parse(raw) : null;
    code = j?.error?.code ?? j?.code ?? "";
    providerMsg = j?.error?.message ?? j?.message ?? "";
  } catch { /* keep raw as text */ }

  if (status === 401 || code === "unauthorized" || code === "lovable_api_key_not_registered") {
    fail({
      stage, status, code: code || "unauthorized",
      message_en: "Microsoft 365 connection rejected the request (401).",
      message_ar: "رفض اتصال Microsoft 365 الطلب (401).",
      hint_en: "Reconnect the Microsoft connector (SharePoint/Teams) from Project → Connectors and try again.",
      hint_ar: "أعد توصيل موصّل Microsoft (SharePoint/Teams) من إعدادات المشروع ثم أعد المحاولة.",
      raw: raw.slice(0, 400),
    });
  }
  if (status === 403 || code === "accessDenied" || code === "Forbidden" || code === "authorizationRequestDenied") {
    const isUpload = stage === "sharepoint_upload" || stage === "sharepoint_link";
    fail({
      stage, status, code: code || "accessDenied",
      message_en: isUpload ? "Permission denied on this SharePoint site." : "Permission denied posting to this Teams channel.",
      message_ar: isUpload ? "صلاحية غير كافية على موقع SharePoint هذا." : "صلاحية غير كافية للنشر في قناة Teams هذه.",
      hint_en: isUpload
        ? "The connected Microsoft account needs Edit/Contribute permission on the chosen site (Sites.ReadWrite.All scope)."
        : "The connected Microsoft account must be a member of this team with ChannelMessage.Send permission.",
      hint_ar: isUpload
        ? "يحتاج حساب Microsoft الموصّل صلاحية Edit/Contribute على الموقع المختار (Sites.ReadWrite.All)."
        : "يجب أن يكون حساب Microsoft الموصّل عضواً في الفريق مع صلاحية ChannelMessage.Send.",
      raw: raw.slice(0, 400),
    });
  }
  if (status === 404 || code === "itemNotFound" || code === "ResourceNotFound") {
    fail({
      stage, status, code: code || "itemNotFound",
      message_en: stage === "teams_post" ? "Team or channel not found." : "SharePoint site or folder not found.",
      message_ar: stage === "teams_post" ? "لم يتم العثور على الفريق أو القناة." : "لم يتم العثور على موقع SharePoint أو المجلد.",
      hint_en: "Refresh the list and pick a destination the connected account still has access to.",
      hint_ar: "حدّث القائمة واختر وجهة لا يزال الحساب الموصّل يملك صلاحية الوصول إليها.",
      raw: raw.slice(0, 400),
    });
  }
  if (status === 413 || code === "maxRequestLengthExceeded" || code === "EntityTooLarge") {
    fail({
      stage, status, code: code || "maxRequestLengthExceeded",
      message_en: "Report is too large to upload in a single request.",
      message_ar: "حجم التقرير كبير جداً للرفع في طلب واحد.",
      hint_en: "Trim the summary/sections to under ~4 MB or split it into multiple reports.",
      hint_ar: "قلّل حجم الملخص/الأقسام إلى أقل من 4 ميجابايت أو قسّم التقرير.",
      raw: raw.slice(0, 400),
    });
  }
  if (status === 429 || code === "TooManyRequests" || code === "activityLimitReached") {
    fail({
      stage, status, code: code || "TooManyRequests",
      message_en: "Microsoft Graph rate limit reached.",
      message_ar: "تم بلوغ حد الطلبات في Microsoft Graph.",
      hint_en: "Wait a minute and retry — repeated bursts trigger throttling per Microsoft 365 tenant.",
      hint_ar: "انتظر دقيقة ثم أعد المحاولة — تكرار الطلبات السريع يسبب الحد من قبل Microsoft 365.",
      raw: raw.slice(0, 400),
    });
  }
  if (status === 507 || code === "quotaLimitReached" || code === "insufficientStorage") {
    fail({
      stage, status, code: code || "quotaLimitReached",
      message_en: "SharePoint storage quota exceeded.",
      message_ar: "تم تجاوز حصة التخزين في SharePoint.",
      hint_en: "Free up space on the destination site or pick another site.",
      hint_ar: "حرّر مساحة على الموقع المختار أو اختر موقعاً آخر.",
      raw: raw.slice(0, 400),
    });
  }
  if (status >= 500) {
    fail({
      stage, status, code: code || "serverError",
      message_en: "Microsoft Graph is temporarily unavailable.",
      message_ar: "خدمة Microsoft Graph غير متاحة مؤقتاً.",
      hint_en: "Retry in a few seconds. If it persists, check the Microsoft 365 service health dashboard.",
      hint_ar: "أعد المحاولة بعد ثوانٍ. إذا استمر، راجع لوحة حالة خدمة Microsoft 365.",
      raw: raw.slice(0, 400),
    });
  }

  fail({
    stage, status, code: code || `http_${status}`,
    message_en: providerMsg || `Microsoft Graph request failed (${status}).`,
    message_ar: providerMsg || `فشل طلب Microsoft Graph (${status}).`,
    raw: raw.slice(0, 400),
  });
}

function spHeaders() {
  const k = process.env.LOVABLE_API_KEY;
  const sp = process.env.MICROSOFT_SHAREPOINT_API_KEY;
  if (!k || !sp) {
    fail({
      stage: "config",
      message_en: "SharePoint connector is not configured.",
      message_ar: "موصّل SharePoint غير مُهيّأ.",
      hint_en: "Link Microsoft SharePoint under Project → Connectors.",
      hint_ar: "اربط موصّل Microsoft SharePoint من إعدادات المشروع.",
    });
  }
  return { Authorization: `Bearer ${k}`, "X-Connection-Api-Key": sp };
}
function teamsHeaders() {
  const k = process.env.LOVABLE_API_KEY;
  const t = process.env.MICROSOFT_TEAMS_API_KEY;
  if (!k || !t) {
    fail({
      stage: "config",
      message_en: "Microsoft Teams connector is not configured.",
      message_ar: "موصّل Microsoft Teams غير مُهيّأ.",
      hint_en: "Link Microsoft Teams under Project → Connectors.",
      hint_ar: "اربط موصّل Microsoft Teams من إعدادات المشروع.",
    });
  }
  return { Authorization: `Bearer ${k}`, "X-Connection-Api-Key": t };
}

async function spJson(stage: PublishStage, path: string, init?: RequestInit) {
  const r = await fetch(`${SP_GW}${path}`, {
    ...init,
    headers: { ...spHeaders(), "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) await failFromResponse(stage, r);
  return r.json();
}

function buildReportHtml(input: {
  title: string;
  subtitle?: string;
  summary?: string;
  generatedAt: string;
  authorEmail?: string;
  sections?: Array<{ heading: string; body: string }>;
}) {
  const sections = (input.sections ?? [])
    .map(
      (s) =>
        `<section><h2 style="font:600 18px/1.3 system-ui;margin:24px 0 8px;color:#0f172a">${escapeHtml(
          s.heading,
        )}</h2><div style="font:14px/1.7 system-ui;color:#334155;white-space:pre-wrap">${escapeHtml(s.body)}</div></section>`,
    )
    .join("");
  return `<!doctype html><html dir="auto"><head><meta charset="utf-8"><title>${escapeHtml(
    input.title,
  )}</title></head><body style="margin:0;background:#f8fafc;padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
    <div style="max-width:880px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(15,23,42,.08);padding:40px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:24px">
        <div>
          <div style="font:600 11px/1 system-ui;letter-spacing:.18em;color:#6366f1;text-transform:uppercase">NEXUS AI OS · Executive Report</div>
          <h1 style="font:700 26px/1.2 system-ui;margin:8px 0 4px;color:#0f172a">${escapeHtml(input.title)}</h1>
          ${input.subtitle ? `<div style="font:14px/1.4 system-ui;color:#64748b">${escapeHtml(input.subtitle)}</div>` : ""}
        </div>
        <div style="text-align:right;font:12px/1.5 system-ui;color:#64748b">
          <div>${escapeHtml(new Date(input.generatedAt).toLocaleString())}</div>
          ${input.authorEmail ? `<div>${escapeHtml(input.authorEmail)}</div>` : ""}
        </div>
      </div>
      ${
        input.summary
          ? `<div style="font:15px/1.7 system-ui;color:#0f172a;background:#f1f5f9;padding:16px 20px;border-radius:12px;white-space:pre-wrap">${escapeHtml(
              input.summary,
            )}</div>`
          : ""
      }
      ${sections}
      <footer style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font:11px/1.5 system-ui;color:#94a3b8">
        Generated by NEXUS AI OS — Executive Operating System.
      </footer>
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function safeFileName(s: string) {
  const base = s.replace(/[^\w\-. \u0600-\u06FF]+/g, "_").slice(0, 80) || "report";
  return base.endsWith(".html") ? base : `${base}.html`;
}

/**
 * Publishes an executive report:
 *  1. Authorizes (admin role required)
 *  2. Generates branded HTML
 *  3. Uploads to a SharePoint site under "NEXIOS Reports/"
 *  4. Creates an organization-scoped share link
 *  5. Posts the link to a Teams channel
 *  6. Records an audit log entry
 */
export const publishExecutiveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      siteId: string;
      teamId: string;
      channelId: string;
      title: string;
      subtitle?: string;
      summary?: string;
      sections?: Array<{ heading: string; body: string }>;
      filename?: string;
      briefingId?: string;
    }) => {
      if (!d?.siteId) throw new Error("Missing siteId");
      if (!d?.teamId || !d?.channelId) throw new Error("Missing Teams channel");
      if (!d?.title || d.title.length > 240) throw new Error("Invalid title");
      if (d.summary && d.summary.length > 20000) throw new Error("Summary too long");
      if (d.sections && d.sections.length > 30) throw new Error("Too many sections");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // ── Authorization: must be 'admin' ───────────────────────────────────────
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(`Authorization check failed: ${roleErr.message}`);
    if (!isAdmin) throw new Error("Forbidden: executive report publishing requires admin role");

    const generatedAt = new Date().toISOString();
    const authorEmail = (claims?.email as string | undefined) ?? undefined;

    const html = buildReportHtml({
      title: data.title,
      subtitle: data.subtitle,
      summary: data.summary,
      generatedAt,
      authorEmail,
      sections: data.sections,
    });
    const filename = safeFileName(data.filename ?? `${data.title}-${generatedAt.slice(0, 10)}`);

    // ── 1. Upload to SharePoint ──────────────────────────────────────────────
    const uploadPath = `/sites/${encodeURIComponent(
      data.siteId,
    )}/drive/root:/NEXIOS%20Reports/${encodeURIComponent(filename)}:/content`;
    const up = await fetch(`${SP_GW}${uploadPath}`, {
      method: "PUT",
      headers: { ...spHeaders(), "Content-Type": "text/html; charset=utf-8" },
      body: html,
    });
    if (!up.ok) throw new Error(`SharePoint upload ${up.status}: ${(await up.text()).slice(0, 300)}`);
    const item = (await up.json()) as { id: string; name: string; webUrl: string; size: number };

    // ── 2. Org-scoped view link ──────────────────────────────────────────────
    let shareUrl: string | null = null;
    try {
      const link = (await spJson(
        `/sites/${encodeURIComponent(data.siteId)}/drive/items/${item.id}/createLink`,
        { method: "POST", body: JSON.stringify({ type: "view", scope: "organization" }) },
      )) as { link?: { webUrl?: string } };
      shareUrl = link.link?.webUrl ?? null;
    } catch {
      /* fall back to item.webUrl */
    }
    const finalUrl = shareUrl ?? item.webUrl;

    // ── 3. Post link to Teams channel ────────────────────────────────────────
    const teamsHtml = `<div>
      <p><b>📊 Executive Report Published</b></p>
      <p><b>${escapeHtml(data.title)}</b>${data.subtitle ? ` — ${escapeHtml(data.subtitle)}` : ""}</p>
      <p>🕒 ${escapeHtml(new Date(generatedAt).toLocaleString())}${
        authorEmail ? ` · 👤 ${escapeHtml(authorEmail)}` : ""
      }</p>
      <p>🔗 <a href="${escapeHtml(finalUrl)}">Open report in SharePoint</a></p>
    </div>`;
    const teamsRes = await fetch(
      `${TEAMS_GW}/teams/${encodeURIComponent(data.teamId)}/channels/${encodeURIComponent(
        data.channelId,
      )}/messages`,
      {
        method: "POST",
        headers: { ...teamsHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ body: { contentType: "html", content: teamsHtml } }),
      },
    );
    if (!teamsRes.ok) {
      throw new Error(`Teams post ${teamsRes.status}: ${(await teamsRes.text()).slice(0, 300)}`);
    }
    const teamsMsg = (await teamsRes.json()) as { id?: string; webUrl?: string };

    // ── 4. Audit log (best-effort) ───────────────────────────────────────────
    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "executive_report.publish",
        entity: "sharepoint_item",
        entity_id: item.id,
        route: "/executive-reports",
        metadata: {
          title: data.title,
          filename,
          siteId: data.siteId,
          teamId: data.teamId,
          channelId: data.channelId,
          shareUrl: finalUrl,
          teamsMessageId: teamsMsg.id ?? null,
          briefingId: data.briefingId ?? null,
        },
      });
    } catch {
      /* audit log is best-effort */
    }

    return {
      ok: true,
      generatedAt,
      sharepoint: { itemId: item.id, name: item.name, webUrl: item.webUrl, size: item.size, shareUrl: finalUrl },
      teams: { messageId: teamsMsg.id ?? null, messageUrl: teamsMsg.webUrl ?? null },
    };
  });
