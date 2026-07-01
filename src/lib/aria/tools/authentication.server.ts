/**
 * Phase 9.3 — Authentication of the calling agent for a tool execution.
 * Delegates real auth to a bound verifier; unbound = unauthenticated.
 */

export interface AuthVerifier {
  verify(agentId: string, tokenOrSession: string): Promise<{ ok: boolean; reason: string }>;
}

let verifier: AuthVerifier | null = null;

export function bindAuthVerifier(v: AuthVerifier): void {
  verifier = v;
}

export function unbindAuthVerifier(): void {
  verifier = null;
}

export interface AuthenticationResult {
  authenticated: boolean;
  reason: string;
}

export async function authenticate(
  agentId: string,
  tokenOrSession: string | null,
): Promise<AuthenticationResult> {
  if (!verifier) return { authenticated: false, reason: "no auth verifier bound" };
  if (!tokenOrSession) return { authenticated: false, reason: "missing token" };
  const r = await verifier.verify(agentId, tokenOrSession);
  return { authenticated: r.ok, reason: r.reason };
}
