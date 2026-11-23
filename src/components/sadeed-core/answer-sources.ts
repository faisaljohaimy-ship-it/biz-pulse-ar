import { parseEnvelope, type SafeSadeedOutputEnvelopeV1 } from "@/lib/sadeed/output/envelope";

const MAX_ITEMS = 12;
const MAX_SCAN = 32;
const MAX_TEXT = 20_000;
const SENSITIVE_LABEL =
  /(?:sk-(?:proj-|svcacct-|ant-)?[\w-]{12,}|sb_secret_[\w-]+|AIza[\w-]{20,}|gh[pousr]_[\w]{20,}|github_pat_[\w]{20,}|eyJ[\w-]{8,}\.[\w-]+\.[\w-]+|bearer\s+\S+|(?:api[_ -]?key|token|secret|password)\s*[:=]|system[_ -]?(?:prompt|instructions)|chain.of.thought|تعليمات النظام|تجاهل.{0,30}التعليمات|ignore.{0,20}instructions)/i;

type Reference = { tag: string; title: string };
type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";
export type AnswerSourceView = {
  cited: Reference[];
  retrieved: Reference[];
  uncertain: Reference[];
  tools: ToolState[];
  envelope: SafeSadeedOutputEnvelopeV1 | null;
  unverifiedCount: number | null;
  bounded: boolean;
  metadataAvailable: boolean;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Read data fields only; unknown metadata must never invoke an accessor. */
function field(value: unknown, key: string): unknown {
  return record(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
}

function boundedArray(value: unknown): { items: unknown[]; length: number } | null {
  if (!Array.isArray(value)) return null;
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value as number;
  const items: unknown[] = [];
  for (let index = 0; index < Math.min(length, MAX_SCAN); index++)
    items.push(Object.getOwnPropertyDescriptor(value, String(index))?.value);
  return { items, length };
}

function label(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .slice(0, max)
    .replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, " ")
    .trim();
  return text && !SENSITIVE_LABEL.test(text) ? text + (value.length > max ? "…" : "") : null;
}

function fields(value: unknown, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, field(value, key)]));
}

function boundedEnvelope(value: unknown): SafeSadeedOutputEnvelopeV1 | null {
  const input = fields(value, [
    "version",
    "requestId",
    "status",
    "displayText",
    "speakableText",
    "locale",
    "isSimulation",
    "createdAt",
  ]);
  for (const key of ["displayText", "speakableText"])
    if (typeof input[key] !== "string" || input[key].length > MAX_TEXT) return null;
  const arrayFields: Record<string, readonly string[] | null> = {
    reasonCodes: null,
    approvedActions: null,
    citations: ["id", "tag"],
    executionReceipts: ["id", "executor", "at"],
  };
  for (const [key, childFields] of Object.entries(arrayFields)) {
    const array = boundedArray(field(value, key));
    if (!array || array.length > MAX_SCAN) return null;
    input[key] = childFields ? array.items.map((item) => fields(item, childFields)) : array.items;
  }
  const result = parseEnvelope(input);
  return result.ok ? result.envelope : null;
}

/** Presentation receipts only: no excerpts, tool input/output, council or inference internals. */
export function readAnswerSources(message: unknown, displayedText?: string): AnswerSourceView {
  const empty: AnswerSourceView = {
    cited: [],
    retrieved: [],
    uncertain: [],
    tools: [],
    envelope: null,
    unverifiedCount: null,
    bounded: false,
    metadataAvailable: false,
  };
  try {
    const metadata = field(message, "metadata");
    const parts = boundedArray(field(message, "parts"));
    const citations = boundedArray(field(metadata, "citations"));
    const view = { ...empty, envelope: boundedEnvelope(field(metadata, "envelope")) };
    view.metadataAvailable = citations !== null || view.envelope !== null;
    const unverified = field(field(metadata, "ragCounts"), "unverified");
    view.unverifiedCount =
      typeof unverified === "number" &&
      Number.isSafeInteger(unverified) &&
      unverified >= 0 &&
      unverified <= 1_000_000
        ? unverified
        : null;
    let text = "";
    let completeText = parts !== null;
    if (parts) {
      view.bounded = parts.length > MAX_SCAN;
      completeText = !view.bounded;
      for (const part of parts.items) {
        const type = field(part, "type");
        const content = field(part, "text");
        if (type === "text" && typeof content === "string") {
          if (text.length + content.length > MAX_TEXT) completeText = false;
          text = (text + content.slice(0, MAX_TEXT)).slice(0, MAX_TEXT);
        }
        const state = field(part, "state");
        if (
          typeof type === "string" &&
          (type.startsWith("tool-") || type === "dynamic-tool") &&
          typeof state === "string" &&
          ["input-streaming", "input-available", "output-available", "output-error"].includes(state)
        ) {
          if (view.tools.length < MAX_ITEMS) view.tools.push(state as ToolState);
          else view.bounded = true;
        }
      }
    }
    const authoritativeText = displayedText ?? view.envelope?.displayText;
    if (typeof authoritativeText === "string") {
      text = authoritativeText.slice(0, MAX_TEXT);
      completeText = authoritativeText.length <= MAX_TEXT;
    }
    view.bounded ||= !completeText && text.length > 0;
    if (citations) {
      view.bounded ||= citations.length > MAX_ITEMS;
      const seen = new Set<string>();
      for (const citation of citations.items) {
        if (seen.size >= MAX_ITEMS) break;
        const tag = field(citation, "tag");
        if (
          typeof tag !== "string" ||
          tag.length > 200 ||
          !/^\[(?:DOC|KB|MEM):[^[\]\r\n]{1,170}\]$/.test(tag)
        )
          continue;
        const safeTag = label(tag, 200);
        const title = label(field(citation, "title"), 160);
        if (!safeTag || !title || seen.has(tag)) continue;
        seen.add(tag);
        const reference = { tag: safeTag, title };
        if (text.toLowerCase().includes(tag.toLowerCase())) view.cited.push(reference);
        else if (completeText) view.retrieved.push(reference);
        else view.uncertain.push(reference);
      }
    }
    return view;
  } catch {
    return empty;
  }
}
