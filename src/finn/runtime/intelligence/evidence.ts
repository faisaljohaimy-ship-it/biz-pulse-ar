/**
 * Executive Evidence Engine — closed-world evidence with weighted chains.
 *
 * Evidence comes only from registered sources; unknown sources and unknown
 * evidence ids are refused. Chains preserve caller order, strength is the
 * weighted mean, and missing-information analysis reports exactly which
 * required topics have no supporting evidence (fail closed: no evidence →
 * the topic is missing).
 */
import { IntelError, type EvidenceItem } from "./types";

export interface EvidenceSource {
  readonly id: string;
  readonly description: string;
}

export class ExecutiveEvidenceEngine {
  private readonly sources = new Map<string, EvidenceSource>();
  private readonly items = new Map<string, EvidenceItem>();

  registerSource(source: EvidenceSource): void {
    if (this.sources.has(source.id)) {
      throw new IntelError("evidence", `duplicate source "${source.id}"`);
    }
    this.sources.set(source.id, source);
  }

  add(item: EvidenceItem): void {
    if (!this.sources.has(item.source)) {
      throw new IntelError(
        "evidence",
        `evidence "${item.id}" cites unknown source "${item.source}"`,
      );
    }
    if (this.items.has(item.id)) {
      throw new IntelError("evidence", `duplicate evidence "${item.id}"`);
    }
    if (item.weight < 0 || item.weight > 1) {
      throw new IntelError("evidence", `evidence "${item.id}" weight out of bounds`);
    }
    this.items.set(item.id, item);
  }

  get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }

  /** Ordered evidence chain — an unknown id refuses the whole chain. */
  chain(ids: readonly string[]): readonly EvidenceItem[] {
    return ids.map((id) => {
      const item = this.items.get(id);
      if (!item) throw new IntelError("evidence", `unknown evidence "${id}"`);
      return item;
    });
  }

  /** Weighted mean strength of a chain, 0 when empty (fail closed). */
  strength(ids: readonly string[]): number {
    const chain = this.chain(ids);
    if (chain.length === 0) return 0;
    const total = chain.reduce((sum, item) => sum + item.weight, 0);
    return Math.round((total / chain.length) * 1000) / 1000;
  }

  coveredTopics(ids: readonly string[]): readonly string[] {
    return [...new Set(this.chain(ids).map((item) => item.topic))];
  }

  /** Required topics with NO supporting evidence — the missing information. */
  missingTopics(required: readonly string[], ids: readonly string[]): readonly string[] {
    const covered = new Set(this.coveredTopics(ids));
    return required.filter((topic) => !covered.has(topic));
  }
}
