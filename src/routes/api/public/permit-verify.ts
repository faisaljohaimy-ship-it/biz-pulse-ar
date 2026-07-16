/**
 * Public permit verification sink for the PTW QR code. Anonymous — no auth.
 * Returns a SAFE subset of a permit by id (no org internals, no PII beyond the
 * contractor label). Service-role read behind a per-IP rate limit. This is what
 * a scanned QR opens: "is this permit valid, for whom, where, until when?".
 */
import { createFileRoute } from "@tanstack/react-router";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";

function clientKey(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    cf || fwd.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return `permit-verify:${ip}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/permit-verify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rate = await enforceRateLimit(clientKey(request), 60, 60);
        if (rate.unavailable || !rate.allowed) {
          return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
        }
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!UUID_RE.test(id)) {
          return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // biome-ignore lint/suspicious/noExplicitAny: table not yet in generated types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose client for new table
          const db = supabaseAdmin as unknown as { from: (t: string) => any };
          const { data, error } = await db
            .from("permits")
            .select(
              "ref,type_key,region,location,contractor,worker_count,starts_at,ends_at,status,precautions",
            )
            .eq("id", id)
            .maybeSingle();
          if (error || !data) {
            return Response.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          const now = Date.now();
          const valid =
            data.status === "active" &&
            new Date(data.starts_at).getTime() <= now &&
            new Date(data.ends_at).getTime() >= now;
          return Response.json(
            {
              ok: true,
              valid,
              permit: {
                ref: data.ref,
                type_key: data.type_key,
                region: data.region,
                location: data.location,
                contractor: data.contractor,
                worker_count: data.worker_count,
                starts_at: data.starts_at,
                ends_at: data.ends_at,
                status: data.status,
                precautions: data.precautions ?? [],
              },
            },
            { headers: { "cache-control": "no-store" } },
          );
        } catch {
          return Response.json({ ok: false, error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
