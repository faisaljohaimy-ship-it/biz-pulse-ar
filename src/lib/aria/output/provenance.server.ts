/**
 * Output provenance — short-lived receipts that bind a spoken/exported payload
 * to (requestId · user · org · textHash · expiry), signed with HMAC-SHA256.
 *
 * A TypeScript brand cannot survive HTTP, so an HTTP sink (e.g. TTS) cannot
 * trust a `text` field alone. It requires a receipt minted server-side when the
 * SafeFinnOutput was produced, then re-verified here. The signing secret is
 * INJECTED (defaulting to an existing env secret) so this is fully testable and
 * introduces no new secret system.
 */

export interface ReceiptClaims {
  readonly requestId: string;
  readonly userId: string;
  readonly orgId: string;
  /** SHA-256 (hex) of the exact safe text this receipt authorizes. */
  readonly textHash: string;
  /** RFC3339 expiry. */
  readonly expiresAt: string;
}

/** The default signing secret — an EXISTING server secret, never a new one. */
export function defaultProvenanceSecret(): string | null {
  const s = process.env.ARIA_MESSAGE_APPROVAL_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return b64url(new Uint8Array(sig));
}

/** SHA-256 hex of arbitrary text — the binding a receipt commits to. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonical(c: ReceiptClaims): string {
  return [c.requestId, c.userId, c.orgId, c.textHash, c.expiresAt].join("|");
}

/** Mint a receipt for the given claims. Returns the opaque token. */
export async function mintReceipt(claims: ReceiptClaims, secret: string): Promise<string> {
  const sig = await hmacSha256Hex(secret, canonical(claims));
  return `v1.${claims.expiresAt}.${sig}`;
}

export type ReceiptVerdict =
  | { ok: true }
  | { ok: false; reason: "malformed" | "expired" | "signature_mismatch" };

/**
 * Verify a receipt against the claims the SERVER independently reconstructs
 * (never client-supplied trust). Rejects malformed, expired, mismatched, or
 * cross-user/cross-org/cross-text receipts (any claim difference changes the
 * canonical string and thus the signature).
 */
export async function verifyReceipt(
  token: string,
  claims: ReceiptClaims,
  secret: string,
  nowMs: number,
): Promise<ReceiptVerdict> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return { ok: false, reason: "malformed" };
  const expiresMs = Date.parse(claims.expiresAt);
  if (!Number.isFinite(expiresMs) || nowMs > expiresMs) return { ok: false, reason: "expired" };
  const expected = await mintReceipt(claims, secret);
  return constantTimeEqual(token, expected)
    ? { ok: true }
    : { ok: false, reason: "signature_mismatch" };
}
