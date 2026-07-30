/**
 * Phase 9.3 — Credential resolver. Real credentials come from a bound
 * provider; without one, resolution returns "not found" and the engine
 * marks execution as "unconfigured".
 */

import type { CredentialResolution } from "./types";

export interface CredentialProvider {
  resolve(reference: string): Promise<{ found: boolean; reference: string | null; reason: string }>;
}

let provider: CredentialProvider | null = null;

export function bindCredentialProvider(p: CredentialProvider): void {
  provider = p;
}

export function unbindCredentialProvider(): void {
  provider = null;
}

export async function resolveCredentials(reference: string | null): Promise<CredentialResolution> {
  if (reference === null)
    return { found: true, reference: null, reason: "no credentials required" };
  if (!provider) {
    return { found: false, reference: null, reason: "no credential provider bound" };
  }
  const r = await provider.resolve(reference);
  return { found: r.found, reference: r.reference, reason: r.reason };
}
