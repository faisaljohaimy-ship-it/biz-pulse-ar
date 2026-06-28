// Server-side rate limit helper for /api/public/* hooks.
// Backed by the SQL fn public.check_rate_limit (sliding 60s window).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function enforceRateLimit(
  bucketKey: string,
  maxRequests = 30,
  windowSeconds = 60,
): Promise<{ allowed: boolean }> {
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    _bucket_key: bucketKey,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });
  if (error) {
    // Fail-open on infra error; log but don't block legitimate traffic.
    console.error("[rate-limit] check failed", error);
    return { allowed: true };
  }
  return { allowed: Boolean(data) };
}

export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after_seconds: 60 }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    },
  );
}

export function clientBucketKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}
