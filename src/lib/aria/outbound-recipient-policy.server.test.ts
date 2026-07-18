import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARIA_OWNER_EMAIL,
  DEFAULT_ARIA_OWNER_SMS,
  getAriaOwnerRecipients,
  hasExplicitOutboundIntent,
  isAriaOwnerDirectSendEnabled,
} from "./outbound-recipient-policy.server";

describe("ARIA owner recipient policy", () => {
  it("uses the registered owner destinations by default", () => {
    expect(getAriaOwnerRecipients({})).toEqual({
      email: DEFAULT_ARIA_OWNER_EMAIL.toLowerCase(),
      sms: DEFAULT_ARIA_OWNER_SMS,
    });
  });

  it("normalizes deployment overrides", () => {
    expect(
      getAriaOwnerRecipients({
        ARIA_OWNER_EMAIL: " Owner@Example.COM ",
        ARIA_OWNER_SMS: "00966500888778",
      }),
    ).toEqual({ email: "owner@example.com", sms: "+966500888778" });
  });

  it("enables owner-only direct send by default and supports a kill switch", () => {
    expect(isAriaOwnerDirectSendEnabled({})).toBe(true);
    expect(
      isAriaOwnerDirectSendEnabled({ ARIA_DIRECT_SEND_ENABLED: "false" }),
    ).toBe(false);
    expect(
      isAriaOwnerDirectSendEnabled({ ARIA_DIRECT_SEND_ENABLED: "invalid" }),
    ).toBe(false);
    expect(
      isAriaOwnerDirectSendEnabled({ ARIA_OUTBOUND_AUTO_APPROVE: "true" }),
    ).toBe(true);
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
  ] as const)(
    "rejects ambiguous or wrong-channel intent: %s",
    (text, channel) => {
      expect(hasExplicitOutboundIntent(text, channel)).toBe(false);
    },
  );
});
