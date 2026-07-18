const required = {
  database: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  email: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_WEBHOOK_SECRET"],
  sms: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  security: ["ARIA_MESSAGE_APPROVAL_SECRET"],
  callbacks: ["TWILIO_STATUS_CALLBACK_URL"],
};

const placeholder =
  /(?:replace_me|replace_with|your[_ -](?:key|project|domain|verified)|\.example(?:>|$)|<[^>]*(?:your|replace)[^>]*>)/i;
const usable = (name) => {
  const value = process.env[name]?.trim() ?? "";
  return value.length > 0 && !placeholder.test(value);
};

const results = Object.entries(required).map(([capability, names]) => {
  const missing = names.filter((name) => !usable(name));
  return { capability, ready: missing.length === 0, missing };
});

const hasGeminiKey = usable("GEMINI_API_KEY") || usable("GOOGLE_GENERATIVE_AI_API_KEY");
results.push({
  capability: "intelligence",
  ready: hasGeminiKey,
  missing: hasGeminiKey ? [] : ["GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"],
});
results.push({
  capability: "voice",
  ready: hasGeminiKey,
  missing: hasGeminiKey ? [] : ["GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"],
});

const hasTwilioSender = usable("TWILIO_FROM_NUMBER") || usable("TWILIO_MESSAGING_SERVICE_SID");
const sms = results.find((result) => result.capability === "sms");
if (sms && !hasTwilioSender) {
  sms.ready = false;
  sms.missing.push("TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID");
}

for (const result of results) {
  process.stdout.write(
    `${result.ready ? "READY" : "MISSING"} ${result.capability}${
      result.missing.length ? `: ${result.missing.join(", ")}` : ""
    }\n`,
  );
}
process.exitCode = results.every((result) => result.ready) ? 0 : 1;
