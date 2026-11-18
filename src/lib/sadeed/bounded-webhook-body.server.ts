/** Bound anonymous provider callbacks before decoding or authenticating their bodies. */
export const WEBHOOK_READ_TIMEOUT_MS = 8_000;
const READ_TIMEOUT = Symbol("webhook-read-timeout");
const READ_ABORT = Symbol("webhook-read-abort");

export type BoundedWebhookBodyResult =
  { ok: true; text: string }
  | { ok: false; status: 400 | 408 | 413 };

export async function readBoundedWebhookBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedWebhookBodyResult> {
  if (request.signal.aborted) {
    void request.body?.cancel().catch(() => {});
    return { ok: false, status: 408 };
  }

  // Content-Length is an early rejection only: peers may omit or forge it.
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(maxBytes)) {
    void request.body?.cancel().catch(() => {});
    return { ok: false, status: 413 };
  }
  if (!request.body || request.body.locked) return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const deadline = new Promise<typeof READ_TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(READ_TIMEOUT), WEBHOOK_READ_TIMEOUT_MS);
  });
  const aborted = new Promise<typeof READ_ABORT>((resolve) => {
    if (request.signal.aborted) {
      resolve(READ_ABORT);
    } else {
      onAbort = () => resolve(READ_ABORT);
      request.signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  try {
    while (true) {
      const next = await Promise.race([reader.read(), deadline, aborted]);
      if (next === READ_ABORT || next === READ_TIMEOUT) {
        // Hostile streams may never settle cancellation; never await it.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 408 };
      }
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(next.value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: request.signal.aborted ? 408 : 400 };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) request.signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
