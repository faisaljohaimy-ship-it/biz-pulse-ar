import { beforeEach, describe, expect, it } from "vitest";
import {
  createApprovalToken,
  sha256Hex,
  verifyApprovalToken,
} from "@/lib/aria/outbound-messaging.server";
import {
  verifyResendSignature,
  verifyTwilioSignature,
} from "@/lib/aria/provider-webhook-signatures.server";

function arrayBuffer(value: Uint8Array): ArrayBuffer {
  return Uint8Array.from(value).buffer;
}

async function hmac(algorithm: "SHA-1" | "SHA-256", secret: Uint8Array, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    arrayBuffer(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );
  const result = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(result)));
}

describe("ARIA outbound approval boundary", () => {
  beforeEach(() => {
    process.env.ARIA_MESSAGE_APPROVAL_SECRET =
      "test-secret-that-is-longer-than-thirty-two-characters";
  });

  it("round-trips a content-bound, short-lived approval token", async () => {
    const claims = {
      v: 1 as const,
      ledgerId: crypto.randomUUID(),
      actorId: crypto.randomUUID(),
      orgId: crypto.randomUUID(),
      contentHash: await sha256Hex("reviewed payload"),
      expiresAt: Date.now() + 60_000,
      nonce: crypto.randomUUID(),
    };
    await expect(verifyApprovalToken(await createApprovalToken(claims))).resolves.toEqual(claims);
  });

  it("rejects tampered and expired approval tokens", async () => {
    const base = {
      v: 1 as const,
      ledgerId: crypto.randomUUID(),
      actorId: crypto.randomUUID(),
      orgId: crypto.randomUUID(),
      contentHash: await sha256Hex("payload"),
      nonce: crypto.randomUUID(),
    };
    const valid = await createApprovalToken({ ...base, expiresAt: Date.now() + 60_000 });
    // Tamper the FIRST signature char, not the last: for a 32-byte HMAC the
    // final base64url char only encodes 4 significant bits, so flipping it can
    // decode to the SAME signature bytes (flaky pass). The first char carries a
    // full 6 bits → changing it always changes the decoded signature → a real,
    // deterministic tamper. Pick a replacement guaranteed different.
    const dot = valid.indexOf(".");
    const firstSig = valid[dot + 1];
    const tampered =
      valid.slice(0, dot + 1) + (firstSig === "A" ? "B" : "A") + valid.slice(dot + 2);
    await expect(verifyApprovalToken(tampered)).rejects.toThrow(/signature/i);
    const expired = await createApprovalToken({ ...base, expiresAt: Date.now() - 1 });
    await expect(verifyApprovalToken(expired)).rejects.toThrow(/expired/i);
  });

  it("fails closed when the approval secret is shorter than 32 characters", async () => {
    process.env.ARIA_MESSAGE_APPROVAL_SECRET = "short";
    await expect(
      createApprovalToken({
        v: 1,
        ledgerId: crypto.randomUUID(),
        actorId: crypto.randomUUID(),
        orgId: crypto.randomUUID(),
        contentHash: await sha256Hex("payload"),
        expiresAt: Date.now() + 60_000,
        nonce: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/32/);
  });
});

describe("provider webhook signatures", () => {
  it("accepts the exact Twilio URL/form signature and rejects a changed field", async () => {
    const authToken = "twilio-test-token";
    const callbackUrl = "https://neexios.com/api/public/hooks/twilio-message-status";
    const params = new URLSearchParams({ MessageSid: "SM123", MessageStatus: "delivered" });
    const signed = `${callbackUrl}MessageSidSM123MessageStatusdelivered`;
    const signature = await hmac("SHA-1", new TextEncoder().encode(authToken), signed);
    await expect(
      verifyTwilioSignature({ authToken, callbackUrl, params, signature }),
    ).resolves.toBe(true);
    params.set("MessageStatus", "failed");
    await expect(
      verifyTwilioSignature({ authToken, callbackUrl, params, signature }),
    ).resolves.toBe(false);
  });

  it("accepts a fresh Resend/Svix signature and rejects replay outside tolerance", async () => {
    const secret = new TextEncoder().encode("resend-webhook-secret-material-1234");
    const webhookSecret = `whsec_${btoa(String.fromCharCode(...secret))}`;
    const messageId = "msg_123";
    const nowMs = 1_800_000_000_000;
    const timestamp = String(Math.floor(nowMs / 1_000));
    const rawBody = JSON.stringify({ type: "email.delivered", data: { email_id: "email_1" } });
    const signature = await hmac("SHA-256", secret, `${messageId}.${timestamp}.${rawBody}`);
    const input = {
      webhookSecret,
      messageId,
      timestamp,
      signatureHeader: `v1,${signature}`,
      rawBody,
    };
    await expect(verifyResendSignature({ ...input, nowMs })).resolves.toBe(true);
    await expect(verifyResendSignature({ ...input, nowMs: nowMs + 301_000 })).resolves.toBe(false);
  });
});
