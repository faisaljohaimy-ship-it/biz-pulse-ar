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

/** Hard cap for buffered upstream JSON/error bodies (the streaming fetch API is unaffected). */
export const MAX_HTTP_JSON_BODY_BYTES = 8 * 1024 * 1024;

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
  const field = value?.trim();
  if (!field) return null;
  // Retry-After delta-seconds is decimal DIGITs, not Number() syntax such as
  // hex, exponent or signed numbers; the latter could suppress useful retries.
  if (/^\d+$/.test(field)) {
    const seconds = Number(field);
    return Number.isSafeInteger(seconds) ? seconds * 1000 : null;
  }
  // Date.parse accepts non-HTTP date strings (including ISO dates). Limit this
  // branch to IMF-fixdate and the two obsolete HTTP-date forms.
  const isImfFixdate = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(field);
  const isRfc850 = /^[A-Za-z]{6,9}, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT$/.test(field);
  const isAsctime = /^[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4}$/.test(field);
  if (!isImfFixdate && !isRfc850 && !isAsctime) return null;
  const at = Date.parse(field);
  if (!Number.isFinite(at)) return null;

  // Date.parse silently normalizes impossible days (Feb 30) and may ignore an
  // incorrect weekday. Round-trip each HTTP-date grammar before honoring a
  // server-controlled delay that could suppress an otherwise healthy retry.
  const date = new Date(at);
  const canonical = date.toUTCString();
  if (isImfFixdate && canonical !== field) return null;
  if (isRfc850) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const expected = `${weekdays[date.getUTCDay()]}, ${canonical.slice(5, 7)}-${canonical.slice(8, 11)}-${canonical.slice(14, 16)} ${canonical.slice(17, 25)} GMT`;
    if (expected !== field) return null;
  }
  if (isAsctime) {
    const expected = `${canonical.slice(0, 3)} ${canonical.slice(8, 11)} ${String(date.getUTCDate()).padStart(2, " ")} ${canonical.slice(17, 25)} ${canonical.slice(12, 16)}`;
    if (expected !== field) return null;
  }
  return Math.max(0, at - Date.now());
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
    // Some fetch implementations ignore AbortSignal (or resolve headers after
    // cancellation). Race the attempt against its abort to enforce a real
    // deadline, and dispose of any late response body.
    const abortError = () => Object.assign(new Error("aborted"), { name: "AbortError" });
    let onAttemptAbort: (() => void) | undefined;
    const attemptAborted = new Promise<never>((_, reject) => {
      onAttemptAbort = () => reject(abortError());
      controller.signal.addEventListener("abort", onAttemptAbort, { once: true });
    });
    try {
      const request = fetch(input, { ...rest, signal: controller.signal }).then((response) => {
        if (controller.signal.aborted) {
          void response.body?.cancel().catch(() => {});
          throw abortError();
        }
        return response;
      });
      const res = await Promise.race([request, attemptAborted]);
      clearTimeout(timer);
      // An upstream can resolve its headers just as the caller cancels.
      // Never return that orphaned response or retain its unread stream.
      if (outer?.aborted) {
        void res.body?.cancel().catch(() => {});
        throw abandoned();
      }
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
      if (onAttemptAbort) controller.signal.removeEventListener("abort", onAttemptAbort);
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
  // Content-Length is advisory: reject an obviously oversized body early, but
  // always enforce the cap on actual streamed bytes as well.
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTTP_JSON_BODY_BYTES) {
    void reader.cancel().catch(() => {});
    throw apiError("upstream_failed", "Upstream JSON response exceeds size limit");
  }
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
    // A lossy decoder silently changes invalid upstream JSON string values.
    // Reject malformed bytes rather than accepting corrupted incident/report data.
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const decode = (chunk?: Uint8Array, stream = false): string => {
      try {
        return decoder.decode(chunk, { stream });
      } catch {
        void reader.cancel().catch(() => {});
        throw apiError("upstream_failed", "Invalid UTF-8 from upstream response");
      }
    };
    let text = "";
    let receivedBytes = 0;
    for (;;) {
      // A broken upstream stream can reject reader.read() with arbitrary
      // network diagnostics. Do not surface them as an unhandled 500.
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await reader.read();
      } catch {
        void reader.cancel().catch(() => {});
        throw apiError("upstream_failed", "Failed reading upstream JSON response body");
      }
      const { done, value } = read;
      if (done) return text + decode();
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_HTTP_JSON_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw apiError("upstream_failed", "Upstream JSON response exceeds size limit");
      }
      text += decode(value, true);
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
