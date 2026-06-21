import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_teams";

type TeamLite = { id: string; displayName: string };
type ChannelLite = { id: string; displayName: string; teamId: string };

async function gw(path: string, init?: RequestInit) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const teamsKey = process.env.MICROSOFT_TEAMS_API_KEY;
  if (!lovableKey || !teamsKey) throw new Error("Teams connector not configured");
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": teamsKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Teams ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

export const listTeamsChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const teams = (await gw("/me/joinedTeams?$select=id,displayName")) as { value?: TeamLite[] };
    const items: ChannelLite[] = [];
    for (const t of (teams.value ?? []).slice(0, 8)) {
      try {
        const ch = (await gw(`/teams/${t.id}/channels?$select=id,displayName`)) as { value?: Array<{ id: string; displayName: string }> };
        for (const c of ch.value ?? []) items.push({ id: c.id, displayName: c.displayName, teamId: t.id });
      } catch { /* skip team */ }
    }
    return { teams: teams.value ?? [], channels: items };
  });

export const sendTeamsAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { teamId: string; channelId: string; html: string }) => {
    if (!d?.teamId || !d?.channelId) throw new Error("Missing channel");
    if (!d.html || d.html.length > 28000) throw new Error("Invalid body");
    return d;
  })
  .handler(async ({ data }) => {
    await gw(`/teams/${data.teamId}/channels/${data.channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: { contentType: "html", content: data.html } }),
    });
    return { ok: true, sentAt: new Date().toISOString() };
  });
