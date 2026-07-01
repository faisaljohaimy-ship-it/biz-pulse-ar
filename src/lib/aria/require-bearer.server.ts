/**
 * Bearer-token auth guard for public API routes that must not leak
 * real operational data to unauthenticated callers.
 *
 * Validates the `Authorization: Bearer <token>` header against
 * Supabase Auth using the publishable client and returns the
 * authenticated user id + a Response to short-circuit with when the
 * caller is not signed in.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function requireBearerUser(
  request: Request,
): Promise<{ userId: string; token: string } | { response: Response }> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return { response: unauthorized() };
  }
  const token = header.slice(7).trim();
  if (!token || token.length < 16) return { response: unauthorized() };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { response: unauthorized() };

  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { response: unauthorized() };
  return { userId: data.user.id, token };
}
