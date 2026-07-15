import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex, recordOutboundProviderEvent } from "@/lib/aria/outbound-messaging.server";
import { verifyTwilioSignature } from "@/lib/aria/provider-webhook-signatures.server";

const MAX_BODY_BYTES = 16 * 1024;

function mapTwilioStatus(value: string): "accepted" | "delivered" | "failed" {
  if (value === "delivered" || value === "read") return "delivered";
  if (["failed", "undelivered", "canceled"].includes(value)) return "failed";
  return "accepted";
}

export const Route = createFileRoute("/api/public/hooks/twilio-message-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
        const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL?.trim();
        if (!authToken || !callbackUrl) {
          return Response.json({ error: "webhook_not_configured" }, { status: 503 });
        }
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > MAX_BODY_BYTES) {
          return Response.json({ error: "payload_too_large" }, { status: 413 });
        }
        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
          return Response.json({ error: "payload_too_large" }, { status: 413 });
        }
        const params = new URLSearchParams(rawBody);
        const signature = request.headers.get("x-twilio-signature") ?? "";
        if (
          !signature ||
          !(await verifyTwilioSignature({ authToken, callbackUrl, params, signature }))
        ) {
          return Response.json({ error: "invalid_signature" }, { status: 401 });
        }

        const messageSid = params.get("MessageSid")?.trim();
        const providerStatus = params.get("MessageStatus")?.trim().toLowerCase();
        if (!messageSid || !providerStatus) {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }
        const payloadHash = await sha256Hex(rawBody);
        const outcome = await recordOutboundProviderEvent({
          provider: "twilio",
          providerMessageId: messageSid,
          providerEventId: `twilio:${messageSid}:${providerStatus}:${payloadHash}`,
          eventType: `message.${providerStatus}`,
          status: mapTwilioStatus(providerStatus),
          providerStatus,
          payloadHash,
          failureCode: params.get("ErrorCode")?.slice(0, 64) ?? null,
        });
        if (outcome === "not_found") {
          return Response.json({ error: "message_not_found" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
