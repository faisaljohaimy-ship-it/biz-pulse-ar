/**
 * Phase 9.1 — Batching helper.
 */

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("batch size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function processBatched<T, R>(
  items: readonly T[],
  size: number,
  handler: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const out: R[] = [];
  for (const b of chunk(items, size)) {
    const r = await handler(b);
    out.push(...r);
  }
  return out;
}
