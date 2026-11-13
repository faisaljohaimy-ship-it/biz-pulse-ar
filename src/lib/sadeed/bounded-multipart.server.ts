/**
 * Bound multipart transport bytes before formData() buffers a potentially
 * unbounded upload. The audio field's own limit is checked separately.
 */
export type BoundedMultipartResult = {
  form: FormData | null;
  tooLarge: boolean;
  timedOut?: boolean;
};

export async function parseBoundedMultipart(
  request: Request,
  maxBytes: number,
  readTimeoutMs = 30_000,
): Promise<BoundedMultipartResult> {
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
  // An untrusted client can send one chunk and then never finish the upload.
  // One absolute deadline bounds the whole read, not each individual chunk.
  const deadlineMarker = Symbol("multipart-read-deadline");
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof deadlineMarker>((resolve) => {
    deadlineTimer = setTimeout(() => resolve(deadlineMarker), readTimeoutMs);
  });
  try {
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next === deadlineMarker) {
        // Cancellation itself may never settle; return the timeout immediately.
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
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    reader.releaseLock();
  }
}
