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

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith("مرحبا", 0);
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
    expect(onLatencyBreach).toHaveBeenCalledWith("first_sentence_slow", 350);
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

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith("First.", 0);
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
    expect(onLatencyBreach).toHaveBeenCalledWith("first_sentence_slow", 400);
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

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith("Ready", 0);
    expect(onLatencyBreach).not.toHaveBeenCalled();
  });

  it("flushes a newline-delimited Arabic sentence without requiring a space", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("السطر الأول\nالثاني");

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenNthCalledWith(1, "السطر الأول", 0);
    flusher.finish();
    expect(onSentence).toHaveBeenNthCalledWith(2, "الثاني", 1);
  });

  it("flushes a trailing newline before the stream closes", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("Ready\n");

    expect(onSentence).toHaveBeenCalledWith("Ready", 0);
    expect(flusher.stats().sentences).toBe(1);
    flusher.finish();
    expect(onSentence).toHaveBeenCalledTimes(1);
  });

  it("flushes CR-only Arabic line breaks before stream close", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("تم استلام البلاغ\rالتحقق جار");

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenNthCalledWith(1, "تم استلام البلاغ", 0);
    flusher.finish();
    expect(onSentence).toHaveBeenNthCalledWith(2, "التحقق جار", 1);
  });

  it("does not emit an empty sentence when CRLF arrives in separate tokens", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("تم\r");
    expect(onSentence).toHaveBeenCalledTimes(1);
    flusher.pushToken("\nالتحديث");
    expect(onSentence).toHaveBeenCalledTimes(1);
    flusher.finish();

    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenNthCalledWith(1, "تم", 0);
    expect(onSentence).toHaveBeenNthCalledWith(2, "التحديث", 1);
  });

  it("measures first-sentence latency when a CR-only boundary arrives", () => {
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });

    flusher.pushToken("الحالة");
    clock = 420;
    flusher.pushToken("\rمتابعة");

    expect(onSentence).toHaveBeenCalledWith("الحالة", 0);
    expect(onLatencyBreach).toHaveBeenCalledWith("first_sentence_slow", 320);
    expect(flusher.stats().latencyToFirstSentence).toBe(320);
    flusher.finish();
    expect(onLatencyBreach).toHaveBeenCalledTimes(1);
  });

  it("ignores late streamed tokens after the final flush", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("التقرير مكتمل");
    flusher.finish();
    flusher.pushToken("نص متأخر\\n");
    flusher.finish();

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith("التقرير مكتمل", 0);
    expect(flusher.stats().sentences).toBe(1);
  });

  it("marks the stream finished before the final-sentence callback runs", () => {
    const onSentence = vi.fn(() => {
      flusher.pushToken("Late text");
      flusher.finish();
    });
    const flusher = createSentenceFlusher({ onSentence });

    flusher.pushToken("Done");
    flusher.finish();

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith("Done", 0);
    expect(flusher.stats().sentences).toBe(1);
  });
  it("speaks a question as soon as its final punctuation token arrives", () => {
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const onSentence = vi.fn();
    const onLatencyBreach = vi.fn();
    const flusher = createSentenceFlusher({ onSentence, onLatencyBreach });

    flusher.pushToken("هل وصل البلاغ");
    clock = 180;
    flusher.pushToken("؟");
    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenNthCalledWith(1, "هل وصل البلاغ؟", 0);
    expect(flusher.stats().latencyToFirstSentence).toBe(80);
    expect(onLatencyBreach).not.toHaveBeenCalled();

    flusher.pushToken(" تم الإغلاق");
    flusher.finish();
    expect(onSentence).toHaveBeenNthCalledWith(2, "تم الإغلاق", 1);
  });

  it.each(["Ready!", "Are you there?", "مكتمل！"])(
    "flushes terminal unambiguous punctuation immediately: %s",
    (sentence) => {
      const onSentence = vi.fn();
      const flusher = createSentenceFlusher({ onSentence });
      flusher.pushToken(sentence);
      expect(onSentence).toHaveBeenCalledTimes(1);
      expect(onSentence).toHaveBeenNthCalledWith(1, sentence, 0);
      flusher.finish();
      expect(onSentence).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps a final period buffered until decimal continuation is known", () => {
    const onSentence = vi.fn();
    const flusher = createSentenceFlusher({ onSentence });
    flusher.pushToken("القياس 3.");
    expect(onSentence).not.toHaveBeenCalled();
    flusher.pushToken("14 متر");
    flusher.finish();
    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenNthCalledWith(1, "القياس 3.14 متر", 0);
  });
});
