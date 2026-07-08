// Sanitizes SVG preserveAspectRatio values. Invalid input → safe default
// "xMidYMid meet" (the SVG spec default) instead of throwing a render error
// that crashes the React tree.

const ALIGN = new Set([
  "none",
  "xMinYMin",
  "xMidYMin",
  "xMaxYMin",
  "xMinYMid",
  "xMidYMid",
  "xMaxYMid",
  "xMinYMax",
  "xMidYMax",
  "xMaxYMax",
]);
const MEET_OR_SLICE = new Set(["meet", "slice"]);

export const DEFAULT_PRESERVE_ASPECT_RATIO = "xMidYMid meet";

export function safePreserveAspectRatio(
  value: string | undefined | null,
  fallback: string = DEFAULT_PRESERVE_ASPECT_RATIO,
): string {
  if (!value) return fallback;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0 || parts.length > 2) {
    warnInvalid(value, fallback);
    return fallback;
  }
  if (!ALIGN.has(parts[0])) {
    warnInvalid(value, fallback);
    return fallback;
  }
  if (parts[0] === "none" && parts.length > 1) {
    warnInvalid(value, fallback);
    return fallback;
  }
  if (parts.length === 2 && !MEET_OR_SLICE.has(parts[1])) {
    warnInvalid(value, fallback);
    return fallback;
  }
  return value;
}

function warnInvalid(value: string, fallback: string) {
  if (typeof console !== "undefined") {
    console.warn(
      `[svg-safe] invalid preserveAspectRatio="${value}" — using "${fallback}" instead.`,
    );
  }
}
