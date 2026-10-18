import {
  describeProviderPlan,
  type SadeedLlmSelection,
} from "@/lib/sadeed/llm/provider-plan.server";

export type SadeedProviderCapability = {
  ready: boolean;
  provider: string | null;
  missing: string[];
};

/** وضع محرّك الدردشة كما تقرّره خطة المحرّك — وسومٌ لا قيم. */
export type SadeedLlmReadiness = {
  mode: "llm" | "zero_cost";
  selected: SadeedLlmSelection;
  backupEnabled: boolean;
  /** الطبقات الحتمية بلا تكلفة (العدّ والمرجع والمساعدة والتنقّل) جاهزةٌ دائمًا. */
  zeroCostReady: true;
};

export type SadeedProviderReadiness = {
  ready: boolean;
  llm: SadeedLlmReadiness;
  database: SadeedProviderCapability;
  intelligence: SadeedProviderCapability;
  voice: SadeedProviderCapability;
  email: SadeedProviderCapability;
  sms: SadeedProviderCapability;
  outboundSecurity: SadeedProviderCapability;
  deliveryTracking: SadeedProviderCapability;
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
): SadeedProviderCapability {
  const missing = required.filter(([, valid]) => !valid).map(([name]) => name);
  return { ready: missing.length === 0, provider, missing };
}

export function inspectSadeedProviderReadiness(
  env: Record<string, string | undefined> = process.env,
): SadeedProviderReadiness {
  const database = capability("supabase", [
    ["SUPABASE_URL", /^https:\/\//i.test(env.SUPABASE_URL?.trim() ?? "")],
    ["SUPABASE_PUBLISHABLE_KEY", configured(env.SUPABASE_PUBLISHABLE_KEY, 20)],
    ["SUPABASE_SERVICE_ROLE_KEY", configured(env.SUPABASE_SERVICE_ROLE_KEY, 20)],
  ]);

  // جاهزية الذكاء = المحرّك **المختار** مهيّأ (CLAUDE.md، القاعدة ٤: OR عبر مفاتيح
  // القدرة نفسها). مفتاح مورّدٍ آخر ليس جاهزيةً — لا استبدال صامت؛ والمحوّل
  // الاختياري يلزمه إذنا `SADEED_LLM_PROVIDER=openai` و`SADEED_OPENAI_ENABLED=true`.
  const plan = describeProviderPlan(env);
  let intelligence: SadeedProviderCapability;
  if (plan.selected === "openai") {
    const keyReady = configured(env.OPENAI_API_KEY, 20);
    const enabled = env.SADEED_OPENAI_ENABLED?.trim() === "true";
    intelligence = capability(keyReady && enabled ? "openai" : null, [
      ["OPENAI_API_KEY", keyReady],
      ["SADEED_OPENAI_ENABLED=true", enabled],
    ]);
  } else if (plan.selected === "gemini") {
    const geminiReady =
      configured(env.GEMINI_API_KEY, 20) || configured(env.GOOGLE_GENERATIVE_AI_API_KEY, 20);
    intelligence = capability(geminiReady ? "google-gemini" : null, [
      ["GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY", geminiReady],
    ]);
  } else {
    // `none` (قرار تشغيل) أو قيمةٌ غير صالحة: لا محرّك، والوضع الحتمي يعمل.
    intelligence = capability(null, [["SADEED_LLM_PROVIDER", false]]);
  }
  const llm: SadeedLlmReadiness = {
    mode: plan.mode,
    selected: plan.selected,
    backupEnabled: plan.backup_enabled,
    zeroCostReady: true,
  };

  // Owner voice policy: the audible SADEED voice is exclusively ElevenLabs Layan.
  const elevenReady = configured(env.ELEVENLABS_API_KEY, 20);
  const voice = capability("elevenlabs", [["ELEVENLABS_API_KEY", elevenReady]]);

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
    ["SADEED_MESSAGE_APPROVAL_SECRET", configured(env.SADEED_MESSAGE_APPROVAL_SECRET, 32)],
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
    llm,
    ...result,
  };
}
