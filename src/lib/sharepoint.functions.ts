import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_sharepoint";

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const spKey = process.env.MICROSOFT_SHAREPOINT_API_KEY;
  if (!lovableKey || !spKey) throw new Error("SharePoint connector not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": spKey,
  };
}

async function spJson(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SharePoint ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

type SiteLite = { id: string; displayName: string; webUrl: string };

export const listSharePointSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const root = (await spJson("/sites/root?$select=id,displayName,webUrl")) as SiteLite;
    let extra: SiteLite[] = [];
    try {
      const r = (await spJson("/sites?search=*&$select=id,displayName,webUrl&$top=20")) as { value?: SiteLite[] };
      extra = r.value ?? [];
    } catch { /* ignore */ }
    const all = [root, ...extra.filter((s) => s.id !== root.id)];
    return { sites: all };
  });

export const uploadReportToSharePoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { siteId: string; filename: string; contentType: string; base64: string; createShareLink?: boolean }) => {
    if (!d?.siteId) throw new Error("Missing siteId");
    if (!/^[\w\-. ()\u0600-\u06FF]+\.(pdf|html|csv|xlsx|json)$/i.test(d.filename)) throw new Error("Invalid filename");
    if (!d.contentType || d.contentType.length > 120) throw new Error("Invalid contentType");
    if (!d.base64 || d.base64.length > 12_000_000) throw new Error("File too large (max ~9MB)");
    return d;
  })
  .handler(async ({ data }) => {
    // decode base64 to bytes
    const bin = Buffer.from(data.base64, "base64");
    const safeName = data.filename.replace(/[/\\]/g, "_");
    const uploadPath = `/sites/${encodeURIComponent(data.siteId)}/drive/root:/NEXIOS%20Reports/${encodeURIComponent(safeName)}:/content`;

    const up = await fetch(`${GATEWAY_URL}${uploadPath}`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": data.contentType },
      body: bin,
    });
    if (!up.ok) {
      const txt = await up.text();
      throw new Error(`SharePoint upload ${up.status}: ${txt.slice(0, 300)}`);
    }
    const item = (await up.json()) as { id: string; name: string; webUrl: string; size: number };

    let shareUrl: string | null = null;
    if (data.createShareLink !== false) {
      try {
        const link = (await spJson(`/sites/${encodeURIComponent(data.siteId)}/drive/items/${item.id}/createLink`, {
          method: "POST",
          body: JSON.stringify({ type: "view", scope: "organization" }),
        })) as { link?: { webUrl?: string } };
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
