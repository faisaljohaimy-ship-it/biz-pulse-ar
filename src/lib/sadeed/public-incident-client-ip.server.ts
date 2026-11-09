/**
 * Select the platform-owned source-IP header for the public incident quota.
 * Vercel overwrites X-Forwarded-For and supplies X-Vercel-Forwarded-For.
 * X-Real-IP is not a verified platform identity fallback on Vercel: when both
 * trusted headers are missing, all requests share the bounded unknown bucket.
 * A client-supplied CF-Connecting-IP must not override those Vercel values.
 * Cloudflare Workers retain the existing CF-Connecting-IP precedence.
 */
function firstIp(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

/** Shared, platform-owned client IP. Ignore spoofable CF headers on Vercel. */
export function trustedClientIp(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  const headers = request.headers;
  const ip =
    env.VERCEL === "1"
      ? (firstIp(headers.get("x-vercel-forwarded-for")) ??
        firstIp(headers.get("x-forwarded-for")))
      : (firstIp(headers.get("cf-connecting-ip")) ??
        firstIp(headers.get("x-forwarded-for")) ??
        firstIp(headers.get("x-real-ip")));
  return ip ?? "unknown";
}

export function clientBucketKey(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  return `aria-incident:${trustedClientIp(request, env)}`;
}
