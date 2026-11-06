import { describe, expect, it, vi } from "vitest";
import {
  PUBLIC_INCIDENT_MAX_BYTES,
  PUBLIC_INCIDENT_READ_TIMEOUT_MS,
  readPublicIncidentBody,
} from "./public-incident-body.server";

const url = "http://localhost/api/public/hooks/sadeed-incident";
const request = (body: string, headers?: HeadersInit) =>
  new Request(url, { method: "POST", body, headers });

describe("public incident bounded JSON parsing", () => {
  it("accepts a valid incident without changing its fields", async () => {
    const body = { kind: "offline", detail: "انقطع الاتصال", ts: 123 };
    expect(await readPublicIncidentBody(request(JSON.stringify(body)))).toEqual({
      ok: true,
      value: body,
    });
  });

  it.each(["null", "[]", '"offline"', "true", "42", "", "{"])(
    "rejects non-object or malformed input %s without throwing",
    async (body) => {
      expect(await readPublicIncidentBody(request(body))).toEqual({
        ok: false,
        status: 400,
        message: "bad json",
      });
    },
  );

  it.each([undefined, "1", "not-a-number"])(
    "limits actual bytes when the declared length is %s",
    async (length) => {
      const headers = length === undefined ? undefined : { "content-length": length };
      const body = JSON.stringify({ detail: "x".repeat(PUBLIC_INCIDENT_MAX_BYTES) });
      expect(await readPublicIncidentBody(request(body, headers))).toEqual({
        ok: false,
        status: 413,
        message: "payload too large",
      });
    },
  );

  it("keeps the existing declared-size rejection", async () => {
    expect(await readPublicIncidentBody(request("{}", { "content-length": "4097" }))).toMatchObject(
      { ok: false, status: 413 },
    );
  });

  it("accepts exactly 4096 bytes", async () => {
    const body = `{"detail":"${"x".repeat(PUBLIC_INCIDENT_MAX_BYTES - 13)}"}`;
    expect(new TextEncoder().encode(body).byteLength).toBe(PUBLIC_INCIDENT_MAX_BYTES);
    expect(await readPublicIncidentBody(request(body))).toMatchObject({ ok: true });
  });

  it("counts UTF-8 bytes rather than JavaScript characters", async () => {
    const body = JSON.stringify({ detail: "ع".repeat(2100) });
    expect(body.length).toBeLessThan(PUBLIC_INCIDENT_MAX_BYTES);
    expect(await readPublicIncidentBody(request(body))).toMatchObject({ ok: false, status: 413 });
  });

  it("cancels an oversized chunked stream before reading its tail", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(2048).fill(32));
        controller.enqueue(new Uint8Array(2049).fill(32));
      },
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request(url, {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
    expect(await readPublicIncidentBody(req)).toMatchObject({ ok: false, status: 413 });
    expect(cancelled).toBe(true);
  });

  it("accepts UTF-8 split between chunks", async () => {
    const encoded = new TextEncoder().encode('{"detail":"ع"}');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded.slice(0, 12));
        controller.enqueue(encoded.slice(12));
        controller.close();
      },
    });
    const req = new Request(url, { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await readPublicIncidentBody(req)).toEqual({ ok: true, value: { detail: "ع" } });
  });

  it("turns an interrupted stream into a 400, not an unhandled rejection", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("disconnected"));
      },
    });
    const req = new Request(url, { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await readPublicIncidentBody(req)).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects an absent or already consumed body", async () => {
    expect(await readPublicIncidentBody(new Request(url, { method: "POST" }))).toMatchObject({
      ok: false,
      status: 400,
    });
    const req = request("{}");
    await req.text();
    expect(await readPublicIncidentBody(req)).toMatchObject({ ok: false, status: 400 });
  });

  it("terminates a stalled anonymous stream and cancels it within the absolute deadline", async () => {
    vi.useFakeTimers();
    try {
      let cancelled = false;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"kind":'));
          // No close: a slow client stalls after a partial payload.
        },
        cancel() {
          cancelled = true;
        },
      });
      const req = new Request(url, {
        method: "POST",
        body,
        duplex: "half",
      } as RequestInit);
      const pending = readPublicIncidentBody(req);
      await vi.advanceTimersByTimeAsync(PUBLIC_INCIDENT_READ_TIMEOUT_MS);
      expect(await pending).toEqual({ ok: false, status: 408, message: "request timeout" });
      expect(cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not renew the overall deadline when a client trickles more bytes", async () => {
    vi.useFakeTimers();
    try {
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          c.enqueue(new TextEncoder().encode('{"kind":'));
        },
      });
      const req = new Request(url, {
        method: "POST",
        body,
        duplex: "half",
      } as RequestInit);
      const pending = readPublicIncidentBody(req);
      await vi.advanceTimersByTimeAsync(PUBLIC_INCIDENT_READ_TIMEOUT_MS - 1_000);
      controller.enqueue(new TextEncoder().encode('"offline"'));
      await vi.advanceTimersByTimeAsync(1_000);
      expect(await pending).toMatchObject({ ok: false, status: 408 });
    } finally {
      vi.useRealTimers();
    }
  });
});
