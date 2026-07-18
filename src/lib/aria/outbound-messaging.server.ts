import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { hasAnyPlatformRole, getCurrentOrgIdForUser } from "@/lib/authz.server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
import {
  resolveTwilioConfig,
  sendResendEmail,
  sendTwilioSms,
} from "@/lib/aria/messaging-channel.server";
import {
  assertExplicitOwnerDirectSend,
  isAriaOwnerDirectSendEnabled,
} from "@/lib/aria/outbound-recipient-policy.server";
import { normalizeE164 } from "@/lib/aria/phone-number";

const APPROVAL_TTL_MS = 10 * 60_000;
const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev";

const EmailPayloadSchema = z.object({
  channel: z.literal("email"),
  to: z.string().email(),
  cc: z.string().email().optional(),
  subject: z.string().min(2).max(300),
  html: z.string().min(5).max(120_000),
});

const SmsPayloadSchema = z.object({
  channel: z.literal("sms"),
  to: z.string().min(8).max(24),
  body: z.string().min(1).max(1_600),
  mediaUrls: z
    .array(
      z
        .string()
        .url()
        .refine(
          (value) => value.startsWith("https://"),
          "Media URL must use HTTPS.",
        ),
    )
    .max(10)
    .optional(),
});

export const OutboundPayloadSchema = z.discriminatedUnion("channel", [
  EmailPayloadSchema,
  SmsPayloadSchema,
]);

export type OutboundPayload = z.infer<typeof OutboundPayloadSchema>;
export type OutboundChannel = OutboundPayload["channel"];
export type OutboundLedgerStatus =
  | "pending_approval"
  | "dispatching"
  | "accepted"
  | "delivered"
  | "failed"
  | "cancelled"
  | "expired"
  | "unknown";

type ApprovalClaims = {
  v: 1;
  ledgerId: string;
  actorId: string;
  orgId: string;
  contentHash: string;
  expiresAt: number;
  nonce: string;
};

type LedgerRow = {
  id: string;
  org_id: string;
  actor_id: string;
  channel: OutboundChannel;
  content_hash: string;
  payload_ciphertext: string | null;
  payload_iv: string | null;
  idempotency_key: string;
  status: OutboundLedgerStatus;
  approval_expires_at: string;
  provider: string | null;
  provider_message_id: string | null;
  provider_status: string | null;
};

export type ApprovalPreview = {
  ledgerId: string;
  approvalToken: string;
  expiresAt: string;
  channel: OutboundChannel;
  recipient: string;
  cc?: string;
  subject?: string;
  body: string;
  mediaCount: number;
};

function approvalSecret(): string {
  const value = process.env.ARIA_MESSAGE_APPROVAL_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error(
      "Outbound approval is not configured. Set ARIA_MESSAGE_APPROVAL_SECRET to at least 32 characters.",
    );
  }
  return value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(bytes.length, i + chunk)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * TypeScript 5.7 models a generic Uint8Array buffer as ArrayBufferLike, while
 * WebCrypto deliberately rejects SharedArrayBuffer. Copying into a fresh
 * ArrayBuffer keeps the boundary explicit and works in both Workers and Node.
 */
function cryptoBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return base64ToBytes(padded);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hmacSha256(
  value: string,
  secret = approvalSecret(),
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  );
}

export async function createApprovalToken(
  claims: ApprovalClaims,
): Promise<string> {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const signature = toBase64Url(await hmacSha256(encoded));
  return `${encoded}.${signature}`;
}

