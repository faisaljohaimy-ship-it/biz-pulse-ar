// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const net = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/auth-fetch", () => ({ authenticatedFetch: net.fetch }));
import { streamFinnReply } from "./client";
import { encodeFinnEvent } from "./stream-protocol";
import { FINN_LIMITS } from "./limits";

beforeEach(() => {
  net.fetch.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});
const options = (signal: AbortSignal) => ({
  messages: [{ role: "user" as const, content: "اختبار" }],
  signal,
  onMeta: vi.fn(),
  onDelta: vi.fn(),
});

describe("FNN cancellation and session timeouts", () => {
  it("does not send a pre-cancelled conversation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(streamFinnReply(options(controller.signal))).resolves.toEqual({
      ok: false,
      aborted: true,
    });
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it("classifies session lookup timeout without exposing its text", async () => {
    net.fetch.mockRejectedValue(new DOMException("private-detail", "TimeoutError"));
    const result = await streamFinnReply(options(new AbortController().signal));
    expect(result).toMatchObject({ ok: false, kind: "timeout", aborted: false });
    expect(JSON.stringify(result)).not.toContain("private-detail");
  });

  it("cancels a stalled stream when the overall deadline expires", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    net.fetch.mockResolvedValue(new Response(new ReadableStream({ cancel })));
    const pending = streamFinnReply(options(new AbortController().signal));
    const checked = expect(pending).resolves.toMatchObject({ ok: false, kind: "timeout" });
    await vi.advanceTimersByTimeAsync(FINN_LIMITS.totalDeadlineMs + 15_000);
    await checked;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("suppresses later events after the owner stops within a chunk", async () => {
    const controller = new AbortController();
    const wire = [
      encodeFinnEvent({ type: "delta", text: "first" }),
      encodeFinnEvent({ type: "delta", text: "late" }),
      encodeFinnEvent({ type: "done", truncated: false }),
    ].join("");
    net.fetch.mockResolvedValue(new Response(wire));
    const input = options(controller.signal);
    input.onDelta.mockImplementation(() => controller.abort());
    await expect(streamFinnReply(input)).resolves.toEqual({ ok: false, aborted: true });
    expect(input.onDelta.mock.calls).toEqual([["first"]]);
  });
});
