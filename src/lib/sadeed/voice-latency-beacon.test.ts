import { afterEach, describe, expect, it, vi } from "vitest";
import { reportVoiceLatencyRegression } from "./stream-sentence-flusher";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SADEED voice latency incident delivery", () => {
  it("queues one beacon without sending a duplicate fetch when accepted", () => {
    const sendBeacon = vi.fn((_url: string, _payload: string) => true);
    const fetchMock = vi.fn();
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    reportVoiceLatencyRegression(301, "voice-stream");

    expect(sendBeacon).toHaveBeenCalledOnce();
    const [url, payload] = sendBeacon.mock.calls[0];
    expect(url).toBe("/api/public/hooks/sadeed-incident");
    expect(JSON.parse(payload)).toMatchObject({
      kind: "aria_voice_latency_regression",
      detail: "first_sentence_ms=301 voice-stream",
      device_class: "desktop",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["not-queued", "throws"] as const)(
    "falls back to bounded JSON POST when sendBeacon %s",
    (failure) => {
      const sendBeacon = vi.fn((_url: string, _payload: string) => {
        if (failure === "throws") throw new Error("browser blocked beacon");
        return false;
      });
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
      vi.stubGlobal("window", undefined);
      vi.stubGlobal("navigator", { sendBeacon });
      vi.stubGlobal("fetch", fetchMock);

      expect(() => reportVoiceLatencyRegression(400)).not.toThrow();
      expect(sendBeacon).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/public/hooks/sadeed-incident",
        expect.objectContaining({
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  );

  it("attaches a rejection handler to the fallback so offline errors cannot cascade", async () => {
    let rejectRequest: (reason?: unknown) => void = () => {};
    const pending = new Promise<Response>((_resolve, reject) => {
      rejectRequest = reject;
    });
    const catchSpy = vi.spyOn(pending, "catch");
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", { sendBeacon: () => false });
    vi.stubGlobal("fetch", fetchMock);

    reportVoiceLatencyRegression(501);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(catchSpy).toHaveBeenCalledOnce();
    rejectRequest(new Error("offline"));
    await Promise.resolve();
  });
});
