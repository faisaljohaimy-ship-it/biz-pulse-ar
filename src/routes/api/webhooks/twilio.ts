import { createFileRoute } from "@tanstack/react-router";
import { recordOutboundProviderEvent } from "@/lib/aria/outbound-messaging.server";
import { verifyTwilioWebhook } from "@/lib/aria/webhook-signatures.server";

const MAX_BODY_BYTES = 32 * 1024;
const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function json(payload: Record<string, unknown>, status = 200): Response {
  return Response.json(payload, { status, headers: HEADERS });
}

function mapTwilioStatus(status: string): "accepted" | "delivered" | "failed" {
  if (status === "delivered" || status === "read") return "delivered";
  if (status === "failed" || status === "undelivered" || status === "canceled")
    return "failed";
  return "accepted";
}

export const Route = createFileRoute("/api/webhooks/twilio")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(length) && length > MAX_BODY_BYTES)
          return json({ ok: false, error: "Webhook body is too large." }, 413);
        if (
          !request.headers
            .get("content-type")
            ?.toLowerCase()
            .includes("application/x-www-form-urlencoded")
        ) {
          return json(
            { ok: false, error: "Webhook media type is invalid." },
            415,
          );
        }
        const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
        const publicUrl = process.env.TWILIO_STATUS_CALLBACK_URL?.trim();
        if (!authToken || !publicUrl)
          return json({ ok: false, error: "Webhook is not configured." }, 503);
        const signature =
          request.headers.get("x-twilio-signature")?.trim() ?? "";
        const rawFormBody = await request.text();
        if (new TextEncoder().encode(rawFormBody).length > MAX_BODY_BYTES)
          return json({ ok: false, error: "Webhook body is too large." }, 413);
        if (
          !(await verifyTwilioWebhook({
            publicUrl,
            rawFormBody,
            signature,
            authToken,
          }))
        ) {
          return json(
            { ok: false, error: "Webhook signature is invalid." },
            401,
          );
        }
        const form = new URLSearchParams(rawFormBody);
        const messageId =
          form.get("MessageSid")?.trim() || form.get("SmsSid")?.trim() || "";
        const providerStatus =
          form.get("MessageStatus")?.trim().toLowerCase() ||
          form.get("SmsStatus")?.trim().toLowerCase() ||
          "unknown";
        const errorCode = form.get("ErrorCode")?.trim() || undefined;
        if (!messageId)
          return json(
            { ok: false, error: "Webhook message ID is missing." },
            400,
          );
        const result = await recordOutboundProviderEvent({
          provider: "twilio",
          providerMessageId: messageId,
          providerEventId: `twilio:${messageId}:${providerStatus}:${errorCode ?? "none"}`,
          eventType: `message.${providerStatus}`,
          status: mapTwilioStatus(providerStatus),
          providerStatus,
          occurredAt: new Date().toISOString(),
          failureCode: errorCode,
        });
        if (result === "not_found")
          return json({ ok: false, retry: true }, 503);
        return json({ ok: true, result });
      },
    },
  },
});