export async function verifyApprovalToken(
  token: string,
): Promise<ApprovalClaims> {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra)
    throw new Error("Invalid approval token.");
  const expected = await hmacSha256(encoded);
  const actual = fromBase64Url(signature);
  if (!constantTimeEqual(expected, actual))
    throw new Error("Invalid approval token signature.");
  let claims: ApprovalClaims;
  try {
    claims = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded)),
    ) as ApprovalClaims;
  } catch {
    throw new Error("Invalid approval token payload.");
  }
  if (
    claims.v !== 1 ||
    !claims.ledgerId ||
    !claims.actorId ||
    !claims.orgId ||
    !claims.contentHash ||
    !Number.isFinite(claims.expiresAt)
  ) {
    throw new Error("Invalid approval token claims.");
  }
  if (Date.now() >= claims.expiresAt)
    throw new Error("Approval token has expired.");
  return claims;
}

async function encryptionKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`nexios:aria:outbound:v1:${approvalSecret()}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function additionalData(row: {
  id: string;
  actorId: string;
  orgId: string;
  contentHash: string;
}): Uint8Array {
  return new TextEncoder().encode(
    `${row.id}|${row.actorId}|${row.orgId}|${row.contentHash}|aria-outbound-v1`,
  );
}

async function encryptPayload(
  payload: OutboundPayload,
  row: { id: string; actorId: string; orgId: string; contentHash: string },
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: cryptoBuffer(iv),
      additionalData: cryptoBuffer(additionalData(row)),
    },
    await encryptionKey(),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

async function decryptPayload(row: LedgerRow): Promise<OutboundPayload> {
  if (!row.payload_ciphertext || !row.payload_iv) {
    throw new Error("Outbound payload has already been purged.");
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: cryptoBuffer(base64ToBytes(row.payload_iv)),
      additionalData: cryptoBuffer(
        additionalData({
          id: row.id,
          actorId: row.actor_id,
          orgId: row.org_id,
          contentHash: row.content_hash,
        }),
      ),
    },
    await encryptionKey(),
    cryptoBuffer(base64ToBytes(row.payload_ciphertext)),
  );
  const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  return OutboundPayloadSchema.parse(parsed);
}

function maskRecipient(payload: OutboundPayload): string {
  if (payload.channel === "email") {
    const [local = "", domain = "unknown"] = payload.to.split("@");
    const masked =
      local.length <= 2 ? `${local.slice(0, 1)}*` : `${local.slice(0, 2)}***`;
    return `${masked}@${domain.toLowerCase()}`;
  }
  const digits = payload.to.replace(/\D/g, "");
  return `+***${digits.slice(-4)}`;
}

function htmlToText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Keep provider-bound HTML useful while removing active content. This is a
 * narrow email sanitizer (not a browser DOM sanitizer): scripts, embedded
 * documents, forms, event handlers and javascript: URLs are never dispatched.
 */
function sanitizeEmailHtml(value: string): string {
  return value
    .replace(
      /<(script|iframe|object|embed|form|base|meta|link)\b[\s\S]*?<\/\1\s*>/gi,
      "",
    )
    .replace(
      /<(script|iframe|object|embed|form|base|meta|link)\b[^>]*\/?\s*>/gi,
      "",
    )
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .trim();
}

function normalizeOutboundPayload(
  rawPayload: OutboundPayload,
): OutboundPayload {
  const payload = OutboundPayloadSchema.parse(rawPayload);
  if (payload.channel === "email") {
    return OutboundPayloadSchema.parse({
      ...payload,
      to: payload.to.trim().toLowerCase(),
      ...(payload.cc ? { cc: payload.cc.trim().toLowerCase() } : {}),
      subject: payload.subject.trim(),
      html: sanitizeEmailHtml(payload.html),
    });
  }
  return OutboundPayloadSchema.parse({
    ...payload,
    to: normalizeE164(payload.to),
    body: payload.body.trim(),
  });
}

function previewOf(
  payload: OutboundPayload,
): Omit<ApprovalPreview, "ledgerId" | "approvalToken" | "expiresAt"> {
  return payload.channel === "email"
    ? {
        channel: "email",
        recipient: payload.to,
        ...(payload.cc ? { cc: payload.cc } : {}),
        subject: payload.subject,
        body: htmlToText(payload.html),
        mediaCount: 0,
      }
    : {
        channel: "sms",
        recipient: payload.to,
        body: payload.body,
        mediaCount: payload.mediaUrls?.length ?? 0,
      };
}

function configuredChannel(payload: OutboundPayload): boolean {
  if (payload.channel === "sms") return Boolean(resolveTwilioConfig());
  return Boolean(
    (process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM_EMAIL?.trim()) ||
      outlookHeaders() ||
      managedEmailQueueEnabled(),
  );
}

function managedEmailQueueEnabled(): boolean {
  return (
    process.env.ARIA_ENABLE_MANAGED_EMAIL_QUEUE?.trim().toLowerCase() === "true"
  );
}

function outlookHeaders(): Record<string, string> | null {
  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  const connectionKey = process.env.MICROSOFT_OUTLOOK_API_KEY?.trim();
  if (!lovableKey || !connectionKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function appendLedgerEvent(input: {
  messageId: string;
  orgId: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  status?: string | null;
  payloadHash: string;
  occurredAt?: string | null;
}): Promise<"inserted" | "duplicate"> {
  const { error } = await supabaseAdmin
    .from("aria_outbound_message_events")
    .insert({
      message_id: input.messageId,
      org_id: input.orgId,
      provider: input.provider,
      provider_event_id: input.providerEventId,
      event_type: input.eventType,
      delivery_status: input.status ?? null,
      payload_hash: input.payloadHash,
      occurred_at: input.occurredAt ?? null,
    });
  if (!error) return "inserted";
  if (error.code === "23505") return "duplicate";
  throw new Error(`Unable to persist outbound event: ${error.message}`);
}

async function requireSenderRole(userId: string): Promise<void> {
  if (!(await hasAnyPlatformRole(userId, ["admin", "manager"]))) {
    throw new Error(
      "Forbidden: ARIA outbound messaging requires admin or manager role.",
    );
  }
}

export async function prepareAriaOutboundMessage(
  _supabase: SupabaseClient,
  userId: string,
  rawPayload: OutboundPayload,
): Promise<
  | { ok: true; requiresApproval: true; approval: ApprovalPreview }
  | { ok: false; error: string }
> {
  try {
    await requireSenderRole(userId);
    const draftRate = await enforceRateLimit(
      `aria-outbound-draft:${userId}`,
      30,
      600,
    );
    if (draftRate.unavailable)
      throw new Error("Messaging approval service is temporarily unavailable.");
    if (!draftRate.allowed)
      throw new Error("Rate limit exceeded for ARIA message drafts.");

    const payload = normalizeOutboundPayload(rawPayload);
    if (!configuredChannel(payload)) {
      throw new Error(
        payload.channel === "email"
          ? "Email provider is not configured. Configure Outlook or Resend before requesting approval."
          : "SMS provider is not configured. Configure Twilio before requesting approval.",
      );
    }

    const orgId = await getCurrentOrgIdForUser(userId);
    if (!orgId) throw new Error("Actor is not assigned to an organization.");

    const id = crypto.randomUUID();
    const canonical = JSON.stringify(payload);
    const contentHash = await sha256Hex(canonical);
    const expiresAtMs = Date.now() + APPROVAL_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const encrypted = await encryptPayload(payload, {
      id,
      actorId: userId,
      orgId,
      contentHash,
    });
    const idempotencyKey = `aria-${payload.channel}-${id}`;

    const { error } = await supabaseAdmin
      .from("aria_outbound_messages")
      .insert({
        id,
        org_id: orgId,
        actor_id: userId,
        channel: payload.channel,
        recipient_hint: maskRecipient(payload),
        content_hash: contentHash,
        payload_ciphertext: encrypted.ciphertext,
        payload_iv: encrypted.iv,
        idempotency_key: idempotencyKey,
        status: "pending_approval",
        approval_expires_at: expiresAt,
      });
    if (error)
      throw new Error(`Unable to persist approval request: ${error.message}`);

    try {
      await appendLedgerEvent({
        messageId: id,
        orgId,
        provider: "internal",
        providerEventId: `approval-requested:${id}`,
        eventType: "approval.requested",
        status: "pending_approval",
        payloadHash: contentHash,
        occurredAt: new Date().toISOString(),
      });
    } catch (eventError) {
      // Approval must never exist without its mandatory audit event.
      await supabaseAdmin.from("aria_outbound_messages").delete().eq("id", id);
      throw eventError;
    }

    const approvalToken = await createApprovalToken({
      v: 1,
      ledgerId: id,
      actorId: userId,
      orgId,
      contentHash,
      expiresAt: expiresAtMs,
      nonce: crypto.randomUUID(),
    });

    return {
      ok: true,
      requiresApproval: true,
      approval: {
        ledgerId: id,
        approvalToken,
        expiresAt,
        ...previewOf(payload),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function dispatchEmail(
  payload: z.infer<typeof EmailPayloadSchema>,
  idempotencyKey: string,
) {
  // Prefer the provider with a signed delivery-event channel when both paths
  // are configured. Outlook remains a compatible fallback but its gateway only
  // confirms acceptance, not final mailbox delivery.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (apiKey && from) {
    const result = await sendResendEmail(apiKey, {
      from,
      to: payload.to,
      cc: payload.cc,
      subject: payload.subject,
      html: payload.html,
      idempotencyKey,
    });
    return {
      provider: "resend" as const,
      providerId: result.id,
      status: "accepted",
    };
  }

  const headers = outlookHeaders();
  if (headers) {
    const message: Record<string, unknown> = {
      subject: payload.subject,
      body: { contentType: "HTML", content: payload.html },
      toRecipients: [{ emailAddress: { address: payload.to } }],
    };
    if (payload.cc)
      message.ccRecipients = [{ emailAddress: { address: payload.cc } }];
    const { httpFetch } = await import("@/lib/api/http.server");
    const response = await httpFetch(
      `${OUTLOOK_GATEWAY}/microsoft_outlook/me/sendMail`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ message, saveToSentItems: true }),
        retries: 0,
        label: "ARIA Outlook sendMail",
      },
    );
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 180);
      throw new Error(
        `Outlook HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }
    return {
      provider: "outlook" as const,
      providerId: `outlook-${idempotencyKey}`,
      status: "accepted",
    };
  }

  // Optional fallback: enqueue via the deployment-managed email queue. It is
  // opt-in because the focused bundle cannot prove that its tables, RPC and
  // worker are installed in the target project.
  if (!managedEmailQueueEnabled()) {
    throw new Error("Email provider is not configured.");
  }
  const messageId = crypto.randomUUID();
  const senderDomain = "notify.neexios.com";
  const fromLine = `NEXUS AI OS <noreply@${senderDomain}>`;
  const plain = payload.html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const { error: logError } = await supabaseAdmin
    .from("email_send_log")
    .insert({
      message_id: messageId,
      template_name: "aria_executive_email",
      recipient_email: payload.to,
      status: "pending",
    });
  if (logError)
    throw new Error(`Email send log write failed: ${logError.message}`);
  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: payload.to,
      cc: payload.cc,
      from: fromLine,
      sender_domain: senderDomain,
      subject: payload.subject,
      html: payload.html,
      text: plain,
      purpose: "transactional",
      label: "aria_executive_email",
      idempotency_key: idempotencyKey,
      queued_at: new Date().toISOString(),
    } as never,
  });
  if (enqueueError) {
    throw new Error(`Email queue enqueue failed: ${enqueueError.message}`);
  }
  return {
    provider: "lovable_email_queue" as const,
    providerId: messageId,
    status: "queued",
  };
}

