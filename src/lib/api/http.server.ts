/**
 * Centralised outbound `fetch` wrapper for server-only code.
 *
 * Goals:
 *  - Hard timeout on every external call (default 15s) — no hung upstream
 *    can stall a server function indefinitely.
 *  - Exponential-backoff retries with jitter for transient failures
 *    (network errors, 502/503/504, 429 with Retry-After).
 *  - Uniform error envelope via `ApiError` (`upstream_timeout` /
 *    `upstream_failed`) so callers can branch on `code`.
 *
 * Do NOT import this from client components — it is server-only.
 */

import { ApiError, apiError, type ApiErrorCode } from "./errors";

export interface HttpOptions extends Omit<RequestInit, "signal"> {
  /**
   * إشارة إلغاء من المستدعي (مثل موعد ذراع الاسترجاع): تُدمج مع مؤقّت كل
   * محاولة، وإطلاقها يوقف المحاولة الجارية **ويمنع أي محاولة تالية** — كان
   * النداء المهجور يكمل محاولاته الثلاث (≈45 ث) بعد أن مضى الردّ.
   */
  signal?: AbortSignal | null;
  /** Per-request timeout in milliseconds. Default 15000. */
  timeoutMs?: number;
  /** Retry attempts on transient failure. Default 2 (so 3 total tries). */
  retries?: number;
  /** Base backoff delay in ms; doubles per attempt. Default 300. */
  retryBaseMs?: number;
  /** Label used in error messages and logs. */
  label?: string;
  /** Override which response statuses are retried. Default 408/429/5xx. */
  retryOn?: (status: number) => boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BASE_MS = 300;

function defaultRetryOn(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  if (Number.isFinite(at)) return Math.max(0, at - Date.now());
  return null;
}

/**
 * Server-side `fetch` with timeout + retry + structured errors.
 * Returns the `Response` for the caller to consume (json/text/etc).
 * Throws `ApiError` for timeouts and exhausted retries.
 */
export async function httpFetch(input: string | URL, init: HttpOptions = {}): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryBaseMs = DEFAULT_BASE_MS,
    label,
    retryOn = defaultRetryOn,
    signal: outerOrNull,
    ...rest
  } = init;
  const outer = outerOrNull ?? undefined;

  const url = typeof input === "string" ? input : input.toString();
  const target = label ?? url;
  const abandoned = () =>
    apiError("upstream_timeout", `Aborted by caller while calling ${target}`, {
      details: { url, aborted: true },
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (outer?.aborted) throw abandoned();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // إشارة المستدعي تُطلق مؤقّت المحاولة نفسه — دمجٌ يدوي لا يعتمد على `AbortSignal.any`.
    const onOuterAbort = () => controller.abort();
    outer?.addEventListener("abort", onOuterAbort, { once: true });
    try {
      const res = await fetch(input, { ...rest, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok && retryOn(res.status) && attempt < retries) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const backoff = retryAfter ?? retryBaseMs * Math.pow(2, attempt) + Math.random() * 100;
        await delay(backoff, outer).catch(() => {
          throw abandoned();
        });
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (outer?.aborted) throw abandoned();
      const aborted = (err as { name?: string })?.name === "AbortError";
      if (aborted && attempt === retries) {
        throw apiError("upstream_timeout", `Timeout after ${timeoutMs}ms calling ${target}`, {
          details: { url, attempts: attempt + 1 },
        });
      }
      if (attempt < retries) {
        await delay(retryBaseMs * Math.pow(2, attempt) + Math.random() * 100, outer).catch(() => {
          throw abandoned();
        });
        continue;
      }
    } finally {
      outer?.removeEventListener("abort", onOuterAbort);
    }
  }

  throw apiError("upstream_failed", `Upstream call to ${target} failed`, {
    details: { url, error: String(lastErr ?? "unknown") },
  });
}

/** Convenience: fetch + JSON parse with structured upstream errors. */
export async function httpJson<T = unknown>(
  input: string | URL,
  init: HttpOptions & { acceptStatuses?: number[] } = {},
): Promise<T> {
  const { acceptStatuses, ...rest } = init;
  const res = await httpFetch(input, rest);
  const ok = acceptStatuses ? acceptStatuses.includes(res.status) : res.ok;
  if (!ok) {
    const body = await res.text().catch(() => "");
    let parsed: unknown;
    try {
      parsed = body ? JSON.parse(body) : undefined;
    } catch {
      parsed = body;
    }
    const code: ApiErrorCode =
      res.status === 401
        ? "unauthorized"
        : res.status === 403
          ? "forbidden"
          : res.status === 404
            ? "not_found"
            : res.status === 429
              ? "rate_limited"
              : "upstream_failed";
    throw new ApiError({
      code,
      message: `Upstream ${res.status} from ${rest.label ?? input}`,
      status: res.status,
      requestId: res.headers.get("request-id") ?? res.headers.get("x-request-id") ?? undefined,
      details: { body: parsed },
    });
  }
  return (await res.json()) as T;
}
