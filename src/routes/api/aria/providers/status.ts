import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { hasAnyPlatformRole } from "@/lib/authz.server";
import { inspectAriaProviderReadiness } from "@/lib/aria/provider-readiness.server";

const HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

function fail(error: string, status: number): Response {
  return Response.json({ ok: false, error }, { status, headers: HEADERS });
}

export const Route = createFileRoute("/api/aria/providers/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization")?.trim();
        if (!authorization?.startsWith("Bearer ")) return fail("Authentication is required.", 401);
        const url = process.env.SUPABASE_URL?.trim();
        const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
        if (!url || !key) return fail("ARIA data service is not configured.", 503);
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return fail("Authentication is invalid.", 401);
        if (!(await hasAnyPlatformRole(data.user.id, ["admin", "manager"])))
          return fail("Provider status requires admin or manager role.", 403);
        return Response.json(
          { ok: true, ...inspectAriaProviderReadiness() },
          { status: 200, headers: HEADERS },
        );
      },
    },
  },
});
