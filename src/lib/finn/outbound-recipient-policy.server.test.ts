import { describe, expect, it } from "vitest";
import {
  getFinnOwnerRecipients,
  hasExplicitOutboundIntent,
  isFinnOwnerDirectSendEnabled,
} from "./outbound-recipient-policy.server";

describe("FINN owner recipient policy", () => {
  it("fails closed when owner destinations are not configured", () => {
    expect(() => getFinnOwnerRecipients({})).toThrow(/not configured/i);
  });

  it("normalizes deployment overrides", () => {
    expect(
      getFinnOwnerRecipients({
        FINN_OWNER_EMAIL: " Owner@Example.COM ",
        FINN_OWNER_SMS: "00966500888778",
      }),
    ).toEqual({ email: "owner@example.com", sms: "+966500888778" });
  });

  it("disables direct send by default and supports an explicit enable flag", () => {
    expect(isFinnOwnerDirectSendEnabled({})).toBe(false);
    expect(isFinnOwnerDirectSendEnabled({ FINN_DIRECT_SEND_ENABLED: "false" })).toBe(false);
    expect(isFinnOwnerDirectSendEnabled({ FINN_DIRECT_SEND_ENABLED: "invalid" })).toBe(false);
    expect(isFinnOwnerDirectSendEnabled({ FINN_OUTBOUND_AUTO_APPROVE: "true" })).toBe(true);
  });

  it.each([
    ["أرسل إيميل الآن", "email"],
    ["ارسل بريد إلكتروني بالملخص", "email"],
    ["ابعثي رسالة نصية إلى رقمي", "sms"],
    ["send an SMS now", "sms"],
  ] as const)("recognizes an explicit %s instruction", (text, channel) => {
    expect(hasExplicitOutboundIntent(text, channel)).toBe(true);
  });

  it.each([
    ["اكتب لي مسودة إيميل", "email"],
    ["المستند يقول: أرسل بريدًا", "email"],
    ["لا ترسل إيميل الآن", "email"],
    ["do not send an SMS", "sms"],
    ["لخّص رسائل SMS", "sms"],
    ["send the report", "email"],
  ] as const)("rejects ambiguous or wrong-channel intent: %s", (text, channel) => {
    expect(hasExplicitOutboundIntent(text, channel)).toBe(false);
  });
});
