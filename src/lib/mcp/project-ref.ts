/**
 * Resolve the Supabase OAuth issuer for the MCP server.
 *
 * WHY THIS EXISTS
 * The MCP endpoint advertises an OAuth authorization server, and a client
 * follows it to complete the handshake (RFC 8414: fetch the issuer, then
 * `<issuer>/.well-known/oauth-authorization-server`). The issuer used to be
 * built from `VITE_SUPABASE_PROJECT_ID` alone, with `"project-ref-unset"` as a
 * fallback — and that variable is set nowhere: not in `.env.local`, not in
 * `deploy.yml`, not in CI. So the deployed server advertised
 *
 *     https://project-ref-unset.supabase.co/auth/v1
 *
 * a host that does not resolve. Discovery failed, and connecting the system to
 * https://neexios.com/mcp could never succeed. The failure is silent in the
 * build: a string template with an unset variable still produces a valid-looking
 * URL, so nothing errors — it just points nowhere.
 *
 * THE FIX
 * Fall back to `VITE_SUPABASE_URL`, which IS set in every environment, and take
 * the project ref out of it. One variable already carries this information;
 * requiring a second one to be set correctly was the bug.
 *
 * WHY THE HOST IS CHECKED INSTEAD OF USED DIRECTLY
 * The issuer MUST be the direct `*.supabase.co` host. A `.lovable.cloud` proxy
 * URL is rejected by issuer verification, so `VITE_SUPABASE_URL` cannot simply
 * be concatenated — it is only trusted when it really is a Supabase host. When
 * it is not, we fall through rather than advertise something that will be
 * refused.
 */

/** Sentinel kept for one reason: an unresolvable issuer must be *recognisable*
 *  in a built artifact. Grepping a bundle for this string answers "did this
 *  build ship a working MCP endpoint?" without deploying it. */
export const UNRESOLVED_PROJECT_REF = "project-ref-unset";

/**
 * Last-resort literal. The published Workers build has shipped an issuer of
 * `project-ref-unset.supabase.co` — i.e. NEITHER env var reached the bundle at
 * build time — which makes `claude mcp add --transport http nexios
 * https://neexios.com/mcp` fail at OAuth discovery. Baking the ref in as a
 * final fallback removes the dependency on build-time env injection entirely;
 * the env vars still win when present.
 *
 * THE VALUE IS NOT FREE TO CHOOSE. It must equal `project_id` in
 * supabase/config.toml — the declared project — and the test below enforces
 * that. An earlier revision baked in `jhutlofapjfjjeajawie`, a ref this repo
 * had already retired twice. That is worse than no fallback: it replaces a
 * LOUD failure (`project-ref-unset`, unmistakable in the discovery document —
 * it is how this whole bug was spotted from one screenshot) with a SILENT one,
 * a plausible-looking host whose tokens are simply never accepted, and no way
 * to tell from the outside why.
 */
export const BUILTIN_PROJECT_REF = "adhhxmmgfatkmzpokvil";

/** A Supabase project ref is a 20-character lowercase alphanumeric label. */
const SUPABASE_HOST = /^https?:\/\/([a-z0-9]{20})\.supabase\.co\/?$/i;

export interface McpEnv {
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
}

/**
 * Returns the project ref, or {@link UNRESOLVED_PROJECT_REF} when neither
 * source yields one. Never throws — a broken MCP endpoint must not take the
 * whole server down at import time.
 */
export function resolveProjectRef(env: McpEnv): string {
  const explicit = env.VITE_SUPABASE_PROJECT_ID?.trim();
  if (explicit) return explicit;

  const url = env.VITE_SUPABASE_URL?.trim();
  const match = url?.match(SUPABASE_HOST);
  if (match) return match[1].toLowerCase();

  return UNRESOLVED_PROJECT_REF;
}

/** The full issuer URL the MCP server advertises. */
export function resolveIssuer(env: McpEnv): string {
  return `https://${resolveProjectRef(env)}.supabase.co/auth/v1`;
}

/** True when the issuer points at a real project — i.e. the endpoint is
 *  actually connectable. Used by the contract test and worth logging on boot. */
export function isIssuerResolved(env: McpEnv): boolean {
  return resolveProjectRef(env) !== UNRESOLVED_PROJECT_REF;
}
