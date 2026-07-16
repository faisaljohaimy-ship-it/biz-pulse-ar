import { describe, expect, it } from "vitest";
import {
  buildTwilioMessageForm,
  normalizeE164,
  resolveTwilioConfig,
} from "./messaging-channel.server";

describe("ARIA messaging channels", () => {
  it("normalizes a formatted E.164 phone number", () => {
    expect(normalizeE164("+966 55 123 4567")).toBe("+966551234567");
  });

  it("rejects national-format and oversized phone numbers", () => {
    expect(() => normalizeE164("0551234567")).toThrow(/E\.164/);
    expect(() => normalizeE164("+1234567890123456")).toThrow(/E\.164/);
  });

  it("builds a Twilio form with a sender number and media", () => {
    const form = buildTwilioMessageForm(
      {
        to: "+966551234567",
        body: "Executive alert",
        mediaUrls: ["https://assets.example.com/alert.jpg"],
      },
      {
        accountSid: "AC123",
        authToken: "secret",
        fromNumber: "+14155550123",
      },
    );
    expect(form.get("To")).toBe("+966551234567");
    expect(form.get("From")).toBe("+14155550123");
    expect(form.get("Body")).toBe("Executive alert");
    expect(form.getAll("MediaUrl")).toEqual(["https://assets.example.com/alert.jpg"]);
  });

  it("prefers a Twilio Messaging Service when configured", () => {
    const form = buildTwilioMessageForm(
      { to: "+966551234567", body: "Ready" },
      {
        accountSid: "AC123",
        authToken: "secret",
        fromNumber: "+14155550123",
        messagingServiceSid: "MG123",
      },
    );
    expect(form.get("MessagingServiceSid")).toBe("MG123");
    expect(form.has("From")).toBe(false);
  });

  it("requires complete Twilio credentials and a sender", () => {
    expect(resolveTwilioConfig({ TWILIO_ACCOUNT_SID: "AC123" })).toBeNull();
    expect(
      resolveTwilioConfig({
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "secret",
        TWILIO_MESSAGING_SERVICE_SID: "MG123",
      }),
    ).toMatchObject({ accountSid: "AC123", messagingServiceSid: "MG123" });
  });

  it("rejects an SMS body beyond Twilio's documented limit", () => {
    expect(() =>
      buildTwilioMessageForm(
        { to: "+966551234567", body: "x".repeat(1601) },
        { accountSid: "AC123", authToken: "secret", fromNumber: "+14155550123" },
      ),
    ).toThrow(/1,600/);
  });
});
