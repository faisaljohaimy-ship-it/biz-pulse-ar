import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

const LeadSchema = z.object({
  kind: z.enum(["contact", "demo", "book"]),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  team_size: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  source: z.string().trim().max(200).optional().nullable(),
  language: z.string().trim().max(16).optional().nullable(),
  browser: z.string().trim().max(120).optional().nullable(),
  device: z.string().trim().max(120).optional().nullable(),
  timezone: z.string().trim().max(80).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

const INTERNAL_NOTIFY_TO = "Faisaljohaimy@gmail.com";

function fmt(label: string, val: string | null | undefined) {
  return `${label}: ${val && val.trim() ? val : "-"}`;
}

async function sendNotificationEmails(args: {
  requestId: string;
  data: LeadInput;
  country: string | null;
  ip: string | null;
}) {
  const { requestId, data, country } = args;
  const when = new Date().toISOString();
  const kindLabel =
    data.kind === "demo" ? "Enterprise Demo Request" :
    data.kind === "book" ? "Executive Meeting" : "Contact Sales";

  const internalSubject = `🚀 New ${kindLabel} | NEXUS AI OS`;
  const internalText = [
    `New ${kindLabel} — NEXUS AI OS`,
    "",
    fmt("Request ID", requestId),
    fmt("Date & Time (UTC)", when),
    "",
    fmt("Full Name", data.name),
    fmt("Business Email", data.email),
    fmt("Company Name", data.company),
    fmt("Job Title", data.role),
    fmt("Team Size", data.team_size),
    fmt("Requested Use Case", data.notes),
    "",
    fmt("Language", data.language),
    fmt("Browser", data.browser),
    fmt("Device", data.device),
    fmt("Timezone", data.timezone),
    fmt("Country", country),
    fmt("Source", data.source),
  ].join("\n");

  const internalHtml = `
<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#0a1628;color:#e6f4ff;border-radius:16px">
  <div style="border-left:4px solid #00D4FF;padding:8px 16px;margin-bottom:16px">
    <div style="font-size:12px;letter-spacing:2px;color:#3AE8FF;text-transform:uppercase">NEXUS AI OS</div>
    <h2 style="margin:6px 0 0;font-size:22px">🚀 New ${kindLabel}</h2>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${[
      ["Request ID", requestId],
      ["Date & Time (UTC)", when],
      ["Full Name", data.name],
      ["Business Email", data.email],
      ["Company Name", data.company ?? "-"],
      ["Job Title", data.role ?? "-"],
      ["Team Size", data.team_size ?? "-"],
      ["Requested Use Case", (data.notes ?? "-").replace(/\n/g, "<br>")],
      ["Language", data.language ?? "-"],
      ["Browser", data.browser ?? "-"],
      ["Device", data.device ?? "-"],
      ["Timezone", data.timezone ?? "-"],
      ["Country", country ?? "-"],
      ["Source", data.source ?? "-"],
    ].map(([k, v]) =>
      `<tr><td style="padding:8px 12px;color:#7fd4ff;width:160px;vertical-align:top">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #15314a">${v}</td></tr>`
    ).join("")}
  </table>
</div>`.trim();

  const confirmSubject = `✅ We received your request — NEXUS AI OS`;
  const confirmText = [
    `Hello ${data.name},`,
    "",
    "Thank you for reaching out to NEXUS AI OS.",
    "Your request has been received successfully.",
    "Our Enterprise Team will contact you within 24 hours.",
    "",
    `Request reference: ${requestId}`,
    "",
    "— NEXUS AI OS Enterprise Team",
  ].join("\n");

  const confirmHtml = `
<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px;background:#ffffff;color:#0a1628">
  <div style="text-align:center;margin-bottom:18px">
    <div style="display:inline-block;padding:10px 18px;border-radius:999px;background:linear-gradient(90deg,#00D4FF,#3AE8FF);color:#04101e;font-weight:700;letter-spacing:2px;font-size:11px">NEXUS AI OS</div>
  </div>
  <h2 style="margin:0 0 8px;font-size:22px">Thank you, ${data.name}.</h2>
  <p style="margin:0 0 16px;color:#33506b;line-height:1.55">
    Your request has been received successfully. Our Enterprise Team will contact you within 24 hours to schedule your personalized walkthrough.
  </p>
  <div style="background:#f3faff;border:1px solid #cdeaff;border-radius:12px;padding:14px 16px;margin:16px 0">
    <div style="font-size:11px;color:#5b7a93;letter-spacing:1.5px;text-transform:uppercase">Reference</div>
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:16px;color:#0a1628;margin-top:4px">${requestId}</div>
  </div>
  <p style="margin:16px 0 0;color:#5b7a93;font-size:13px">If you need anything in the meantime, just reply to this email.</p>
  <hr style="border:none;border-top:1px solid #e6eef5;margin:22px 0"/>
  <div style="color:#8aa3bb;font-size:12px;text-align:center">© NEXUS AI OS — Enterprise Operating System</div>
</div>`.trim();

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // Provider 1: Resend (preferred when configured)
  if (RESEND_API_KEY) {
    const from = process.env.RESEND_FROM || "NEXUS AI OS <onboarding@resend.dev>";
    const send = (to: string, subject: string, text: string, html: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from, to: [to], subject, text, html, reply_to: data.email }),
      });
    const [internalRes, confirmRes] = await Promise.allSettled([
      send(INTERNAL_NOTIFY_TO, internalSubject, internalText, internalHtml),
      send(data.email, confirmSubject, confirmText, confirmHtml),
    ]);
    return {
      provider: "resend" as const,
      internal_ok: internalRes.status === "fulfilled" && internalRes.value.ok,
      confirm_ok: confirmRes.status === "fulfilled" && confirmRes.value.ok,
    };
  }

  // Provider 2: Resend via Lovable Connector Gateway
  if (LOVABLE_API_KEY && process.env.RESEND_CONNECTION_KEY) {
    const url = "https://connector-gateway.lovable.dev/resend/emails";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.RESEND_CONNECTION_KEY,
    };
    const from = process.env.RESEND_FROM || "NEXUS AI OS <onboarding@resend.dev>";
    const send = (to: string, subject: string, text: string, html: string) =>
      fetch(url, { method: "POST", headers, body: JSON.stringify({ from, to: [to], subject, text, html, reply_to: data.email }) });
    const [internalRes, confirmRes] = await Promise.allSettled([
      send(INTERNAL_NOTIFY_TO, internalSubject, internalText, internalHtml),
      send(data.email, confirmSubject, confirmText, confirmHtml),
    ]);
    return {
      provider: "resend-connector" as const,
      internal_ok: internalRes.status === "fulfilled" && internalRes.value.ok,
      confirm_ok: confirmRes.status === "fulfilled" && confirmRes.value.ok,
    };
  }

  return { provider: "none" as const, internal_ok: false, confirm_ok: false };
}

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LeadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Capture request-side context (server-trusted).
    let ip: string | null = null;
    let country: string | null = null;
    let userAgent: string | null = null;
    try {
      const req = getRequest();
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      country = getRequestHeader("cf-ipcountry") ?? getRequestHeader("x-vercel-ip-country") ?? null;
      userAgent = req?.headers.get("user-agent") ?? null;
    } catch { /* not in request context */ }

    const { data: inserted, error } = await supabaseAdmin
      .from("leads")
      .insert({
        kind: data.kind,
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        role: data.role ?? null,
        team_size: data.team_size ?? null,
        notes: data.notes ?? null,
        source: data.source ?? null,
        language: data.language ?? null,
        browser: data.browser ?? null,
        device: data.device ?? null,
        country: country ?? null,
        ip: ip ?? null,
        user_agent: userAgent,
        metadata: {
          ...(data.metadata ?? {}),
          timezone: data.timezone ?? null,
          submitted_at: new Date().toISOString(),
        } as never,
      })
      .select("id, request_id, created_at")
      .single();

    if (error || !inserted) throw new Error(error?.message || "Failed to save request");
    const requestId = inserted.request_id ?? inserted.id;

    // Fire-and-forget emails with retry; never fail the submission on email errors.
    let emailStatus: { provider: string; internal_ok: boolean; confirm_ok: boolean; error?: string } = {
      provider: "none", internal_ok: false, confirm_ok: false,
    };
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        emailStatus = await sendNotificationEmails({ requestId, data, country, ip });
        if (emailStatus.provider === "none") break; // no provider configured — exit retry loop
        if (emailStatus.internal_ok && emailStatus.confirm_ok) break;
      } catch (err) {
        emailStatus.error = err instanceof Error ? err.message : String(err);
      }
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 400 * attempt));
    }

    // Persist email delivery outcome to metadata for ops review.
    try {
      await supabaseAdmin
        .from("leads")
        .update({
          metadata: {
            ...(data.metadata ?? {}),
            timezone: data.timezone ?? null,
            submitted_at: new Date().toISOString(),
            email_delivery: { ...emailStatus, attempts: attempt },
          } as never,
        })
        .eq("id", inserted.id);
    } catch { /* metadata write failure must not break flow */ }

    if (emailStatus.provider === "none") {
      console.warn("[leads] No email provider configured (set RESEND_API_KEY). Submission stored:", requestId);
    } else if (!emailStatus.internal_ok || !emailStatus.confirm_ok) {
      console.error("[leads] Email delivery partial/failed", { requestId, ...emailStatus });
    }

    return {
      ok: true,
      request_id: requestId,
      created_at: inserted.created_at,
      email_delivered: emailStatus.internal_ok && emailStatus.confirm_ok,
    };
  });
