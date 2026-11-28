import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { readBoundedWebhookBody, WEBHOOK_READ_TIMEOUT_MS } from "./bounded-webhook-body.server";

const endpoint = "https://sadeed.invalid/api/webhooks/resend";
function request(body: BodyInit, headers?: HeadersInit): Request {
  return new Request(endpoint, { method: "POST", body, headers });
}

describe("bounded webhook body transport", () => {
  it("preserves UTF-8 split across stream chunks", async () => {
    const bytes = new TextEncoder().encode('{"detail":"ع"}');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 12));
        controller.enqueue(bytes.slice(12));
        controller.close();
      },
    });
    const req = new Request(endpoint, {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readBoundedWebhookBody(req, 64)).toEqual({
      ok: true,
      text: '{"detail":"ع"}',
    });
  });

  it.each([undefined, "1", "not-a-number"])(
    "enforces actual bytes when Content-Length is %s",
    async (length) => {
      const headers = length === undefined ? undefined : { "content-length": length };
      expect(await readBoundedWebhookBody(request("x".repeat(65), headers), 64)).toEqual({
        ok: false,
        status: 413,
      });
    },
  );

  it("accepts exactly the configured byte limit", async () => {
    expect(await readBoundedWebhookBody(request("x".repeat(64)), 64)).toEqual({
      ok: true,
      text: "x".repeat(64),
    });
  });

  it("rejects a huge declared length without reading the body", async () => {
    const req = request("x", { "content-length": "9999999999999999999999999" });
    expect(await readBoundedWebhookBody(req, 64)).toEqual({ ok: false, status: 413 });
    expect(req.bodyUsed).toBe(false);
  });

  it("cancels a forged-short stream as soon as it exceeds the cap", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(32));
        controller.enqueue(new Uint8Array(33));
      },
      cancel() {
        cancelled = true;
        return new Promise<void>(() => {});
      },
    });
    const req = new Request(endpoint, {
      method: "POST",
      headers: { "content-length": "1" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readBoundedWebhookBody(req, 64)).toEqual({ ok: false, status: 413 });
    expect(cancelled).toBe(true);
  });

  it("rejects malformed UTF-8 and an already consumed body", async () => {
    expect(await readBoundedWebhookBody(request(new Uint8Array([0xff])), 64)).toEqual({
      ok: false,
      status: 400,
    });
    const consumed = request("{}");
    await consumed.text();
    expect(await readBoundedWebhookBody(consumed, 64)).toEqual({ ok: false, status: 400 });
  });

  it("stops a stalled stream after the absolute deadline", async () => {
    vi.useFakeTimers();
    try {
      let cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([123]));
        },
        cancel() {
          cancelled = true;
          return new Promise<void>(() => {});
        },
      });
      const req = new Request(endpoint, {
        method: "POST",
        body: stream,
        duplex: "half",
      } as RequestInit);
      const pending = readBoundedWebhookBody(req, 64);
      await vi.advanceTimersByTimeAsync(WEBHOOK_READ_TIMEOUT_MS);
      expect(await pending).toEqual({ ok: false, status: 408 });
      expect(cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts promptly even when stream cancellation never settles", async () => {
    const controller = new AbortController();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start() {},
      cancel() {
        cancelled = true;
        return new Promise<void>(() => {});
      },
    });
    const req = new Request(endpoint, {
      method: "POST",
      body: stream,
      signal: controller.signal,
      duplex: "half",
    } as RequestInit);
    const pending = readBoundedWebhookBody(req, 64);
    controller.abort();
    expect(await pending).toEqual({ ok: false, status: 408 });
    expect(cancelled).toBe(true);
  });

  it("routes must both apply the streaming guard before signature verification", () => {
    for (const name of ["resend", "twilio"]) {
      const route = readFileSync("src/routes/api/webhooks/" + name + ".ts", "utf8");
      expect(route).toContain("readBoundedWebhookBody(request, MAX_BODY_BYTES)");
      expect(route).not.toContain("await request.text()");
    }
  });
});
