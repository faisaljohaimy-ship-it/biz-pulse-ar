/**
 * GET /api/public/health
 * Enterprise health probe — load balancers, uptime monitors, /status page.
 * Returns 200 whenever the worker itself can answer; individual subsystem
 * failures are reported in the JSON body so ops can alert without flapping.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type SubsystemStatus = "ok" | "degraded" | "down" | "unknown";
interface Subsystem {
  status: SubsystemStatus;
  latency_ms?: number;
  detail?: string;
}

const VERSION = process.env.APP_VERSION ?? "1.5.1";
/** أقصى انتظارٍ لفحص القاعدة — أطول من مهلة بوّابة الدردشة قليلًا، وأقصر من صبر المراقب. */
export const HEALTH_DB_DEADLINE_MS = 2_500;

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = Date.now();

        // Real DB ping — a cheap head-count against a known table.
        // Uses the publishable key + a public policy, no service role.
        let db: Subsystem = { status: "unknown" };
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!url || !key) {
            db = { status: "unknown", detail: "not_configured" };
          } else {
            const client = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const t0 = Date.now();
            // مهلةٌ صلبة (VIBE 5.1): قاعدةٌ تقبل الاتصال ولا تجيب كانت تعلّق فحص
            // الصحّة نفسه — فلا يرى المراقب «down» بل انقطاعًا.
            let timer: ReturnType<typeof setTimeout> | undefined;
            const probe = await Promise.race([
              client.from("organizations").select("id", { count: "exact", head: true }).limit(1),
              new Promise<"timeout">((resolve) => {
                timer = setTimeout(() => resolve("timeout"), HEALTH_DB_DEADLINE_MS);
              }),
            ]).finally(() => clearTimeout(timer));
            const latency = Date.now() - t0;
            if (probe === "timeout") {
              db = { status: "down", latency_ms: latency, detail: "timeout" };
            } else if (probe.error) {
              const { error } = probe;
              // A permission error still proves the DB responded.
              const isPermission = /permission|rls|denied/i.test(error.message);
              db = isPermission
                ? { status: "ok", latency_ms: latency, detail: "reachable" }
                : { status: "degraded", latency_ms: latency, detail: error.message };
            } else {
              db = { status: "ok", latency_ms: latency };
            }
          }
        } catch (e) {
          db = {
            status: "down",
            detail: e instanceof Error ? e.message : String(e),
          };
        }

        // VIBE 5.1: مخزن حدّ المعدّل — فحصٌ حقيقي بمهلة، وحالة القاطع وسياسة التدهور.
        // هو التبعية التي أسقطت الدردشة ٢٠٢٦/١٠/١٦، فتُراقَب باسمها لا ضمن «db».
        let rateLimitStorage: Subsystem = { status: "unknown" };
        try {
          const { enforceRateLimit, gateDegradedMode, rateLimitStorageState } =
            await import("@/lib/governance/rate-limit.server");
          const t0 = Date.now();
          const probe = await enforceRateLimit("health:probe", 600, 60, { deadlineMs: 1_500 });
          const state = rateLimitStorageState();
          const detail = `breaker=${state.state};degraded_mode=${gateDegradedMode()}`;
          rateLimitStorage = probe.unavailable
            ? { status: "down", latency_ms: Date.now() - t0, detail }
            : { status: "ok", latency_ms: Date.now() - t0, detail };
        } catch (e) {
          rateLimitStorage = {
            status: "down",
            detail: e instanceof Error ? e.message : String(e),
          };
        }

        const subsystems: Record<string, Subsystem> = {
          web: { status: "ok", latency_ms: Date.now() - startedAt },
          db,
          rate_limit_storage: rateLimitStorage,
          gemini:
            process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
              ? { status: "ok" }
              : { status: "unknown", detail: "not_configured" },
        };

        const worst = Object.values(subsystems)
          .map((s) => s.status)
          .reduce<SubsystemStatus>((acc, s) => {
            const rank: Record<SubsystemStatus, number> = {
              ok: 0,
              unknown: 1,
              degraded: 2,
              down: 3,
            };
            return rank[s] > rank[acc] ? s : acc;
          }, "ok");

        return Response.json(
          {
            status: worst === "down" ? "down" : worst === "degraded" ? "degraded" : "ok",
            version: VERSION,
            timestamp: new Date().toISOString(),
            uptime_hint: "stateless-worker",
            subsystems,
          },
          {
            status: worst === "down" ? 503 : 200,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
