import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { apiError, input, z } from "@/lib/api";
import { httpFetch, httpJson } from "@/lib/api/http.server";
import { requirePlatformAdmin } from "@/lib/authz.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_sharepoint";

function authHeaders(): Record<string, string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const spKey = process.env.MICROSOFT_SHAREPOINT_API_KEY;
  if (!lovableKey || !spKey) {
    throw apiError("forbidden", "SharePoint connector not configured", {
      details: { connector: "microsoft_sharepoint" },
    });
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": spKey,
  };
}

async function spJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return httpJson<T>(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
    label: `sharepoint ${init?.method ?? "GET"} ${path}`,
  });
}

type SiteLite = { id: string; displayName: string; webUrl: string };

export const listSharePointSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.userId);
    try {
      const root = await spJson<SiteLite>("/sites/root?$select=id,displayName,webUrl");
      let extra: SiteLite[] = [];
      try {
        const r = await spJson<{ value?: SiteLite[] }>(
          "/sites?search=*&$select=id,displayName,webUrl&$top=20",
        );
        extra = r.value ?? [];
      } catch { /* ignore */ }
      const all = [root, ...extra.filter((s) => s.id !== root.id)];
      return { sites: all, unavailable: false as const, reason: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isMsa = /MSA account|not supported for MSA/i.test(message);
      return {
        sites: [] as SiteLite[],
        unavailable: true as const,
        reason: isMsa
          ? "The linked Microsoft account is a personal (MSA) account. SharePoint requires a work/school (Entra ID) account."
          : "SharePoint is temporarily unavailable.",
      };
    }
  });


export const uploadReportToSharePoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    input(
      z.object({
        siteId: z.string().min(1),
        filename: z
          .string()
          .min(1)
          .max(200)
          .regex(/^[\w\-. ()\u0600-\u06FF]+\.(pdf|html|csv|xlsx|json)$/i, "Invalid filename"),
        contentType: z.string().min(1).max(120),
        base64: z.string().min(1).max(12_000_000),
        createShareLink: z.boolean().optional(),
      }),
    ),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.userId);
    const bin = Buffer.from(data.base64, "base64");
    const safeName = data.filename.replace(/[/\\]/g, "_");
    const uploadPath = `/sites/${encodeURIComponent(data.siteId)}/drive/root:/NEXIOS%20Reports/${encodeURIComponent(safeName)}:/content`;

    const up = await httpFetch(`${GATEWAY_URL}${uploadPath}`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": data.contentType },
      body: bin,
      label: "sharepoint upload",
    });
    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw apiError("upstream_failed", `SharePoint upload ${up.status}`, {
        status: up.status,
        requestId: up.headers.get("request-id") ?? undefined,
        details: { body: txt.slice(0, 300) },
      });
    }
    const item = (await up.json()) as { id: string; name: string; webUrl: string; size: number };

    let shareUrl: string | null = null;
    if (data.createShareLink !== false) {
      try {
        const link = await spJson<{ link?: { webUrl?: string } }>(
          `/sites/${encodeURIComponent(data.siteId)}/drive/items/${item.id}/createLink`,
          { method: "POST", body: JSON.stringify({ type: "view", scope: "organization" }) },
        );
        shareUrl = link.link?.webUrl ?? null;
      } catch { /* keep null */ }
    }

    return {
      ok: true,
      itemId: item.id,
      name: item.name,
      webUrl: item.webUrl,
      shareUrl,
      size: item.size,
      uploadedAt: new Date().toISOString(),
    };
  });
