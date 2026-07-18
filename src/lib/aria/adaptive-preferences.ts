export type AriaAdaptivePreference = {
  key: "response_length" | "response_language" | "response_format";
  value: "concise" | "detailed" | "ar" | "en" | "bullets" | "no_tables";
  confidence: number;
};

const DURABLE_AR =
  /(?:دائم(?:ًا|ا)?|من الآن(?:\s+فصاعد(?:ًا|ا)?)?|في كل رد|اجعل ردودك|خل(?:ي|ّ) ردودك|أفض[ّ]?ل)/;
const DURABLE_EN =
  /(?:always|from now on|in every reply|make your (?:answers|replies)|keep your (?:answers|replies)|i prefer)/i;

/**
 * Learn only an explicit, durable presentation preference. The result is a
 * fixed enum: user text, recipients, credentials, permissions and action
 * instructions can never enter the preference store.
 */
export function extractAriaAdaptivePreferences(input: string): AriaAdaptivePreference[] {
  const text = input.replace(/\s+/g, " ").trim().slice(0, 2_000);
  if (!text || (!DURABLE_AR.test(text) && !DURABLE_EN.test(text))) return [];

  const results = new Map<AriaAdaptivePreference["key"], AriaAdaptivePreference>();
  const add = (key: AriaAdaptivePreference["key"], value: AriaAdaptivePreference["value"]) =>
    results.set(key, { key, value, confidence: 0.95 });

  if (
    /(?:لا تختصر|بالتفصيل|تفصيلي(?:ة|اً|ا)?|شرح(?:ًا|ا)? واف(?:ٍ|ي)|detailed|in detail|do not be concise)/i.test(
      text,
    )
  ) {
    add("response_length", "detailed");
  } else if (
    /(?:باختصار|مختصر(?:ة|اً|ا)?|موجز(?:ة|اً|ا)?|ردود قصيرة|concise|brief|short replies)/i.test(
      text,
    )
  ) {
    add("response_length", "concise");
  }

  if (/(?:بالإنجليزية|باللغة الإنجليزية|ردودك إنجليزي|in english)/i.test(text)) {
    add("response_language", "en");
  } else if (/(?:بالعربية|باللغة العربية|ردودك عربي|بالعربي|in arabic)/i.test(text)) {
    add("response_language", "ar");
  }

  if (/(?:بدون جداول|لا تستخدم الجداول|no tables)/i.test(text)) {
    add("response_format", "no_tables");
  } else if (/(?:على شكل نقاط|بنقاط|نقاط مختصرة|bullet points|bullets)/i.test(text)) {
    add("response_format", "bullets");
  }

  return [...results.values()];
}

export function ariaPreferencePromptLine(key: string, value: string): string | null {
  const pair = `${key}:${value}`;
  const lines: Record<string, string> = {
    "response_length:concise": "Prefer concise answers unless detail is necessary.",
    "response_length:detailed":
      "Prefer detailed answers when the request benefits from explanation.",
    "response_language:ar":
      "Prefer Arabic unless the current user explicitly requests another language.",
    "response_language:en":
      "Prefer English unless the current user explicitly requests another language.",
    "response_format:bullets": "Prefer bullet points when they improve readability.",
    "response_format:no_tables": "Avoid tables unless the current user explicitly asks for one.",
  };
  return lines[pair] ?? null;
}
