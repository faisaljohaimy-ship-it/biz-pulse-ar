import { describe, expect, it } from "vitest";
import { inspectAriaProviderReadiness } from "./provider-readiness.server";

const COMPLETE = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key-with-enough-length",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-with-enough-length",
  OPENAI_API_KEY: "openai-key-with-enough-length",
  ELEVENLABS_API_KEY: "eleven-key-with-enough-length",
  RESEND_API_KEY: "resend-key-with-enough-length",
  RESEND_FROM_EMAIL: "ARIA <aria@nexios.com>",
  RESEND_WEBHOOK_SECRET: "whsec_resend-secret-with-enough-length",
  TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "twilio-token-with-enough-length",
  TWILIO_MESSAGING_SERVICE_SID: "MG00000000000000000000000000000000",
  TWILIO_STATUS_CALLBACK_URL: "https://neexios.com/api/webhooks/twilio",
  ARIA_MESSAGE_APPROVAL_SECRET: "a".repeat(48),
};

describe("ARIA provider readiness", () => {
  it("reports a fully configured provider set without exposing values", () => {
    const status = inspectAriaProviderReadiness(COMPLETE);
    expect(status.ready).toBe(true);
    expect(status.email.provider).toBe("resend");
    expect(JSON.stringify(status)).not.toContain(COMPLETE.OPENAI_API_KEY);
  });

  it("rejects placeholders and reports exact missing variable names", () => {
    const status = inspectAriaProviderReadiness({
      OPENAI_API_KEY: "replace_me",
      RESEND_FROM_EMAIL: "ARIA <aria@your-verified-domain.example>",
    });
    expect(status.ready).toBe(false);
    expect(status.intelligence.missing).toContain("AI_PROVIDER_API_KEY");
    expect(status.outboundSecurity.missing).toContain("ARIA_MESSAGE_APPROVAL_SECRET");
  });

  it("requires OpenAI for cross-browser recorder transcription", () => {
    const status = inspectAriaProviderReadiness({
      ...COMPLETE,
      OPENAI_API_KEY: undefined,
      GEMINI_API_KEY: "gemini-key-with-enough-length",
    });
    expect(status.intelligence.ready).toBe(true);
    expect(status.voice.ready).toBe(false);
    expect(status.voice.missing).toContain("OPENAI_API_KEY");
  });
});
