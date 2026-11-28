/**
 * Select the platform-owned source-IP header for the public incident quota.
 * Vercel overwrites X-Forwarded-For and supplies X-Vercel-Forwarded-For.
 * X-Real-IP is not a verified platform identity fallback on Vercel: when both
 * trusted headers are missing, all requests share the bounded unknown bucket.
 * A client-supplied CF-Connecting-IP must not override those Vercel values.
 * Cloudflare Workers retain the existing CF-Connecting-IP precedence.
 */
function firstIp(value: string | null): string | null {
  // A missing or malformed platform header must not create an attacker-sized
  // or arbitrary-string quota key. Prefer the next trusted proxy header.
  const ip = value?.split(",", 1)[0]?.trim();
  if (!ip || ip.length > 45) return null;

  if (ip.includes(":")) {
    // The URL parser validates IPv6 literals (including IPv4-mapped IPv6).
    // Canonicalizing also prevents equivalent IPv6 strings from rotating keys.
    if (!/^[0-9a-fA-F:.]+$/.test(ip)) return null;
    try {
      return new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    } catch {
      return null;
    }
  }

  const octets = ip.split(".");
  if (
    octets.length !== 4 ||
    octets.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)
  ) {
    return null;
  }
  return ip;
}

/** Shared, platform-owned client IP. Ignore spoofable CF headers on Vercel. */
export function trustedClientIp(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): string {
  const headers = request.headers;
  const ip =
    env.VERCEL === "1" || env.VERCEL === "true"
      ? (firstIp(headers.get("x-vercel-forwarded-for")) ?? firstIp(headers.get("x-forwarded-for")))
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
