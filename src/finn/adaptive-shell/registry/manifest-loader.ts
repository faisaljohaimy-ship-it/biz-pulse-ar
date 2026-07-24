/**
 * Manifest Loader — unknown values in, validated manifests out.
 *
 * Every candidate is schema-validated against the discriminated union; an
 * invalid manifest NEVER registers — it lands in the rejected list with its
 * exact problems (fail closed, nothing silent).
 */
import { anyManifestSchema, type AnyManifest } from "../schemas/manifests";

export type LoadResult =
  | { readonly ok: true; readonly source: string; readonly manifest: AnyManifest }
  | { readonly ok: false; readonly source: string; readonly problems: readonly string[] };

export interface LoadReport {
  readonly loaded: readonly { source: string; manifest: AnyManifest }[];
  readonly rejected: readonly { source: string; problems: readonly string[] }[];
}

export class ManifestLoader {
  loadOne(value: unknown, source: string): LoadResult {
    const parsed = anyManifestSchema.safeParse(value);
    if (!parsed.success) {
      return {
        ok: false,
        source,
        problems: parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "$"}: ${issue.message}`,
        ),
      };
    }
    return { ok: true, source, manifest: parsed.data };
  }

  /** Batch load — valid and invalid manifests are separated, never mixed. */
  loadMany(candidates: Readonly<Record<string, unknown>>): LoadReport {
    const loaded: { source: string; manifest: AnyManifest }[] = [];
    const rejected: { source: string; problems: readonly string[] }[] = [];
    for (const [source, value] of Object.entries(candidates)) {
      const result = this.loadOne(value, source);
      if (result.ok) loaded.push({ source, manifest: result.manifest });
      else rejected.push({ source, problems: result.problems });
    }
    return { loaded, rejected };
  }
}
