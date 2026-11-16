import { afterEach, describe, expect, it, vi } from "vitest";
import { createSentenceFlusher } from "./stream-sentence-flusher";

afterEach(() => vi.restoreAllMocks());

describe("SADEED streaming voice telemetry isolation", () => {
  it.each(["punctuation", "soft-flush", "final-fragment"] as const)(
    "delivers the first sentence even when its latency alert throws (%s)",
    (path) => {
      let clock = 0;
      vi.spyOn(performance, "now").mockImplementation(() => clock);
      const onSentence = vi.fn();
      const onLatencyBreach = vi.fn(() => {
        throw new Error("monitoring callback unavailable");
      });
      const flusher = createSentenceFlusher({
        onSentence,
        onLatencyBreach,
        softFlushChars: 10,
      });
      flusher.pushToken("البلاغ");
      clock = 400;

      expect(() => {
        if (path === "punctuation") flusher.pushToken("؟");
        else if (path === "soft-flush") flusher.pushToken(" جاهز ");
        else flusher.finish();
      }).not.toThrow();

      expect(onSentence).toHaveBeenCalledTimes(1);
      expect(onSentence).toHaveBeenCalledWith(
        path === "punctuation" ? "البلاغ؟" : path === "soft-flush" ? "البلاغ جاهز" : "البلاغ",
        0,
      );
      expect(onLatencyBreach).toHaveBeenCalledTimes(1);
      expect(onLatencyBreach).toHaveBeenCalledWith("first_sentence_slow", 400);
      expect(flusher.stats().latencyToFirstSentence).toBe(400);

      flusher.finish();
      expect(onLatencyBreach).toHaveBeenCalledTimes(1);
      expect(onSentence).toHaveBeenCalledTimes(1);
    },
  );
});
