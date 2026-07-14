import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";

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

  const internalRecipient = process.env.LEADS_NOTIFY_EMAIL?.trim();
  const internalPromise = internalRecipient
    ? enqueueTemplateEmail({
        templateName: "demo-internal",
        recipientEmail: internalRecipient,
        templateData: internalData,
        idempotencyKey: `lead-internal-${requestId}`,
      })
    : Promise.resolve({ ok: true, error: undefined });

  const [internalRes, confirmRes] = await Promise.allSettled([
    internalPromise,
    enqueueTemplateEmail({
      templateName: "demo-confirmation",
      recipientEmail: data.email,
      templateData: { name: data.name, requestId },
      idempotencyKey: `lead-confirm-${requestId}`,
    }),
  ]);

  return {
    provider: "lovable-email" as const,
    internal_skipped: !internalRecipient,
    internal_ok: internalRes.status === "fulfilled" && !!internalRes.value.ok,
    confirm_ok: confirmRes.status === "fulfilled" && !!confirmRes.value.ok,
    internal_error:
      internalRes.status === "fulfilled"
        ? internalRes.value.error
        : String((internalRes as PromiseRejectedResult).reason),
    confirm_error:
      confirmRes.status === "fulfilled"
        ? confirmRes.value.error
        : String((confirmRes as PromiseRejectedResult).reason),
  };
}

export const submitLead = createServerFn({ method: "POST" })
  .validator((d: unknown) => LeadSchema.parse(d))
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
    } catch {
      /* not in request context */
    }

    // Public lead forms are intentionally anonymous, so abuse protection is
    // keyed by a one-way digest of network context + normalized email.
    const { createHash } = await import("node:crypto");
    const rateKey = createHash("sha256")
      .update(`${ip ?? "unknown"}:${data.email.trim().toLowerCase()}`)
      .digest("hex");
    const rate = await enforceRateLimit(`lead:${rateKey}`, 5, 3600);
    if (rate.unavailable) throw new Error("Lead submission is temporarily unavailable");
    if (!rate.allowed) throw new Error("Too many submissions. Please try again later.");

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

    // Enqueue both confirmation + internal notification via Lovable Email
    // queue. The queue dispatcher handles provider sending + retry/backoff on
    // 429/5xx (5 attempts, then DLQ). We additionally retry the *enqueue*
    // call up to 3 times in case of transient DB errors so a submission is
    // never lost.
    let emailStatus: Awaited<ReturnType<typeof sendNotificationEmails>> & { error?: string } = {
      provider: "lovable-email",
      internal_skipped: !process.env.LEADS_NOTIFY_EMAIL?.trim(),
      internal_ok: false,
      confirm_ok: false,
      internal_error: undefined,
      confirm_error: undefined,
    };
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        emailStatus = await sendNotificationEmails({ requestId, data, country, ip });
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
    } catch {
      /* metadata write failure must not break flow */
    }

    if (!emailStatus.internal_ok || !emailStatus.confirm_ok) {
      console.error("[leads] Email enqueue partial/failed", { requestId, ...emailStatus });
    }

    return {
      ok: true,
      request_id: requestId,
      created_at: inserted.created_at,
      email_delivered: emailStatus.internal_ok && emailStatus.confirm_ok,
    };
  });
