import { createFileRoute } from "@tanstack/react-router";
import { googleProviderEnabled } from "@/lib/finn-agent/native-google";

/** Public provider capability only. No credentials, identities, owner gate or paid model calls. */
export async function fnnAuthHealth(): Promise<Response> {
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  const reply = (checked: boolean, googleEnabled: boolean, status = 200) =>
    new Response(JSON.stringify({ checked, googleEnabled, returnPath: "/fnn" }), {
      status,
      headers,
    });
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return reply(true, false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const url = new URL("/auth/v1/settings", base);
    if (url.protocol !== "https:") return reply(true, false);
    const response = await fetch(url, {
      headers: { apikey: key },
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return reply(false, false, 503);
    const settings: unknown = await response.json();
    return reply(true, googleProviderEnabled(settings));
  } catch {
    return reply(false, false, 503);
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/fnn/auth-health")({
  server: { handlers: { GET: fnnAuthHealth } },
});
