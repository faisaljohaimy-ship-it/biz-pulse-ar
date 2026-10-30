import { supabase } from "@/integrations/supabase/client";

/** Bound session refresh/lock waits before starting an application request. */
export const AUTH_SESSION_DEADLINE_MS = 10_000;

function aborted() {
  return new DOMException("The request was aborted.", "AbortError");
}

async function readSession(signal?: AbortSignal | null) {
  if (signal?.aborted) throw aborted();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => reject(aborted());
    signal?.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(
      () => reject(new DOMException("Session lookup timed out.", "TimeoutError")),
      AUTH_SESSION_DEADLINE_MS,
    );
  });
  try {
    // getSession has no AbortSignal option. Stop waiting, but never send a late
    // application request if the SDK resolves after cancellation or timeout.
    return await Promise.race([
      Promise.resolve()
        .then(() => {
          if (signal?.aborted) throw aborted();
          return supabase.auth.getSession();
        })
        .catch(() => {
          if (signal?.aborted) throw aborted();
          throw new Error("Authentication session unavailable.");
        }),
      interrupted,
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener("abort", onAbort);
  }
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
  const signal = init.signal === undefined ? request?.signal : init.signal;
  const { data, error } = await readSession(signal);
  if (signal?.aborted) throw aborted();
  // A valid guest session is allowed; a failed session lookup is not a guest.
  // Never leak the SDK's raw error or silently downgrade a private request.
  if (error) throw new Error("Authentication session unavailable.");
  const token = data.session?.access_token;
  const headers = new Headers(init.headers ?? request?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, signal });
}
