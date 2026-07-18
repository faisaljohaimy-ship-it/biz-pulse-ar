export type AriaProviderCapability = {
  ready: boolean;
  provider: string | null;
  missing: string[];
};

export type AriaProviderReadiness = {
  ready: boolean;
  database: AriaProviderCapability;
  intelligence: AriaProviderCapability;
  voice: AriaProviderCapability;
  email: AriaProviderCapability;
  sms: AriaProviderCapability;
  outboundSecurity: AriaProviderCapability;
  deliveryTracking: AriaProviderCapability;
};

function configured(value: string | undefined, minLength = 1): boolean {
  const normalized = value?.trim() ?? "";
  return (
    normalized.length >= minLength &&
    !/(?:replace_me|replace_with|your[_ -](?:key|project|domain|verified)|\.example(?:>|$)|<[^>]*(?:your|replace)[^>]*>)/i.test(
      normalized,
    )
  );
}

function capability(
  provider: string | null,
  required: Array<[name: string, valid: boolean]>,
): AriaProviderCapability {
  const missing = required.filter(([, valid]) => !valid).map(([name]) => name);
  return { ready: missing.length === 0, provider, missing };
}

export function inspectAriaProviderReadiness(
  env: Record<string, string | undefined> = process.env,
): AriaProviderReadiness {
  const database = capability("supabase", [
    ["SUPABASE_URL", /^https:\/\//i.test(env.SUPABASE_URL?.trim() ?? "")],
    ["SUPABASE_PUBLISHABLE_KEY", configured(env.SUPABASE_PUBLISHABLE_KEY, 20)],
    ["SUPABASE_SERVICE_ROLE_KEY", configured(env.SUPABASE_SERVICE_ROLE_KEY, 20)],
  ]);

  const geminiReady =
    configured(env.GEMINI_API_KEY, 20) || configured(env.GOOGLE_GENERATIVE_AI_API_KEY, 20);
  const forceGemini = env.ARIA_FORCE_GEMINI_FLASH?.trim().toLowerCase() !== "false";
  const intelligenceProvider = geminiReady
    ? "google-gemini"
    : !forceGemini && configured(env.OPENAI_API_KEY, 20)
      ? "openai"
      : !forceGemini && configured(env.LOVABLE_API_KEY, 20)
        ? "lovable"
        : !forceGemini && configured(env.ANTHROPIC_API_KEY, 20)
          ? "anthropic"
          : !forceGemini && configured(env.OPENROUTER_API_KEY, 20)
            ? "openrouter"
            : null;
  const intelligence = capability(intelligenceProvider, [
    [
      forceGemini ? "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY" : "AI_PROVIDER_API_KEY",
      intelligenceProvider !== null,
    ],
  ]);

  const voice = capability("google-gemini", [
    ["GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY", geminiReady],
  ]);

  const resendReady = configured(env.RESEND_API_KEY, 20) && configured(env.RESEND_FROM_EMAIL, 6);
  const outlookReady = configured(env.MICROSOFT_OUTLOOK_API_KEY, 20);
  const emailProvider = resendReady ? "resend" : outlookReady ? "outlook" : null;
  const email = capability(emailProvider, [
    ["RESEND_API_KEY + RESEND_FROM_EMAIL or MICROSOFT_OUTLOOK_API_KEY", emailProvider !== null],
  ]);

  const twilioSenderReady =
    configured(env.TWILIO_FROM_NUMBER, 8) || configured(env.TWILIO_MESSAGING_SERVICE_SID, 10);
  const sms = capability("twilio", [
    ["TWILIO_ACCOUNT_SID", configured(env.TWILIO_ACCOUNT_SID, 20)],
    ["TWILIO_AUTH_TOKEN", configured(env.TWILIO_AUTH_TOKEN, 20)],
    ["TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID", twilioSenderReady],
  ]);

  const outboundSecurity = capability("internal", [
    ["ARIA_MESSAGE_APPROVAL_SECRET", configured(env.ARIA_MESSAGE_APPROVAL_SECRET, 32)],
  ]);

  const deliveryTracking = capability("resend+twilio", [
    [
      "RESEND_WEBHOOK_SECRET",
      emailProvider !== "resend" || configured(env.RESEND_WEBHOOK_SECRET, 20),
    ],
    [
      "TWILIO_STATUS_CALLBACK_URL",
      /^https:\/\//i.test(env.TWILIO_STATUS_CALLBACK_URL?.trim() ?? ""),
    ],
  ]);

  const result = {
    database,
    intelligence,
    voice,
    email,
    sms,
    outboundSecurity,
    deliveryTracking,
  };
  return {
    ready: Object.values(result).every((item) => item.ready),
    ...result,
  };
}
