import { afterEach, describe, expect, it, vi } from "vitest";
import { createSentenceFlusher } from "./stream-sentence-flusher";

afterEach(() => vi.restoreAllMocks());

describe("first sentence latency snapshots", () => {
  it("keeps the first delivery latency stable across later stats calls and later tokens", () => {
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    expect(flusher.stats().latencyToFirstSentence).toBeNull();
    flusher.pushToken("First");
    expect(flusher.stats().latencyToFirstSentence).toBeNull();

    clock = 240;
    flusher.pushToken(". Next ");
    expect(onSentence).toHaveBeenCalledWith("First.", 0);
    expect(flusher.stats().latencyToFirstSentence).toBe(140);

    clock = 2_000;
    expect(flusher.stats().latencyToFirstSentence).toBe(140);
    flusher.pushToken("sentence");
    flusher.finish();
    expect(flusher.stats().sentences).toBe(2);
    expect(flusher.stats().latencyToFirstSentence).toBe(140);
  });

  it("snapshots the latency of a final unpunctuated fragment and does not inflate it", () => {
    let clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({
      onSentence: vi.fn(),
      onLatencyBreach,
    });

    flusher.pushToken("مرحبا");
    clock = 350;
    flusher.finish();
    expect(flusher.stats().latencyToFirstSentence).toBe(350);
    expect(onLatencyBreach).toHaveBeenCalledWith("first_sentence_slow", 350);

    clock = 8_000;
    flusher.pushToken("متأخر");
    flusher.finish();
    expect(flusher.stats().latencyToFirstSentence).toBe(350);
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
  });
});
