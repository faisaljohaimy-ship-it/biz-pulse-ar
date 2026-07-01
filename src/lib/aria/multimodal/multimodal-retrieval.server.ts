/**
 * Multimodal retrieval — search across a caller-supplied index of findings.
 * Deterministic keyword + modality filter; no vector fabrication.
 */
import type { Modality, MultimodalFinding } from "./types";
import { rank } from "./ranking";

export interface RetrievalQuery {
  readonly text?: string;
  readonly modalities?: readonly Modality[];
  readonly limit?: number;
  readonly require_evidence?: boolean;
}

function matchesText(f: MultimodalFinding, terms: readonly string[]): boolean {
  if (terms.length === 0) return true;
  const hay = [
    f.summary,
    ...f.signals.map((s) => `${s.text ?? ""} ${s.notes ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function retrieve(
  index: readonly MultimodalFinding[],
  q: RetrievalQuery,
): readonly MultimodalFinding[] {
  const terms = (q.text ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  const mods = new Set(q.modalities ?? []);
  const filtered = index.filter((f) => {
    if (mods.size > 0 && !mods.has(f.modality)) return false;
    if (q.require_evidence && f.evidence.length === 0) return false;
    return matchesText(f, terms);
  });
  const ranked = rank(filtered);
  return q.limit && q.limit > 0 ? ranked.slice(0, q.limit) : ranked;
}
