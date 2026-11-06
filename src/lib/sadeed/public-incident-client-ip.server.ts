/**
 * Select the platform-owned source-IP header for the public incident quota.
 * Vercel overwrites X-Forwarded-For and supplies X-Vercel-Forwarded-For.
 * A client-supplied CF-Connecting-IP must not override those Vercel values.
 * Cloudflare Workers retain the existing CF-Connecting-IP precedence.
 */
function firstIp(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function clientBucketKey(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  const headers = request.headers;
  const ip =
    env.VERCEL === "1"
      ? firstIp(headers.get("x-vercel-forwarded-for")) ??
        firstIp(headers.get("x-forwarded-for")) ??
        firstIp(headers.get("x-real-ip"))
      : firstIp(headers.get("cf-connecting-ip")) ??
        firstIp(headers.get("x-forwarded-for")) ??
        firstIp(headers.get("x-real-ip"));
  return `aria-incident:${ip ?? "unknown"}`;
}
