import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyResendWebhook, verifyTwilioWebhook } from "./webhook-signatures.server";

describe("ARIA provider webhook signatures", () => {
  it("verifies a fresh Resend/Svix signature over the raw body", async () => {
    const secretBytes = Buffer.from("0123456789abcdef0123456789abcdef");
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const rawBody = '{"type":"email.delivered"}';
    const svixId = "msg_test";
    const svixTimestamp = "1700000000";
    const signature = createHmac("sha256", secretBytes)
      .update(`${svixId}.${svixTimestamp}.${rawBody}`)
      .digest("base64");
    await expect(
      verifyResendWebhook({
        rawBody,
        webhookSecret: secret,
        svixId,
        svixTimestamp,
        svixSignature: `v1,${signature}`,
        nowMs: Number(svixTimestamp) * 1_000,
      }),
    ).resolves.toBe(true);
  });

  it("rejects stale Resend callbacks", async () => {
    await expect(
      verifyResendWebhook({
        rawBody: "{}",
        webhookSecret: `whsec_${Buffer.from("0123456789abcdef").toString("base64")}`,
        svixId: "msg_test",
        svixTimestamp: "1000",
        svixSignature: "v1,invalid",
        nowMs: 2_000_000,
      }),
    ).resolves.toBe(false);
  });

  it("verifies Twilio against the exact public URL and every form field", async () => {
    const publicUrl = "https://neexios.com/api/webhooks/twilio";
    const authToken = "twilio-auth-token";
    const params = new URLSearchParams({
      MessageSid: "SM123",
      MessageStatus: "delivered",
      To: "+966500888778",
    });
    const signed =
      publicUrl +
      [...params.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([name, value]) => `${name}${value}`)
        .join("");
    const signature = createHmac("sha1", authToken).update(signed).digest("base64");
    await expect(
      verifyTwilioWebhook({
        publicUrl,
        rawFormBody: params.toString(),
        signature,
        authToken,
      }),
    ).resolves.toBe(true);
  });
});
