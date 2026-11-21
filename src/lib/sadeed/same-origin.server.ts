/**
 * Strict same-origin guard for public SADEED chat compatibility requests.
 * The Origin header is a serialized origin (scheme + host + port), not a host.
 * Comparing URL.host alone incorrectly accepts cross-scheme requests.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser / same-origin server calls may omit Origin
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    if (source.protocol !== "http:" && source.protocol !== "https:") return false;
    // Reject non-canonical Origin values (paths, credentials, query or fragments).
    if (source.origin !== origin) return false;
    return source.origin === target.origin;
  } catch {
    return false;
  }
}
