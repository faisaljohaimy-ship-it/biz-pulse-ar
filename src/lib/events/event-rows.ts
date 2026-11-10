/**
 * A realtime INSERT can arrive while the initial event query is still in flight.
 * Preserve those newer rows when the older hydration snapshot resolves, without
 * duplicating a row that appeared in both sources.
 *
 * This operates only on records already returned by the caller's existing RLS
 * query/subscription. It does not change tenant or event filtering.
 */
export function mergeEventRowsById<T extends { readonly id: string }>(
  newer: readonly T[],
  older: readonly T[],
  limit: number,
): T[] {
  // Fail closed on invalid caps before reading either snapshot. Int32 is
  // already vastly larger than any event list the UI can safely render.
  if (limit < 1 || (limit | 0) !== limit) return [];
  const seen = new Set<string>();
  const merged: T[] = [];
  // Consume lazily: spreading both snapshots up-front may allocate thousands
  // of rows (or fail on an unused snapshot) even when the visible cap is one.
  for (const source of [newer, older]) {
    for (const row of source) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
      // Count distinct events against the cap without re-reading array length.
      if (!--limit) return merged;
    }
  }
  return merged;
}
