import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { apiError, input, z } from "@/lib/api";
import { httpJson } from "@/lib/api/http.server";
import { requirePlatformAdmin } from "@/lib/authz.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_teams";

type TeamLite = { id: string; displayName: string };
type ChannelLite = { id: string; displayName: string; teamId: string };

function gwHeaders(): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const teamsKey = process.env.MICROSOFT_TEAMS_API_KEY;
  if (!lovableKey || !teamsKey) {
    throw apiError("forbidden", "Teams connector not configured", {
      details: { connector: "microsoft_teams" },
    });
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": teamsKey,
    "Content-Type": "application/json",
  };
}

async function gw<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return httpJson<T>(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...gwHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    label: `teams ${init?.method ?? "GET"} ${path}`,
  });
}

export const listTeamsChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.userId);
    let teams: TeamLite[] = [];
    try {
      const res = await gw<{ value?: TeamLite[] }>("/me/joinedTeams?$select=id,displayName");
      teams = res.value ?? [];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isMsa = /403|MSA account|not supported for MSA|Forbidden/i.test(message);
      return {
        teams: [] as TeamLite[],
        channels: [] as ChannelLite[],
        unavailable: true as const,
        reason: isMsa
          ? "The linked Microsoft account is personal (MSA) or lacks Teams access. Microsoft Teams requires a work/school (Entra ID) account with Teams enabled."
          : "Microsoft Teams is temporarily unavailable.",
      };
    }
    const items: ChannelLite[] = [];
    for (const t of teams.slice(0, 8)) {
      try {
        const ch = await gw<{ value?: Array<{ id: string; displayName: string }> }>(
          `/teams/${t.id}/channels?$select=id,displayName`,
        );
        for (const c of ch.value ?? [])
          items.push({ id: c.id, displayName: c.displayName, teamId: t.id });
      } catch {
        /* skip team */
      }
    }
    return { teams, channels: items, unavailable: false as const, reason: null };
  });

export const sendTeamsAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    input(
      z.object({
        teamId: z.string().min(1),
        channelId: z.string().min(1),
        html: z.string().min(1).max(28000),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    await gw(`/teams/${data.teamId}/channels/${data.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: { contentType: "html", content: data.html } }),
    });
    return { ok: true, sentAt: new Date().toISOString() };
  });
