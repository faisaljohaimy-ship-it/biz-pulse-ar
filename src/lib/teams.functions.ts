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
    const teams = await gw<{ value?: TeamLite[] }>("/me/joinedTeams?$select=id,displayName");
    const items: ChannelLite[] = [];
    for (const t of (teams.value ?? []).slice(0, 8)) {
      try {
        const ch = await gw<{ value?: Array<{ id: string; displayName: string }> }>(
          `/teams/${t.id}/channels?$select=id,displayName`,
        );
        for (const c of ch.value ?? []) items.push({ id: c.id, displayName: c.displayName, teamId: t.id });
      } catch { /* skip team */ }
    }
    return { teams: teams.value ?? [], channels: items };
  });

export const sendTeamsAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    input(
      z.object({
        teamId: z.string().min(1),
        channelId: z.string().min(1),
        html: z.string().min(1).max(28000),
      }),
    ),
  )
  .handler(async ({ data }) => {
    await gw(`/teams/${data.teamId}/channels/${data.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: { contentType: "html", content: data.html } }),
    });
    return { ok: true, sentAt: new Date().toISOString() };
  });
