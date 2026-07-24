/**
 * Metadata Registry — queryable metadata attached to any shell object.
 *
 * Metadata lives beside the manifests, keyed by (kind, id). Attach merges,
 * reads return frozen copies, and search scans keys and stringified values —
 * the runtime can annotate and discover objects without touching manifests.
 */
import { type ManifestKind } from "../types";

export class MetadataRegistry {
  private readonly entries = new Map<string, Map<string, unknown>>();

  private key(kind: ManifestKind, id: string): string {
    return `${kind}:${id}`;
  }

  attach(kind: ManifestKind, id: string, metadata: Readonly<Record<string, unknown>>): void {
    const key = this.key(kind, id);
    const bucket = this.entries.get(key) ?? new Map<string, unknown>();
    for (const [name, value] of Object.entries(metadata)) bucket.set(name, value);
    this.entries.set(key, bucket);
  }

  metadataOf(kind: ManifestKind, id: string): Readonly<Record<string, unknown>> {
    return Object.freeze(Object.fromEntries(this.entries.get(this.key(kind, id)) ?? []));
  }

  /** Search across all objects: matches metadata keys and values. */
  search(text: string): readonly { kind: ManifestKind; id: string; matchedKey: string }[] {
    const needle = text.toLowerCase();
    const hits: { kind: ManifestKind; id: string; matchedKey: string }[] = [];
    for (const [key, bucket] of this.entries) {
      const [kind, id] = key.split(/:(.+)/) as [ManifestKind, string];
      for (const [name, value] of bucket) {
        if (name.toLowerCase().includes(needle) || String(value).toLowerCase().includes(needle)) {
          hits.push({ kind, id, matchedKey: name });
        }
      }
    }
    return hits;
  }

  count(): number {
    return this.entries.size;
  }
}