async function dispatchSms(payload: z.infer<typeof SmsPayloadSchema>) {
  const config = resolveTwilioConfig();
  if (!config) throw new Error("Twilio is not configured.");
  const result = await sendTwilioSms(
    { to: payload.to, body: payload.body, mediaUrls: payload.mediaUrls },
    config,
  );
  return {
    provider: "twilio" as const,
    providerId: result.sid,
    status: result.status ?? "queued",
  };
}

function safeFailure(error: unknown): { code: string; detail: string } {
  const detail = (error instanceof Error ? error.message : String(error))
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 300);
  return { code: "provider_dispatch_failed", detail };
}

export async function approveAriaOutboundMessageInternal(input: {
  userId: string;
  ledgerId: string;
  approvalToken: string;
}): Promise<{
  ok: boolean;
  status: OutboundLedgerStatus;
  provider?: string;
  messageId?: string;
  error?: string;
}> {
  await requireSenderRole(input.userId);
  const claims = await verifyApprovalToken(input.approvalToken);
  if (claims.ledgerId !== input.ledgerId || claims.actorId !== input.userId) {
    throw new Error("Approval token does not belong to this request.");
  }

  const { data: current, error: readError } = await supabaseAdmin
    .from("aria_outbound_messages")
    .select(
      "id,org_id,actor_id,channel,content_hash,payload_ciphertext,payload_iv,idempotency_key,status,approval_expires_at,provider,provider_message_id,provider_status",
    )
    .eq("id", input.ledgerId)
    .eq("actor_id", input.userId)
    .maybeSingle();
  if (readError || !current) throw new Error("Approval request was not found.");
  const row = current as LedgerRow;
  if (
    claims.orgId !== row.org_id ||
    claims.contentHash !== row.content_hash ||
    new Date(row.approval_expires_at).getTime() <= Date.now()
  ) {
    if (row.status === "pending_approval") {
      await supabaseAdmin
        .from("aria_outbound_messages")
        .update({ status: "expired" })
        .eq("id", row.id)
        .eq("status", "pending_approval");
    }
    throw new Error("Approval request is expired or no longer valid.");
  }
  if (row.status !== "pending_approval") {
    return {
      ok: row.status === "accepted" || row.status === "delivered",
      status: row.status,
      provider: row.provider ?? undefined,
      messageId: row.provider_message_id ?? undefined,
      error:
        row.status === "dispatching"
          ? "This message is already being dispatched; no duplicate send was attempted."
          : row.status === "unknown"
            ? "The provider outcome requires reconciliation; no duplicate send was attempted."
            : undefined,
    };
  }

  const sendRate = await enforceRateLimit(
    `aria-outbound-send:${input.userId}`,
    10,
    600,
  );
  if (sendRate.unavailable)
    throw new Error("Messaging rate-limit service is temporarily unavailable.");
  if (!sendRate.allowed)
    throw new Error("Rate limit exceeded for ARIA outbound sends.");

  // Atomic one-time claim. Exactly one concurrent approver can transition the
  // row; every other request receives zero rows and therefore cannot call a
  // provider. A stuck dispatch is reconciled manually, never auto-retried.
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("aria_outbound_messages")
    .update({
      status: "dispatching",
      approved_by: input.userId,
      approved_at: now,
    })
    .eq("id", row.id)
    .eq("actor_id", input.userId)
    .eq("status", "pending_approval")
    .gt("approval_expires_at", now)
    .select(
      "id,org_id,actor_id,channel,content_hash,payload_ciphertext,payload_iv,idempotency_key,status,approval_expires_at,provider,provider_message_id,provider_status",
    )
    .maybeSingle();
  if (claimError)
    throw new Error(`Unable to claim approval: ${claimError.message}`);
  if (!claimed) {
    return {
      ok: false,
      status: "unknown",
      error:
        "Approval was already consumed or expired; no duplicate send was attempted.",
    };
  }

  const claimedRow = claimed as LedgerRow;
  const payload = await decryptPayload(claimedRow);
  if ((await sha256Hex(JSON.stringify(payload))) !== claimedRow.content_hash) {
    await supabaseAdmin
      .from("aria_outbound_messages")
      .update({ status: "failed", failure_code: "content_integrity_failed" })
      .eq("id", claimedRow.id);
    throw new Error("Outbound payload integrity verification failed.");
  }

  await appendLedgerEvent({
    messageId: claimedRow.id,
    orgId: claimedRow.org_id,
    provider: "internal",
    providerEventId: `approved:${claimedRow.id}`,
    eventType: "approval.confirmed",
    status: "dispatching",
    payloadHash: claimedRow.content_hash,
    occurredAt: now,
  });

  try {
    const result =
      payload.channel === "email"
        ? await dispatchEmail(payload, claimedRow.idempotency_key)
        : await dispatchSms(payload);
    const delivered = result.status === "delivered";
    const state: OutboundLedgerStatus = delivered ? "delivered" : "accepted";
    const dispatchedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("aria_outbound_messages")
      .update({
        status: state,
        provider: result.provider,
        provider_message_id: result.providerId,
        provider_status: result.status,
        dispatched_at: dispatchedAt,
        delivered_at: delivered ? dispatchedAt : null,
        failure_code: null,
        failure_detail: null,
      })
      .eq("id", claimedRow.id)
      .eq("status", "dispatching");
    if (updateError) {
      // The provider may have accepted the send. Keep the row in dispatching
      // and never retry automatically; this is safer than risking a duplicate.
      return {
        ok: true,
        status: "unknown",
        provider: result.provider,
        messageId: result.providerId,
        error:
          "Provider accepted the message; ledger reconciliation is required.",
      };
    }
    try {
      await appendLedgerEvent({
        messageId: claimedRow.id,
        orgId: claimedRow.org_id,
        provider: result.provider,
        providerEventId: `provider-accepted:${claimedRow.id}`,
        eventType: "provider.accepted",
        status: result.status,
        payloadHash: claimedRow.content_hash,
        occurredAt: dispatchedAt,
      });
    } catch {
      // The provider and primary ledger already confirm acceptance. Never mark
      // this as failed or retry the send because the secondary event write
      // needs reconciliation.
      return {
        ok: true,
        status: state,
        provider: result.provider,
        messageId: result.providerId,
        error:
          "Message accepted; delivery-event audit reconciliation is required.",
      };
    }
    return {
      ok: true,
      status: state,
      provider: result.provider,
      messageId: result.providerId,
    };
  } catch (error) {
    const failure = safeFailure(error);
    await supabaseAdmin
      .from("aria_outbound_messages")
      .update({
        // A thrown provider request can be ambiguous after the one-time claim:
        // the remote service may have accepted it before the connection failed.
        // Keep the outcome unknown and never expose an automatic retry path.
        status: "unknown",
        failure_code: "provider_dispatch_uncertain",
        failure_detail: failure.detail,
      })
      .eq("id", claimedRow.id)
      .eq("status", "dispatching");
    try {
      await appendLedgerEvent({
        messageId: claimedRow.id,
        orgId: claimedRow.org_id,
        provider: "internal",
        providerEventId: `provider-uncertain:${claimedRow.id}`,
        eventType: "provider.outcome_uncertain",
        status: "unknown",
        payloadHash: claimedRow.content_hash,
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // The primary ledger remains the durable source of truth. Event repair
      // is an operator action and must never trigger another provider call.
    }
    return {
      ok: false,
      status: "unknown",
      error: `Provider outcome is uncertain; no retry was attempted. ${failure.detail}`,
    };
  }
}

/**
 * Auto-send switch. ARIA sends email/SMS directly on request WITHOUT a
 * per-message human approval step (owner directive). Every other safety
 * control stays in force: admin/manager role, rate limits, provider-config
 * gate, payload encryption, content-hash integrity, atomic one-time claim,
 * the full audit ledger, and the immutable `approval.auto_approved` bypass
 * marker per send. Live sends still require provider credentials
 * (Resend/Twilio/Outlook), so this alone can never dispatch anything.
 * Default is ON for this owner-only path. ARIA_DIRECT_SEND_ENABLED=false is
 * the deployment kill switch; ARIA_OUTBOUND_AUTO_APPROVE remains a supported
 * legacy alias.
 */
export function ariaAutoApproveEnabled(): boolean {
  return isAriaOwnerDirectSendEnabled();
}

/**
 * Send an ARIA outbound message directly, skipping the human approval gate.
 * Reuses the full prepare→approve pipeline and simply consumes the signed
 * approval token server-side, so the entire integrity/audit machinery still
 * runs — only the human confirmation is removed.
 *
 * Auto-approved sends are marked in the immutable ledger with a distinct
 * `approval.auto_approved` event BEFORE dispatch, so an auditor can always
 * tell an ARIA-bypassed send apart from a human-confirmed one. Consistent with
 * the rest of this module, the send does not proceed if that audit marker
 * cannot be written (no auto-send may exist without its bypass record).
 */
export async function sendAriaOutboundMessageDirectInternal(input: {
  userId: string;
  payload: OutboundPayload;
  /** Current authentic user message; never RAG, memory or generated text. */
  explicitIntentText: string;
}): Promise<
  | {
      ok: true;
      requiresApproval: false;
      status: OutboundLedgerStatus;
      provider?: string;
      messageId?: string;
    }
  | { ok: false; error: string }
> {
  if (!ariaAutoApproveEnabled()) {
    return {
      ok: false,
      error:
        "Direct owner send is disabled by the deployment kill switch. Use the per-message approval flow instead.",
    };
  }

  const payload = normalizeOutboundPayload(input.payload);
  assertExplicitOwnerDirectSend({
    intentText: input.explicitIntentText,
    channel: payload.channel,
    recipient: payload.to,
  });
  if (payload.channel === "email" && payload.cc) {
    // A CC is another delivery target and is outside the direct owner-only
    // request. The reviewed approval route remains available for CC sends.
    throw new Error("Direct owner email does not support CC recipients.");
  }

  const prepared = await prepareAriaOutboundMessage(
    supabaseAdmin,
    input.userId,
    payload,
  );
  if ("error" in prepared) return { ok: false, error: prepared.error };

  // Immutable bypass marker: record that the human approval step was skipped
  // (ARIA_DIRECT_SEND_ENABLED) before any dispatch. The token claims carry
  // the org + content hash the ledger event needs. If this cannot be written,
  // fail closed — never dispatch an auto-approved send without its audit trail.
  try {
    const claims = await verifyApprovalToken(prepared.approval.approvalToken);
    await appendLedgerEvent({
      messageId: prepared.approval.ledgerId,
      orgId: claims.orgId,
      provider: "internal",
      providerEventId: `auto-approved:${prepared.approval.ledgerId}`,
      eventType: "approval.auto_approved",
      status: "pending_approval",
      payloadHash: claims.contentHash,
      occurredAt: new Date().toISOString(),
    });
  } catch (markerError) {
    return {
      ok: false,
      error: `Auto-approval audit marker could not be written; no message was sent. ${
        markerError instanceof Error ? markerError.message : String(markerError)
      }`,
    };
  }

  const result = await approveAriaOutboundMessageInternal({
    userId: input.userId,
    ledgerId: prepared.approval.ledgerId,
    approvalToken: prepared.approval.approvalToken,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Direct send failed." };
  }
  return {
    ok: true,
    requiresApproval: false,
    status: result.status,
    provider: result.provider,
    messageId: result.messageId,
  };
}

export async function cancelAriaOutboundMessageInternal(input: {
  userId: string;
  ledgerId: string;
  approvalToken: string;
}): Promise<{ ok: boolean; status: OutboundLedgerStatus }> {
  await requireSenderRole(input.userId);
  const claims = await verifyApprovalToken(input.approvalToken);
  if (claims.ledgerId !== input.ledgerId || claims.actorId !== input.userId) {
    throw new Error("Approval token does not belong to this request.");
  }
  const { data, error } = await supabaseAdmin
    .from("aria_outbound_messages")
    .update({ status: "cancelled" })
    .eq("id", input.ledgerId)
    .eq("actor_id", input.userId)
    .eq("org_id", claims.orgId)
    .eq("content_hash", claims.contentHash)
    .eq("status", "pending_approval")
    .select("id,org_id,content_hash")
    .maybeSingle();
  if (error) throw new Error(`Unable to cancel approval: ${error.message}`);
  if (!data) return { ok: false, status: "unknown" };
  await appendLedgerEvent({
    messageId: data.id,
    orgId: data.org_id,
    provider: "internal",
    providerEventId: `cancelled:${data.id}`,
    eventType: "approval.cancelled",
    status: "cancelled",
    payloadHash: data.content_hash,
    occurredAt: new Date().toISOString(),
  });
  return { ok: true, status: "cancelled" };
}

function nextLedgerStatus(
  current: OutboundLedgerStatus,
  incoming: OutboundLedgerStatus,
): OutboundLedgerStatus {
  if (current === "delivered") return "delivered";
  if (incoming === "delivered" || incoming === "failed") return incoming;
  if (current === "failed" || current === "cancelled" || current === "expired")
    return current;
  return incoming;
}

export async function recordOutboundProviderEvent(input: {
  provider: "twilio" | "resend";
  providerMessageId: string;
  providerEventId: string;
  eventType: string;
  status: OutboundLedgerStatus;
  providerStatus: string;
  payloadHash?: string;
  occurredAt?: string | null;
  failureCode?: string | null;
}): Promise<"updated" | "duplicate" | "not_found"> {
  const { data, error } = await supabaseAdmin
    .from("aria_outbound_messages")
    .select("id,org_id,status,content_hash")
    .eq("provider", input.provider)
    .eq("provider_message_id", input.providerMessageId)
    .maybeSingle();
  if (error)
    throw new Error(`Unable to locate outbound message: ${error.message}`);
  if (!data) return "not_found";
  if (input.payloadHash && data.content_hash !== input.payloadHash) {
    throw new Error(
      "Provider event payload hash does not match the outbound ledger.",
    );
  }

  const inserted = await appendLedgerEvent({
    messageId: data.id,
    orgId: data.org_id,
    provider: input.provider,
    providerEventId: input.providerEventId,
    eventType: input.eventType,
    status: input.providerStatus,
    payloadHash: data.content_hash,
    occurredAt: input.occurredAt ?? null,
  });
  const current = data.status as OutboundLedgerStatus;
  const status = nextLedgerStatus(current, input.status);
  const now = new Date().toISOString();
  const deliveryUpdate: TablesUpdate<"aria_outbound_messages"> = {
    status,
    provider_status: input.providerStatus,
  };
  if (input.status === "delivered") {
    deliveryUpdate.delivered_at = input.occurredAt ?? now;
    deliveryUpdate.failure_code = null;
    deliveryUpdate.failure_detail = null;
  } else if (input.status === "failed" && status === "failed") {
    deliveryUpdate.failure_code = input.failureCode ?? "provider_failed";
  }
  const { error: updateError } = await supabaseAdmin
    .from("aria_outbound_messages")
    .update(deliveryUpdate)
    .eq("id", data.id)
    .eq("content_hash", data.content_hash);
  if (updateError)
    throw new Error(`Unable to update delivery state: ${updateError.message}`);
  return inserted === "duplicate" ? "duplicate" : "updated";
}
