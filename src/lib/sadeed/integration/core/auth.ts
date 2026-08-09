/**
 * Phase 9.1 — Authentication manager.
 *
 * Records the required credential shape per connector. Never handles
 * plaintext secret values — resolution goes through the Credential Vault.
 */

import type { AuthKind, CredentialField } from "./types";
import { getConnector, listConnectors } from "./registry";
import { getCredentialVault } from "./credential-vault";

export interface AuthReadiness {
  connector_id: string;
  auth: AuthKind;
  required: CredentialField[];
  missing: string[];
  ready: boolean;
}

export function evaluateAuth(connectorId: string): AuthReadiness | null {
  const desc = getConnector(connectorId);
  if (!desc) return null;
  const required = desc.credentials.filter((c) => c.required);
  const vault = getCredentialVault();
  const missing = vault.missing(required.map((c) => c.name));
  return {
    connector_id: connectorId,
    auth: desc.auth,
    required,
    missing,
    ready: missing.length === 0,
  };
}

export function evaluateAuthAll(): AuthReadiness[] {
  const out: AuthReadiness[] = [];
  for (const desc of listConnectors()) {
    const r = evaluateAuth(desc.id);
    if (r) out.push(r);
  }
  return out;
}
