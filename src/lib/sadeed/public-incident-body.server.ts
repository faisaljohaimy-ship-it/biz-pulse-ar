/** Bounded parsing for the anonymous incident sink; never trust Content-Length alone. */
export const PUBLIC_INCIDENT_MAX_BYTES = 4096;
/** Hard deadline for the complete anonymous request body, including slow/trickled streams. */
export const PUBLIC_INCIDENT_READ_TIMEOUT_MS = 8_000;

type IncidentBodyResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 408 | 413; message: string };

const READ_DEADLINE = Symbol("public-incident-read-deadline");

export async function readPublicIncidentBody(request: Request): Promise<IncidentBodyResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > PUBLIC_INCIDENT_MAX_BYTES) {
    return { ok: false, status: 413, message: "payload too large" };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    reader = request.body?.getReader();
    if (!reader) return { ok: false, status: 400, message: "bad json" };
    // Use ONE absolute deadline. Resetting it for every chunk would let a
    // slow sender hold the serverless request open indefinitely below 4 KiB.
    const deadline = new Promise<typeof READ_DEADLINE>((resolve) => {
      timeout = setTimeout(() => resolve(READ_DEADLINE), PUBLIC_INCIDENT_READ_TIMEOUT_MS);
    });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next === READ_DEADLINE) {
        // Never await an untrusted stream's cancellation callback.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 408, message: "request timeout" };
      }
      const { done, value } = next;
      if (done) break;
      bytes += value.byteLength;
      if (bytes > PUBLIC_INCIDENT_MAX_BYTES) {
        // Do not wait for a peer's cancellation hook before responding.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413, message: "payload too large" };
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, status: 400, message: "bad json" };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    // Invalid UTF-8/JSON, interrupted streams and already-consumed bodies are client errors.
    return { ok: false, status: 400, message: "bad json" };
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
    reader?.releaseLock();
  }
}
