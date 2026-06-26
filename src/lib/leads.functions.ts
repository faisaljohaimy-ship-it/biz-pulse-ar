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

async function sendNotificationEmails(args: {
  requestId: string;
  data: LeadInput;
  country: string | null;
  ip: string | null;
}) {
  const { requestId, data, country } = args;
  const submittedAt = new Date().toISOString();
  const { enqueueTemplateEmail } = await import("@/lib/email/enqueue.server");

  const internalData = {
    fullName: data.name,
    email: data.email,
    company: data.company ?? "",
    jobTitle: data.role ?? "",
    teamSize: data.team_size ?? "",
    useCase: data.notes ?? "",
    requestId,
    submittedAt,
    browser: data.browser ?? "",
    device: data.device ?? "",
    country: country ?? "",
    language: data.language ?? "",
    source: data.source ?? "",
  };

  const [internalRes, confirmRes] = await Promise.allSettled([
    enqueueTemplateEmail({
      templateName: "demo-internal",
      recipientEmail: INTERNAL_NOTIFY_TO,
      templateData: internalData,
      idempotencyKey: `lead-internal-${requestId}`,
    }),
    enqueueTemplateEmail({
      templateName: "demo-confirmation",
      recipientEmail: data.email,
      templateData: { name: data.name, requestId },
      idempotencyKey: `lead-confirm-${requestId}`,
    }),
  ]);

  return {
    provider: "lovable-email" as const,
    internal_ok: internalRes.status === "fulfilled" && !!internalRes.value.ok,
    confirm_ok: confirmRes.status === "fulfilled" && !!confirmRes.value.ok,
    internal_error: internalRes.status === "fulfilled" ? internalRes.value.error : String((internalRes as PromiseRejectedResult).reason),
    confirm_error: confirmRes.status === "fulfilled" ? confirmRes.value.error : String((confirmRes as PromiseRejectedResult).reason),
  };
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
