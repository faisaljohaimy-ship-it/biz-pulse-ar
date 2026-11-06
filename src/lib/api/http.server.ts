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
        // Do not park an SSR worker for hours on an upstream-controlled header.
        // A longer Retry-After cannot fit this call's configured request budget:
        // return the original response so the caller handles the 429/5xx.
        if (retryAfter !== null && retryAfter > timeoutMs) return res;
        // A retried response is discarded. Cancel its body so streaming 5xx/429
        // responses cannot retain upstream connections across attempts.
        void res.body?.cancel().catch(() => {});
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

/**
 * A fetch can resolve its headers while the upstream holds the body open forever.
 * Bound JSON/error body consumption as well as the initial request; cancel the
 * response reader on timeout or caller abandonment to stop stalled streams.
 */
async function readResponseTextWithin(
  response: Response,
  timeoutMs: number,
  signal?: AbortSignal | null,
): Promise<string> {
  if (signal?.aborted) {
    throw apiError("upstream_timeout", "Caller aborted while reading upstream response body");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    const stop = (message: string) => {
      reject(apiError("upstream_timeout", message));
      // Reject promptly; cancellation also unblocks an outstanding reader.read().
      void reader.cancel().catch(() => {});
    };
    onAbort = () => stop("Caller aborted while reading upstream response body");
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => stop("Timed out reading upstream response body"), timeoutMs);
  });

  const consume = (async () => {
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      text += decoder.decode(value, { stream: true });
    }
  })();

  try {
    return await Promise.race([consume, interrupted]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

/** Convenience: fetch + JSON parse with structured upstream errors. */
export async function httpJson<T = unknown>(
  input: string | URL,
  init: HttpOptions & { acceptStatuses?: number[] } = {},
): Promise<T> {
  const { acceptStatuses, ...rest } = init;
  // A status explicitly accepted by the caller must not be retried as a transient
  // failure (notably 429/503), even when retryOn is custom. Keep retries for
  // unaccepted statuses unchanged.
  const res = await httpFetch(input, {
    ...rest,
    retryOn: (status) =>
      !(acceptStatuses?.includes(status) ?? false) &&
      (rest.retryOn?.(status) ?? defaultRetryOn(status)),
  });
  // Extra accepted statuses must not reject ordinary successful 2xx responses.
  const ok = res.ok || (acceptStatuses?.includes(res.status) ?? false);
  const body = await readResponseTextWithin(res, rest.timeoutMs ?? DEFAULT_TIMEOUT_MS, rest.signal);
  if (!ok) {
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
  try {
    return JSON.parse(body) as T;
  } catch {
    // A malformed 2xx body is an upstream protocol failure, not a server
    // programming error. Never surface the untrusted upstream body in errors.
    throw apiError("upstream_failed", "Invalid JSON from upstream response", {
      requestId: res.headers.get("request-id") ?? res.headers.get("x-request-id") ?? undefined,
      details: { upstreamStatus: res.status },
    });
  }
}
