import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyResendSignature, verifyTwilioSignature } from "./provider-webhook-signatures.server";

describe("outbound provider webhook signatures", () => {
  it("validates Twilio's exact URL plus sorted form fields", async () => {
    const authToken = "twilio-test-token";
    const callbackUrl = "https://example.com/api/public/hooks/twilio-message-status";
    const params = new URLSearchParams({ MessageStatus: "delivered", MessageSid: "SM123" });
    const signed = `${callbackUrl}MessageSidSM123MessageStatusdelivered`;
    const signature = createHmac("sha1", authToken).update(signed).digest("base64");
    await expect(
      verifyTwilioSignature({ authToken, callbackUrl, params, signature }),
    ).resolves.toBe(true);
    await expect(
      verifyTwilioSignature({ authToken, callbackUrl, params, signature: `${signature}x` }),
    ).resolves.toBe(false);
  });

  it("validates a fresh Resend/Svix v1 signature and rejects replay", async () => {
    const secretBytes = Buffer.from("0123456789abcdef0123456789abcdef");
    const webhookSecret = `whsec_${secretBytes.toString("base64")}`;
    const messageId = "msg_test_123";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({ type: "email.delivered", data: { email_id: "em_123" } });
    const signature = createHmac("sha256", secretBytes)
      .update(`${messageId}.${timestamp}.${rawBody}`)
      .digest("base64");

    await expect(
      verifyResendSignature({
        webhookSecret,
        messageId,
        timestamp,
        signatureHeader: `v1,${signature}`,
        rawBody,
      }),
    ).resolves.toBe(true);

    await expect(
      verifyResendSignature({
        webhookSecret,
        messageId,
        timestamp,
        signatureHeader: `v1,${signature}`,
        rawBody,
        nowMs: (Number(timestamp) + 600) * 1_000,
      }),
    ).resolves.toBe(false);
  });
});
