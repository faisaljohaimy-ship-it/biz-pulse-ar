import { withFinnDeadline } from "./native-google";

export type FinnGoogleCapability = "enabled" | "disabled" | "unknown";

type ProbeOptions = {
  publicUrl?: string;
  publicKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Check the SAME public Auth project used by the browser, not a possibly stale server env.
 * Public keys stay in the apikey header; no tokens, owner identities or provider secrets are read.
 * A failed/malformed probe is unknown, never evidence that Google is disabled.
 */
export async function probeFinnGoogleProvider(
  fetchFn: FetchLike,
  { publicUrl, publicKey, signal, timeoutMs = 6_000 }: ProbeOptions = {},
): Promise<FinnGoogleCapability> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) return "unknown";
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const direct = Boolean(publicUrl && publicKey);
    let endpoint = "/api/fnn/auth-health";
    if (direct) {
      const base = new URL(publicUrl!);
      const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
      if (
        base.username ||
        base.password ||
        (base.protocol !== "https:" && !(local && base.protocol === "http:"))
      )
        return "unknown";
      endpoint = new URL("/auth/v1/settings", base.origin).href;
    }
    const run = async (): Promise<FinnGoogleCapability> => {
      const response = await fetchFn(endpoint, {
        method: "GET",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        ...(direct ? { headers: { apikey: publicKey! } } : {}),
      });
      if (!response.ok || controller.signal.aborted) return "unknown";
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || controller.signal.aborted) return "unknown";
      const value = body as { external?: unknown; checked?: unknown; googleEnabled?: unknown };
      if (direct) {
        if (!value.external || typeof value.external !== "object") return "unknown";
        const enabled = (value.external as { google?: unknown }).google;
        return enabled === true ? "enabled" : enabled === false ? "disabled" : "unknown";
      }
      if (value.checked !== true) return "unknown";
      return value.googleEnabled === true
        ? "enabled"
        : value.googleEnabled === false
          ? "disabled"
          : "unknown";
    };
    return await withFinnDeadline(run(), timeoutMs);
  } catch {
    return "unknown";
  } finally {
    controller.abort();
    signal?.removeEventListener("abort", cancel);
  }
}
