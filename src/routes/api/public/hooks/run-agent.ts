// One-shot hook to execute a single agent via the production agent runtime.
// Guarded by CRON_HOOK_SECRET (timing-safe) + per-IP rate limit.
// The legacy SUPABASE_PUBLISHABLE_KEY guard was removed because that key
// ships to browsers — anyone could trigger arbitrary agent runs.

import { createFileRoute } from "@tanstack/react-router";
import {
  enforceRateLimit,
  clientBucketKey,
  rateLimitUnavailableResponse,
  rateLimitResponse,
} from "@/lib/governance/rate-limit.server";
import { verifyCronHookSecret, verifySupabaseUser } from "@/lib/hook-auth.server";

export const Route = createFileRoute("/api/public/hooks/run-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        let authenticatedActorId: string | null = null;
        if (denied) {
          const auth = await verifySupabaseUser(request);
          if (auth instanceof Response) return auth;
          authenticatedActorId = auth.userId;
        }

        // Cap per-IP at 10 agent runs / minute.
        const { allowed, unavailable } = await enforceRateLimit(
          clientBucketKey(request, "run-agent"),
          10,
          60,
        );
        if (unavailable) return rateLimitUnavailableResponse();
        if (!allowed) return rateLimitResponse();

        let body: { agentId?: string; goalOverride?: string } = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        // الافتراض «briefing»: وكيلٌ كنسيّ مفعَّل على الإنتاج (قِيس ٢٠٢٦/١٠/٢٣:
        // enabled=true). كان «executive_briefer» وهو معطَّل منذ ترحيل المجلس
        // (20260801100000)، فنداءُ cron بلا agentId كان يفشل «Agent disabled».
        const agentId = body.agentId ?? "briefing";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runAgent } = await import("@/lib/exec/agent-runtime.server");

        let actorId = authenticatedActorId;
        let requiredOrgId: string | null = null;

        if (authenticatedActorId) {
          // Bearer-auth fallback path: caller must be manager+ in an org, and
          // may only invoke agents that belong to that same org.
          const { data: membership } = await supabaseAdmin
            .from("org_members")
            .select("org_id, role")
            .eq("user_id", authenticatedActorId)
            .in("role", ["manager", "admin", "owner"])
            .order("joined_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!membership?.org_id) {
            return new Response(JSON.stringify({ error: "forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
          requiredOrgId = membership.org_id as string;
        } else {
          // Cron/hook-secret path: still needs a real actor row — **and** a
          // platform role: `runAgent` gates on `user_roles` (admin/manager), so
          // an org admin/owner without one would start and fail every run.
          // Deterministic: the longest-standing admin/owner who also holds a
          // platform role; no role is granted here, only selected.
          const { hasAnyPlatformRole } = await import("@/lib/authz.server");
          const { data: candidates } = await supabaseAdmin
            .from("org_members")
            .select("user_id, org_id")
            .in("role", ["admin", "owner"])
            .order("joined_at", { ascending: true })
            .limit(10);
          for (const member of candidates ?? []) {
            if (await hasAnyPlatformRole(member.user_id as string, ["admin", "manager"])) {
              actorId = member.user_id as string;
              requiredOrgId = (member.org_id as string | undefined) ?? null;
              break;
            }
          }
        }
        if (!actorId) {
          return new Response(JSON.stringify({ error: "no_admin_org_member" }), {
            status: 412,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await runAgent(supabaseAdmin as any, {
            agentId,
            actorId: actorId as string,
            goalOverride: body.goalOverride ?? null,
            context: { source: "public.hook.run-agent" },
            requiredOrgId,
          });
          // تشغيلٌ فشل ليس 200 `ok:true` (RT-10): المجدوِل والواجهة يقرآن
          // الحالة من الرمز، لا من حقلٍ داخل جسمٍ «ناجح».
          const failed = res.status === "failed";
          return new Response(
            JSON.stringify(
              { ok: !failed, result: res, ...(failed ? { error: res.error ?? res.status } : {}) },
              null,
              2,
            ),
            {
              status: failed ? 502 : 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
