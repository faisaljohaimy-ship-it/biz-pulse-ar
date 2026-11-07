export type SadeedAdaptivePreference = {
  key: "response_length" | "response_language" | "response_format";
  value: "concise" | "detailed" | "ar" | "en" | "bullets" | "no_tables";
  confidence: number;
};

const DURABLE_AR =
  /(?:دائم(?:ًا|ا)?|من الآن(?:\s+فصاعد(?:ًا|ا)?)?|في كل رد|اجعل ردودك|خل(?:ي|ّ) ردودك|أفض[ّ]?ل)/;
const DURABLE_EN =
  /(?:always|from now on|in every reply|make your (?:answers|replies)|keep your (?:answers|replies)|i prefer)/i;

/** Keep negated language mentions from becoming the opposite durable preference. */
const NEGATED_LANGUAGE_CONTEXT =
  /(?:\b(?:never|avoid|without|not|don't|do\s+not)\b|(?:لا|بدون|تجنب))(?:\s+[^\s,.،؛;:!?؟]+){0,4}\s*$/i;
const ENGLISH_LANGUAGE_MENTION = /(?:بالإنجليزية|باللغة الإنجليزية|ردودك إنجليزي|in english)/gi;
const ARABIC_LANGUAGE_MENTION = /(?:بالعربية|باللغة العربية|ردودك عربي|بالعربي|in arabic)/gi;
const BULLET_FORMAT_MENTION = /(?:على شكل نقاط|بنقاط|نقاط مختصرة|bullet points|bullets)/gi;

function hasAffirmativeMention(text: string, mentions: RegExp): boolean {
  return [...text.matchAll(mentions)].some((match) => {
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 80), index);
    return !NEGATED_LANGUAGE_CONTEXT.test(context);
  });
}

/**
 * Learn only an explicit, durable presentation preference. The result is a
 * fixed enum: user text, recipients, credentials, permissions and action
 * instructions can never enter the preference store.
 */
export function extractSadeedAdaptivePreferences(input: string): SadeedAdaptivePreference[] {
  const text = input.replace(/\s+/g, " ").trim().slice(0, 2_000);
  if (!text || (!DURABLE_AR.test(text) && !DURABLE_EN.test(text))) return [];

  const results = new Map<SadeedAdaptivePreference["key"], SadeedAdaptivePreference>();
  const add = (key: SadeedAdaptivePreference["key"], value: SadeedAdaptivePreference["value"]) =>
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

  if (hasAffirmativeMention(text, ENGLISH_LANGUAGE_MENTION)) {
    add("response_language", "en");
  } else if (hasAffirmativeMention(text, ARABIC_LANGUAGE_MENTION)) {
    add("response_language", "ar");
  }

  if (/(?:بدون جداول|لا تستخدم الجداول|no tables)/i.test(text)) {
    add("response_format", "no_tables");
  } else if (hasAffirmativeMention(text, BULLET_FORMAT_MENTION)) {
    add("response_format", "bullets");
  }

  return [...results.values()];
}

export function sadeedPreferencePromptLine(key: string, value: string): string | null {
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
