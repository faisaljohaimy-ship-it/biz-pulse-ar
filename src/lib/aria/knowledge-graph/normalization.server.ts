/**
 * Normalization helpers.
 *
 * Turns raw display names into canonical keys deterministically.
 * No stopword lists — pure case + whitespace + diacritics folding.
 */

export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeAliases(
  aliases: readonly string[] | undefined,
  canonical: string,
): readonly string[] {
  const set = new Set<string>();
  for (const alias of aliases ?? []) {
    const key = normalizeName(alias);
    if (key && key !== normalizeName(canonical)) set.add(key);
  }
  return Object.freeze([...set].sort()) as readonly string[];
}

export function normalizeAttributes(
  attributes: Readonly<Record<string, string | number | boolean | null>> | undefined,
): Readonly<Record<string, string | number | boolean | null>> {
  if (!attributes) return Object.freeze({});
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(attributes)) {
    const key = k.trim();
    if (!key) continue;
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  return Object.freeze(out);
}
