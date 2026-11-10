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
  // NaN/Infinity (or a fractional cap) can turn a bounded merge into an
  // uncapped scan. Reject invalid caller limits before touching either snapshot.
  if (!Number.isSafeInteger(limit) || limit <= 0) return [];
  const seen = new Set<string>();
  const merged: T[] = [];
  // Consume lazily: spreading both snapshots up-front may allocate thousands
  // of rows (or fail on an unused snapshot) even when the visible cap is one.
  for (const source of [newer, older]) {
    for (const row of source) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
}
