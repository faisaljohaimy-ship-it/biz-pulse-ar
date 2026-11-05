/** Bounded parsing for the anonymous incident sink; never trust Content-Length alone. */
export const PUBLIC_INCIDENT_MAX_BYTES = 4096;

type IncidentBodyResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413; message: string };

export async function readPublicIncidentBody(request: Request): Promise<IncidentBodyResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > PUBLIC_INCIDENT_MAX_BYTES) {
    return { ok: false, status: 413, message: "payload too large" };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = request.body?.getReader();
    if (!reader) return { ok: false, status: 400, message: "bad json" };
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
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
    reader?.releaseLock();
  }
}
