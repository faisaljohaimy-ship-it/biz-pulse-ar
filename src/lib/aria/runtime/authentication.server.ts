/**
 * Phase 9.2 — Authentication. Verifies runtime tokens tied to an agent
 * identity. Tokens are opaque HMAC-signed strings issued by the runtime.
 * External auth (users, orgs) remains delegated to existing systems.
 */

const secrets = new Map<string, string>(); // agent_id -> secret

function randomHex(len: number): string {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export async function issueAgentToken(agentId: string): Promise<string> {
  let secret = secrets.get(agentId);
  if (!secret) {
    secret = randomHex(64);
    secrets.set(agentId, secret);
  }
  const nonce = randomHex(16);
  const issued_at = Date.now().toString();
  const payload = `${agentId}.${issued_at}.${nonce}`;
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export interface AuthResult {
  ok: boolean;
  agent_id: string | null;
  issued_at: number | null;
  reason: string;
}

export async function verifyAgentToken(token: string): Promise<AuthResult> {
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, agent_id: null, issued_at: null, reason: "malformed" };
  const [agentId, issuedAtStr, nonce, sig] = parts as [string, string, string, string];
  const secret = secrets.get(agentId);
  if (!secret) return { ok: false, agent_id: null, issued_at: null, reason: "unknown agent" };
  const expected = await hmac(secret, `${agentId}.${issuedAtStr}.${nonce}`);
  if (expected !== sig) return { ok: false, agent_id: null, issued_at: null, reason: "bad signature" };
  return { ok: true, agent_id: agentId, issued_at: Number(issuedAtStr), reason: "ok" };
}

export function revokeAgentToken(agentId: string): void {
  secrets.delete(agentId);
}
