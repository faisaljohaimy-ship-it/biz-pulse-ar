/**
 * Treat the model response as untrusted input. Keep the existing bilingual
 * JSON contract and provide a safe plain-text fallback for a prose reply.
 */
import { revalidateSpeakableText } from "@/lib/sadeed/output/finalize";

export type PublicAskAnswer = {
  ar: string;
  en: string;
  summary: string;
  evidence: string[];
  reasoning: string;
  recommendation: string;
  next_action: Record<string, unknown> | null;
  confidence: number;
};

const empty = (): PublicAskAnswer => ({
  ar: "",
  en: "",
  summary: "",
  evidence: [],
  reasoning: "",
  recommendation: "",
  next_action: null,
  confidence: 0,
});

const textField = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function extractPublicAskAnswer(raw: string): PublicAskAnswer {
  const trimmed = raw.trim();
  const candidate = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // Malformed JSON must not be displayed as prose. A provider can however
    // return a valid prose answer instead of the requested JSON envelope.
    return candidate.startsWith("{") || candidate.startsWith("[")
      ? empty()
      : { ...empty(), ar: candidate };
  }
  if (typeof parsed === "string") return { ...empty(), ar: parsed.trim() };
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty();

  const fields = parsed as Record<string, unknown>;
  return {
    ar: textField(fields.text_ar),
    en: textField(fields.text_en),
    summary: textField(fields.summary),
    evidence: Array.isArray(fields.evidence)
      ? fields.evidence.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [],
    reasoning: textField(fields.reasoning),
    recommendation: textField(fields.recommendation),
    next_action:
      fields.next_action &&
      typeof fields.next_action === "object" &&
      !Array.isArray(fields.next_action)
        ? (fields.next_action as Record<string, unknown>)
        : null,
    confidence:
      typeof fields.confidence === "number" && Number.isFinite(fields.confidence)
        ? Math.max(0, Math.min(1, fields.confidence))
        : 0,
  };
}

function safeModelText(value: string): string {
  const checked = revalidateSpeakableText(value);
  return checked.ok ? checked.text : "";
}

/** Evidence and nested next_action previously bypassed the text safety gateway. */
function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return undefined;
  if (typeof value === "string") {
    const safe = safeModelText(value);
    return safe || undefined;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 24)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, child] of Object.entries(value).slice(0, 40)) {
      // Do not project dangerous object keys or sensitive model-invented labels.
      if (key === "__proto__" || key === "prototype" || key === "constructor") continue;
      if (safeModelText(key) !== key) continue;
      const safe = sanitizeMetadataValue(child, depth + 1);
      if (safe !== undefined) result[key] = safe;
    }
    return result;
  }
  return undefined;
}

export function sanitizePublicAskMetadata(answer: PublicAskAnswer): {
  evidence: string[];
  next_action: Record<string, unknown> | null;
} {
  const evidence = answer.evidence.map(safeModelText).filter(Boolean);
  const next_action = answer.next_action
    ? (sanitizeMetadataValue(answer.next_action) as Record<string, unknown>)
    : null;
  return { evidence, next_action };
}
