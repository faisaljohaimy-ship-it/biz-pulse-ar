import type { MemoryAnchor } from "./types";

const M = new Map<string, Map<string, MemoryAnchor>>();

export function rememberAnchor(scope: string, anchor: Omit<MemoryAnchor, "addedAt">): MemoryAnchor {
  const bucket = M.get(scope) ?? new Map<string, MemoryAnchor>();
  const cur = bucket.get(anchor.key);
  // User corrections override prior ARIA anchors.
  if (cur && cur.source === "user" && anchor.source === "aria") return cur;
  const entry: MemoryAnchor = { ...anchor, addedAt: Date.now() };
  bucket.set(anchor.key, entry);
  M.set(scope, bucket);
  return entry;
}

export function recallAnchor(scope: string, key: string): MemoryAnchor | null {
  return M.get(scope)?.get(key) ?? null;
}

export function forgetAnchor(scope: string, key: string): void {
  M.get(scope)?.delete(key);
}

export function listAnchors(scope: string): readonly MemoryAnchor[] {
  const bucket = M.get(scope);
  if (!bucket) return [];
  return Array.from(bucket.values());
}
