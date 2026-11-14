/**
 * Bound multipart transport bytes before formData() buffers a potentially
 * unbounded upload. The audio field's own limit is checked separately.
 */
export const MULTIPART_READ_TIMEOUT_MS = 30_000;
const MULTIPART_READ_TIMEOUT = Symbol("multipart-read-timeout");
const MULTIPART_READ_ABORT = Symbol("multipart-read-abort");

export type BoundedMultipartResult = {
  form: FormData | null;
  tooLarge: boolean;
  timedOut?: boolean;
  aborted?: boolean;
};

export async function parseBoundedMultipart(
  request: Request,
  maxBytes: number,
): Promise<BoundedMultipartResult> {
  // An already-disconnected client must not hold an upload worker until the deadline.
  if (request.signal.aborted) {
    void request.body?.cancel().catch(() => {});
    return { form: null, tooLarge: false, aborted: true };
  }
  const declared = request.headers.get("content-length");
  // Content-Length is only an early rejection signal: it can be absent or forged.
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(maxBytes)) {
    // A hostile stream can keep cancel() pending forever; never delay a 413.
    void request.body?.cancel().catch(() => {});
    return { form: null, tooLarge: true };
  }
  if (!request.body) return { form: null, tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  // An absolute deadline also bounds a peer that trickles small chunks forever.
  const deadline = new Promise<typeof MULTIPART_READ_TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(MULTIPART_READ_TIMEOUT), MULTIPART_READ_TIMEOUT_MS);
  });
  const aborted = new Promise<typeof MULTIPART_READ_ABORT>((resolve) => {
    if (request.signal.aborted) {
      resolve(MULTIPART_READ_ABORT);
      return;
    }
    onAbort = () => resolve(MULTIPART_READ_ABORT);
    request.signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    for (;;) {
      const next = await Promise.race([reader.read(), deadline, aborted]);
      if (next === MULTIPART_READ_ABORT) {
        // Never await untrusted cancellation hooks after a disconnected client.
        void reader.cancel().catch(() => {});
        return { form: null, tooLarge: false, aborted: true };
      }
      if (next === MULTIPART_READ_TIMEOUT) {
        // Cancellation may never settle on a hostile source. Do not block the 408.
        void reader.cancel().catch(() => {});
        return { form: null, tooLarge: false, timedOut: true };
      }
      const { done, value } = next;
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
        // Do not block the oversized response on an untrusted cancel hook.
        void reader.cancel().catch(() => {});
        return { form: null, tooLarge: true };
      }
      chunks.push(value);
    }

    const contentType = request.headers.get("content-type");
    if (!contentType) return { form: null, tooLarge: false };
    const bytes = new Uint8Array(byteCount);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    // Reuse the standards-based parser, but only after enforcing the wire cap.
    // Parsing does not send an HTTP request or forward authorization headers.
    const buffered = new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    const form = await buffered.formData().catch(() => null);
    return { form, tooLarge: false };
  } catch {
    return { form: null, tooLarge: false };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
