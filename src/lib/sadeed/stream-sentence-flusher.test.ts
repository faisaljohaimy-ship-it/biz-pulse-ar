import { afterEach, describe, expect, it, vi } from "vitest";
import { createSentenceFlusher } from "./stream-sentence-flusher";

afterEach(() => vi.restoreAllMocks());

describe("SADEED streaming voice first-sentence latency", () => {
  it("measures and reports a slow final fragment with no punctuation", () => {
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });

    flusher.pushToken("مرحبا");
    clock = 450;
    flusher.finish();

    expect(onSentence).toHaveBeenCalledExactlyOnceWith("مرحبا", 0);
    expect(onLatencyBreach).toHaveBeenCalledExactlyOnceWith("first_sentence_slow", 350);
    expect(flusher.stats().latencyToFirstSentence).toBe(350);
    flusher.finish();
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
  });

  it("tracks the first token when the monotonic clock starts at zero", () => {
    let clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });

    flusher.pushToken("First");
    clock = 400;
    flusher.pushToken(". Next");

    expect(onSentence).toHaveBeenCalledExactlyOnceWith("First.", 0);
    expect(onLatencyBreach).toHaveBeenCalledExactlyOnceWith("first_sentence_slow", 400);
    expect(flusher.stats().latencyToFirstSentence).toBe(400);
    flusher.finish();
    expect(onSentence).toHaveBeenLastCalledWith("Next", 1);
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
  });

  it("does not falsely report a timely unpunctuated reply", () => {
    let clock = 10;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });

    flusher.pushToken("Ready");
    clock = 90;
    flusher.finish();

    expect(onSentence).toHaveBeenCalledExactlyOnceWith("Ready", 0);
    expect(onLatencyBreach).not.toHaveBeenCalled();
  });
});
