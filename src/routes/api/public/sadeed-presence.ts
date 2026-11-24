/**
 * SADEED Presence endpoint — welcome + interruption + heartbeat.
 *
 * GET  /api/public/sadeed-presence?sid=<session>
 *   Returns { greeting, delta, interruption } for the given session and
 *   advances the presence cursor.
 *
 * POST /api/public/sadeed-presence
 *   Body: { sessionId, kind: "heartbeat"|"seen_incident"|"seen_alert", ref? }
 *   Updates the presence cursor so SADEED does not interrupt again.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  enforceRateLimit,
  rateLimitResponse,
  rateLimitUnavailableResponse,
} from "@/lib/governance/rate-limit.server";
import { composePresenceGreeting } from "@/lib/sadeed/presence/greeting.server";
import { detectInterruption } from "@/lib/sadeed/presence/interruption.server";
import { readCursor, writeCursor } from "@/lib/sadeed/presence/tiers.server";
import { requireBearerUser } from "@/lib/sadeed/require-bearer.server";
import { getCurrentOrgIdForUser } from "@/lib/authz.server";
import { presenceCursorScope } from "@/lib/sadeed/presence/change-comparison";
import { computePresenceDelta } from "@/lib/sadeed/presence/since-last-visit.server";

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "anon"
  );
}

const HeartbeatSchema = z.object({
  sessionId: z.string().min(4).max(120),
  kind: z.enum(["heartbeat", "seen_incident", "seen_alert"]),
  ref: z.string().max(160).optional(),
});

export const Route = createFileRoute("/api/public/sadeed-presence")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-presence:${ip}`, 20, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();
        const auth = await requireBearerUser(request);
        if ("response" in auth) return auth.response;

        const url = new URL(request.url);
        const sid = (url.searchParams.get("sid") ?? "").trim();
        if (!sid || sid.length < 4 || sid.length > 120) {
          return Response.json({ error: "missing_sid" }, { status: 400 });
        }
        try {
          // Scope all admin-client reads to the caller's org so incidents,
          // alerts, KPIs and priorities never bleed across tenants.
          const orgId = await getCurrentOrgIdForUser(auth.userId).catch(() => null);
          const scope = orgId ? presenceCursorScope(auth.userId, orgId, sid) : null;
          if (!scope) return Response.json({ error: "scope_unavailable" }, { status: 503 });
          if (url.searchParams.get("view") === "changes") {
            const delta = await computePresenceDelta(scope, orgId, auth.userId);
            return Response.json(
              { delta, accountId: auth.userId, organizationId: orgId, durableBaseline: false },
              {
                headers: { "Cache-Control": "private, no-store" },
              },
            );
          }
          const [greeting, interruption] = await Promise.all([
            composePresenceGreeting(scope, orgId),
            detectInterruption(scope, orgId),
          ]);
          return Response.json(
            {
              greeting_en: greeting.greeting_en,
              greeting_ar: greeting.greeting_ar,
              time_band: greeting.timeBand,
              delta: greeting.delta,
              top_priorities: greeting.briefing.priorities.slice(0, 3),
              health: greeting.briefing.health,
              interruption,
            },
            { headers: { "Cache-Control": "private, no-store" } },
          );
        } catch (e) {
          console.error("[aria-presence.GET]", e instanceof Error ? e.message : e);
          return Response.json({ error: "presence_failed" }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rate = await enforceRateLimit(`pub-aria-presence-post:${ip}`, 30, 60);
        if (rate.unavailable) return rateLimitUnavailableResponse();
        if (!rate.allowed) return rateLimitResponse();
        const auth = await requireBearerUser(request);
        if ("response" in auth) return auth.response;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const parsed = HeartbeatSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
        const orgId = await getCurrentOrgIdForUser(auth.userId).catch(() => null);
        const scope = orgId ? presenceCursorScope(auth.userId, orgId, parsed.data.sessionId) : null;
        if (!scope) return Response.json({ error: "scope_unavailable" }, { status: 503 });
        const nowISO = new Date().toISOString();
        const cur = readCursor(scope) ?? { lastVisitAt: nowISO };
        if (parsed.data.kind === "seen_incident") cur.lastSeenIncidentId = parsed.data.ref;
        if (parsed.data.kind === "seen_alert") cur.lastSeenAlertAt = nowISO;
        cur.lastVisitAt = nowISO;
        writeCursor(scope, cur);
        return Response.json(
          { ok: true, cursor: cur },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      },
    },
  },
});
