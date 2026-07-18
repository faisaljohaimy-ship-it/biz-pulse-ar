import { createFileRoute } from "@tanstack/react-router";
import { recordOutboundProviderEvent } from "@/lib/aria/outbound-messaging.server";
import { verifyResendWebhook } from "@/lib/aria/webhook-signatures.server";

const MAX_BODY_BYTES = 64 * 1024;
const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function json(payload: Record<string, unknown>, status = 200): Response {
  return Response.json(payload, { status, headers: HEADERS });
}

function mapResendStatus(type: string): {
  status: "accepted" | "delivered" | "failed";
  failureCode?: string;
} | null {
  if (type === "email.delivered") return { status: "delivered" };
  if (
    type === "email.failed" ||
    type === "email.bounced" ||
    type === "email.complained" ||
    type === "email.suppressed"
  ) {
    return { status: "failed", failureCode: type };
  }
  if (
    type === "email.sent" ||
    type === "email.delivery_delayed" ||
    type === "email.opened" ||
    type === "email.clicked"
  ) {
    return { status: "accepted" };
  }
  return null;
}

export const Route = createFileRoute("/api/webhooks/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(length) && length > MAX_BODY_BYTES)
          return json({ ok: false, error: "Webhook body is too large." }, 413);
        const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
        if (!secret) return json({ ok: false, error: "Webhook is not configured." }, 503);
        const svixId = request.headers.get("svix-id")?.trim() ?? "";
        const svixTimestamp = request.headers.get("svix-timestamp")?.trim() ?? "";
        const svixSignature = request.headers.get("svix-signature")?.trim() ?? "";
        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES)
          return json({ ok: false, error: "Webhook body is too large." }, 413);
        if (
          !(await verifyResendWebhook({
            rawBody,
            webhookSecret: secret,
            svixId,
            svixTimestamp,
            svixSignature,
          }))
        ) {
          return json({ ok: false, error: "Webhook signature is invalid." }, 401);
        }

        let payload: {
          type?: unknown;
          created_at?: unknown;
          data?: { email_id?: unknown };
        };
        try {
          payload = JSON.parse(rawBody) as typeof payload;
        } catch {
          return json({ ok: false, error: "Webhook JSON is invalid." }, 400);
        }
        const type = typeof payload.type === "string" ? payload.type : "";
        const mapped = mapResendStatus(type);
        if (!mapped) return json({ ok: true, ignored: true });
        const emailId =
          typeof payload.data?.email_id === "string" ? payload.data.email_id.trim() : "";
        if (!emailId) return json({ ok: false, error: "Webhook email ID is missing." }, 400);
        const result = await recordOutboundProviderEvent({
          provider: "resend",
          providerMessageId: emailId,
          providerEventId: svixId,
          eventType: type,
          status: mapped.status,
          providerStatus: type,
          occurredAt: typeof payload.created_at === "string" ? payload.created_at : null,
          failureCode: mapped.failureCode,
        });
        if (result === "not_found") return json({ ok: false, retry: true }, 503);
        return json({ ok: true, result });
      },
    },
  },
});
