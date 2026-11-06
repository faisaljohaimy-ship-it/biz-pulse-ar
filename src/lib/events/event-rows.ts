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
  if (limit <= 0) return [];
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const row of [...newer, ...older]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
    if (merged.length >= limit) break;
  }
  return merged;
}
