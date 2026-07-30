/**
 * Phase 9.1 — Webhook dispatcher.
 *
 * Registers inbound webhook route contracts (URL path suffix + verification
 * kind) per connector, and provides a signed-payload verifier that uses
 * ONLY vault-referenced secrets. Never logs raw payloads or secrets.
 */

import { timingSafeEqual, createHmac } from "crypto";
import { getCredentialVault } from "./credential-vault";

export type WebhookVerification =
  | { kind: "none" }
  | { kind: "hmac_sha256"; secret_env: string; header: string; encoding: "hex" | "base64" }
  | { kind: "shared_token"; secret_env: string; header: string };

export interface WebhookRoute {
  connector_id: string;
  event: string;
  suggested_path: string;
  verification: WebhookVerification;
  description: string;
}

const ROUTES = new Map<string, WebhookRoute>();

function key(connectorId: string, event: string): string {
  return `${connectorId}::${event}`;
}

export function registerWebhookRoute(route: WebhookRoute): void {
  ROUTES.set(key(route.connector_id, route.event), route);
}

export function listWebhookRoutes(connectorId?: string): WebhookRoute[] {
  const all = [...ROUTES.values()];
  return connectorId ? all.filter((r) => r.connector_id === connectorId) : all;
}

export async function verifyWebhookSignature(
  route: WebhookRoute,
  rawBody: string,
  headers: Record<string, string | undefined>,
): Promise<boolean> {
  const v = route.verification;
  if (v.kind === "none") return true;
  const vault = getCredentialVault();
  const ref = vault.reference(v.secret_env);
  if (!ref.present) return false;
  if (v.kind === "shared_token") {
    const provided = headers[v.header.toLowerCase()] ?? headers[v.header];
    if (!provided) return false;
    const ok = await ref.use((secret) => {
      const a = Buffer.from(secret);
      const b = Buffer.from(provided);
      return a.length === b.length && timingSafeEqual(a, b);
    });
    return ok === true;
  }
  // hmac_sha256
  const provided = headers[v.header.toLowerCase()] ?? headers[v.header];
  if (!provided) return false;
  const ok = await ref.use((secret) => {
    const expected = createHmac("sha256", secret).update(rawBody).digest(v.encoding);
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  return ok === true;
}
