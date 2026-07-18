/**
 * optionalSupabaseAuth — like requireSupabaseAuth, but never rejects guests.
 *
 * With a valid Bearer token the handler receives the caller's RLS-scoped
 * client and userId (identical to requireSupabaseAuth). Without one it
 * receives a plain ANON-key client and userId=null, so anon RLS policies in
 * the database decide exactly what a guest may read — no service-role bypass.
 * Use ONLY for read paths that are intentionally open to guest browsing
 * (e.g. the HCIS showcase overview); writes must stay on requireSupabaseAuth.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL (or VITE_SUPABASE_URL)"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in the deployment's Environment Variables.`;
      console.error("[Supabase]", message);
      throw new Error(message);
    }

    const token = (() => {
      const header = getRequest()?.headers?.get("authorization");
      if (!header?.startsWith("Bearer ")) return null;
      const value = header.slice("Bearer ".length).trim();
      return value.length > 0 ? value : null;
    })();

    const anonClient = () =>
      createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

    let supabase = anonClient();
    let userId: string | null = null;
    if (token) {
      const authed = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await authed.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        supabase = authed;
        userId = data.claims.sub;
      }
      // Invalid/expired token → stay on the anon client (guest read).
    }

    return next({ context: { supabase, userId } });
  },
);
