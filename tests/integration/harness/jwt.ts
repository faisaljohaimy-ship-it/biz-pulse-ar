/**
 * Test-only JWT minting with the per-run secret (HS256 via `node:crypto`).
 *
 * PostgREST verifies these tokens for `/rest/v1/*`; the gateway verifies the
 * same signature for `/auth/v1/user` — and `stack.sh` mints the anon/service
 * tokens with `mint-jwt.mjs` (also node:crypto). No `jose`: it is only a
 * transitive dependency, and this project forbids adding or relying on
 * undeclared ones.
 *
 * `app_metadata.current_org` is what `current_org_id()` reads first; the
 * fixtures give every test user exactly one membership, so the claim is
 * redundant for them but is still set — production tokens carry it.
 */
import { createHmac } from "node:crypto";
import { requireEnv } from "./env";

export type UserJwtOptions = {
  sub: string;
  /** Written to app_metadata.current_org — the active tenant claim. */
  org?: string;
  email?: string;
  ttlSeconds?: number;
};

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function sign(claims: Record<string, unknown>, secret: string): string {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64(claims);
  const sig = createHmac("sha256", secret).update(`${head}.${payload}`).digest("base64url");
  return `${head}.${payload}.${sig}`;
}

export async function mintUserJwt(opts: UserJwtOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      role: "authenticated",
      aud: "authenticated",
      iss: "sadeed-integration",
      sub: opts.sub,
      iat: now,
      exp: now + (opts.ttlSeconds ?? 3600),
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.org ? { app_metadata: { current_org: opts.org } } : {}),
    },
    requireEnv("INTEGRATION_JWT_SECRET"),
  );
}

/** A token signed with the WRONG secret — must be rejected everywhere. */
export async function mintForgedUserJwt(sub: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { role: "authenticated", aud: "authenticated", sub, iat: now, exp: now + 3600 },
    "not-the-stack-secret-at-all-0123456789abcdef",
  );
}
