/**
 * ResponseValidator — Phase 2 executive-grade output scrubbing.
 *
 * Runs AFTER ResponsePipeline.finalize. Its job:
 *  - strip provider / model names ("OpenAI", "Claude", "Anthropic", "GPT-*", "gpt-*", "gemini")
 *  - strip developer wording ("as an AI language model", "I cannot", "As per my training")
 *  - strip raw JSON blobs and stack traces if any survived
 *  - remove markdown tables when they carry no data (single-row tables)
 *  - enforce Arabic-first ordering when the user locale is Arabic
 *  - ensure the message is non-empty; else return a safe fallback
 */

const PROVIDER_NAMES =
  /\b(openai|open ai|anthropic|claude(?:[- ]sonnet(?:[- ][\d.]+)?)?|gpt[- ]?[\d.]*(?:-mini|-nano|-turbo)?|gemini(?:[- ][\d.]+)?|openrouter|lovable ai gateway|lovable gateway)\b/gi;

const DEVELOPER_PHRASES: RegExp[] = [
  /as an ai(?: language)? model[^.]*\.?/gi,
  /i(?:'m| am) (?:just )?an ai[^.]*\.?/gi,
  /as per my training(?: data)?[^.]*\.?/gi,
  /i (?:cannot|can't) (?:browse|access|verify)[^.]*\.?/gi,
  /my (?:training )?(?:data|knowledge) (?:cutoff|is limited)[^.]*\.?/gi,
];

const STACK_TRACE = /^\s*at\s+.+:\d+:\d+\s*$/gm;
const JSON_FENCE_LEAK = /```json[\s\S]*?```/g;
const SINGLE_ROW_TABLE = /^\|[^\n]+\|\n\|[- :|]+\|\n\|[^\n]+\|\s*$/gm;

function stripProviders(text: string): string {
  return text.replace(PROVIDER_NAMES, "").replace(/\s{2,}/g, " ");
}

function stripDeveloperWording(text: string): string {
  let out = text;
  for (const p of DEVELOPER_PHRASES) out = out.replace(p, "");
  return out;
}

function stripLeaks(text: string): string {
  return text.replace(STACK_TRACE, "").replace(JSON_FENCE_LEAK, "");
}

function stripEmptyTables(text: string): string {
  return text.replace(SINGLE_ROW_TABLE, "");
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function reorderArabicFirst(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length < 2) return text;
  const ar: string[] = [];
  const other: string[] = [];
  for (const p of paragraphs) {
    if (containsArabic(p)) ar.push(p);
    else other.push(p);
  }
  if (ar.length === 0 || other.length === 0) return text;
  return [...ar, ...other].join("\n\n");
}

function fallback(locale: "ar" | "en"): string {
  return locale === "ar"
    ? "تعذّر إعداد ردّ تنفيذي واضح. أعد صياغة الطلب أو زوّدني ببيانات إضافية."
    : "Unable to produce a clear executive response. Please rephrase or provide more data.";
}

export interface ValidatedResponse {
  ok: boolean;
  text: string;
  removed: {
    providers: number;
    developerWording: number;
    leaks: number;
    tables: number;
  };
  reorderedArabicFirst: boolean;
}

export const responseValidator = {
  validate(text: string, locale: "ar" | "en"): ValidatedResponse {
    if (!text || !text.trim()) {
      return {
        ok: false,
        text: fallback(locale),
        removed: { providers: 0, developerWording: 0, leaks: 0, tables: 0 },
        reorderedArabicFirst: false,
      };
    }

    const providerHits = (text.match(PROVIDER_NAMES) ?? []).length;
    let out = stripProviders(text);

    let devHits = 0;
    for (const p of DEVELOPER_PHRASES) devHits += (out.match(p) ?? []).length;
    out = stripDeveloperWording(out);

    const leakHits =
      (out.match(STACK_TRACE) ?? []).length + (out.match(JSON_FENCE_LEAK) ?? []).length;
    out = stripLeaks(out);

    const tableHits = (out.match(SINGLE_ROW_TABLE) ?? []).length;
    out = stripEmptyTables(out);

    out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    let reordered = false;
    if (locale === "ar" && containsArabic(out)) {
      const before = out;
      out = reorderArabicFirst(out);
      reordered = before !== out;
    }

    if (!out) {
      return {
        ok: false,
        text: fallback(locale),
        removed: {
          providers: providerHits,
          developerWording: devHits,
          leaks: leakHits,
          tables: tableHits,
        },
        reorderedArabicFirst: reordered,
      };
    }

    return {
      ok: true,
      text: out,
      removed: {
        providers: providerHits,
        developerWording: devHits,
        leaks: leakHits,
        tables: tableHits,
      },
      reorderedArabicFirst: reordered,
    };
  },
};
