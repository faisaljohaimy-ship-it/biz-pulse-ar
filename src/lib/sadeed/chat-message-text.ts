/**
 * Extract visible text from a chat message without gluing words together
 * when a file/image part separates two text segments.
 */
export function extractMessageText(parts: readonly unknown[] | null | undefined): string {
  let result = "";
  let separatedByNonText = false;

  for (const part of parts ?? []) {
    if (!part || typeof part !== "object") continue;
    const candidate = part as { type?: unknown; text?: unknown };

    if (candidate.type === "text" && typeof candidate.text === "string") {
      const next = candidate.text;
      if (
        separatedByNonText &&
        result &&
        next &&
        !/\s$/.test(result) &&
        !/^\s/.test(next)
      ) {
        result += " ";
      }
      result += next;
      separatedByNonText = false;
    } else if (result) {
      separatedByNonText = true;
    }
  }

  return result.trim();
}
