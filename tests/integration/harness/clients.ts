/**
 * Real `@supabase/supabase-js` clients against the integration gateway.
 *
 *   adminClient()  — service_role key: the same client shape as
 *                    `supabaseAdmin` in src/integrations/supabase/client.server.ts
 *                    (RLS bypassed). The runtime under test builds its own from
 *                    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY; this one is for
 *                    assertions and for the hook-style `runAgent(supabaseAdmin)` path.
 *   userClient()   — anon key + a user Bearer token: exactly what
 *                    `requireSupabaseAuth` builds for a signed-in caller (RLS applies).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import { mintUserJwt, type UserJwtOptions } from "./jwt";

const clientOptions = {
  auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
} as const;

export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    ...clientOptions,
  });
}

export function anonClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
    ...clientOptions,
  });
}

export async function userClient(opts: UserJwtOptions): Promise<SupabaseClient> {
  const token = await mintUserJwt(opts);
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Fixture ids — mirror tests/integration/sql/fixtures.sql. */
export const FIXTURES = {
  ORG_A: "aaaaaaaa-0000-4000-8000-00000000000a",
  ORG_B: "bbbbbbbb-0000-4000-8000-00000000000b",
  DEFAULT_ORG: "00000000-0000-0000-0000-000000000001",
  ADMIN_A: "11111111-1111-4111-8111-111111111111",
  MANAGER_A: "22222222-2222-4222-8222-222222222222",
  VIEWER_A: "33333333-3333-4333-8333-333333333333",
  ADMIN_B: "44444444-4444-4444-8444-444444444444",
  RUN_B: "bbbbbbbb-0000-4000-8000-0000000000b1",
  AGENT: "operations",
} as const;
