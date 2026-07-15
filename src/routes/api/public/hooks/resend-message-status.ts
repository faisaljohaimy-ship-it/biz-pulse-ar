import { createFileRoute } from "@tanstack/react-router";
import { sha256Hex, recordOutboundProviderEvent } from "@/lib/aria/outbound-messaging.server";
import { verifyResendSignature } from "@/lib/aria/provider-webhook-signatures.server";

const MAX_BODY_BYTES = 64 * 1024;

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: { email_id?: string };
};

function mapResendStatus(type: string): "accepted" | "delivered" | "failed" {
  if (type === "email.delivered") return "delivered";
  if (["email.bounced", "email.failed", "email.complained"].includes(type)) return "failed";
  return "accepted";
}

export const Route = createFileRoute("/api/public/hooks/resend-message-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
        if (!webhookSecret) {
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
        const messageId = request.headers.get("svix-id") ?? "";
        const timestamp = request.headers.get("svix-timestamp") ?? "";
        const signatureHeader = request.headers.get("svix-signature") ?? "";
        if (
          !messageId ||
          !timestamp ||
          !signatureHeader ||
          !(await verifyResendSignature({
            webhookSecret,
            messageId,
            timestamp,
            signatureHeader,
            rawBody,
          }))
        ) {
          return Response.json({ error: "invalid_signature" }, { status: 401 });
        }

        let event: ResendEvent;
        try {
          event = JSON.parse(rawBody) as ResendEvent;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const type = event.type?.trim().toLowerCase();
        const emailId = event.data?.email_id?.trim();
        if (!type || !emailId) {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }
        const payloadHash = await sha256Hex(rawBody);
        const outcome = await recordOutboundProviderEvent({
          provider: "resend",
          providerMessageId: emailId,
          providerEventId: `resend:${messageId}`,
          eventType: type,
          status: mapResendStatus(type),
          providerStatus: type,
          payloadHash,
          occurredAt: event.created_at ?? null,
          failureCode: mapResendStatus(type) === "failed" ? type : null,
        });
        if (outcome === "not_found") {
          return Response.json({ error: "message_not_found" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
