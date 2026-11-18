import { describe, expect, it } from "vitest";
import {
  buildTwilioMessageForm,
  normalizeE164,
  resolveTwilioConfig,
} from "./messaging-channel.server";

describe("SADEED messaging channels", () => {
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

  it("rejects unsafe Twilio media targets before forwarding them to the provider", () => {
    const config = { accountSid: "AC123", authToken: "secret", fromNumber: "+14155550123" };
    for (const mediaUrl of [
      "https://user:password@assets.example.com/alert.jpg",
      "https://127.0.0.1:8443/private",
      "https://[::1]/private",
      "https://localhost/secret",
      "https://media.corp.internal/secret",
      "https://media.home.arpa/secret",
      "https://assets.example.com/alert.jpg#fragment",
    ]) {
      expect(() =>
        buildTwilioMessageForm(
          { to: "+966551234567", body: "Alert", mediaUrls: [mediaUrl] },
          config,
        ),
      ).toThrow(/public HTTPS/);
    }
    const mediaUrl = "https://assets.example.com/alert.jpg?variant=small";
    expect(
      buildTwilioMessageForm(
        { to: "+966551234567", body: "Alert", mediaUrls: [mediaUrl] },
        config,
      ).get("MediaUrl"),
    ).toBe(mediaUrl);
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
