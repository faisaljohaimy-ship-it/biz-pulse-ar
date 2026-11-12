/**
 * Bound multipart transport bytes before formData() buffers a potentially
 * unbounded upload. The audio field's own limit is checked separately.
 */
export type BoundedMultipartResult = {
  form: FormData | null;
  tooLarge: boolean;
};

export async function parseBoundedMultipart(
  request: Request,
  maxBytes: number,
): Promise<BoundedMultipartResult> {
  const declared = request.headers.get("content-length");
  // Content-Length is only an early rejection signal: it can be absent or forged.
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(maxBytes)) {
    await request.body?.cancel().catch(() => {});
    return { form: null, tooLarge: true };
  }
  if (!request.body) return { form: null, tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
        await reader.cancel().catch(() => {});
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
    reader.releaseLock();
  }
}
