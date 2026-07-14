// Shared authentication helpers for /api/* routes that must not be
// guarded by the public publishable key.
//
// - verifyCronHookSecret: timing-safe comparison against CRON_HOOK_SECRET
//   for privileged cron / bootstrap / ingest / report-run hooks.
// - verifySupabaseUser: validates the incoming Authorization bearer token
//   against Supabase Auth and returns the user id. Used to gate
//   third-party token-issuing endpoints (ElevenLabs, HeyGen) so only
//   signed-in executives can burn paid quota.

import { createClient } from "@supabase/supabase-js";

export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyCronHookSecret(request: Request): Response | null {
  const expected = process.env.CRON_HOOK_SECRET;
  if (!expected || expected.length < 16) {
    return new Response(JSON.stringify({ error: "cron_hook_secret_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supplied =
    request.headers.get("x-cron-secret") ??
    request.headers.get("x-hook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!supplied || !timingSafeStringEqual(supplied, expected)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function verifySupabaseUser(request: Request): Promise<{ userId: string } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "auth_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { userId: data.user.id };
}

/** Require a signed-in platform administrator or manager for paid token minting. */
export async function verifySupabaseExecutive(
  request: Request,
): Promise<{ userId: string } | Response> {
  const auth = await verifySupabaseUser(request);
  if (auth instanceof Response) return auth;

  try {
    const { hasAnyPlatformRole } = await import("@/lib/authz.server");
    const allowed = await hasAnyPlatformRole(auth.userId, ["admin", "manager"]);
    if (!allowed) {
      return Response.json(
        { error: "forbidden", required_role: "admin_or_manager" },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error("[auth] role verification unavailable", error);
    return Response.json({ error: "authorization_unavailable" }, { status: 503 });
  }

  return auth;
}
