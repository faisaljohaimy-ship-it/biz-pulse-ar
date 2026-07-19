/**
 * Specialist speech runtime contract — server Layan audio only.
 *
 * The runtime must: never call any browser TTS, never start before the bus
 * is gesture-unlocked, never play without owning the "agent-tts" channel,
 * fetch audio exclusively from /api/aria/tts, and release the channel when
 * playback ends or stop() is called.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { bus, fetchMock } = vi.hoisted(() => ({
  bus: {
    isUnlocked: vi.fn(() => true),
    acquire: vi.fn(() => true),
    release: vi.fn(),
    notifyPlaying: vi.fn(),
    notifyStopped: vi.fn(),
  },
  fetchMock: vi.fn(),
}));
vi.mock("@/lib/aria/audio-bus", () => ({ AriaAudioBus: bus }));
vi.mock("@/lib/auth-fetch", () => ({
  authenticatedFetch: (...args: unknown[]) => fetchMock(...args),
}));
vi.mock("@/lib/user-interaction", () => ({ getPrimedAudioContext: () => null }));

class FakeSourceNode {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  start = vi.fn(() => {
    queueMicrotask(() => this.onended?.());
  });
  stop = vi.fn(() => {
    this.onended?.();
  });
}

class FakeAudioContext {
  state = "running";
  destination = {};
  resume = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => ({ duration: 1 }));
  createBufferSource = vi.fn(() => new FakeSourceNode());
  createAnalyser = vi.fn(() => ({
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 16,
    connect: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  }));
}

import { speakFreeAgent, splitSpeechText } from "./free-agent-speech";

beforeEach(() => {
  vi.clearAllMocks();
  bus.isUnlocked.mockReturnValue(true);
  bus.acquire.mockReturnValue(true);
  fetchMock.mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  });
  (globalThis as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
  (window as unknown as { AudioContext?: unknown }).AudioContext = FakeAudioContext;
});

describe("specialist speech runtime (server Layan)", () => {
  it("splits long Arabic text into speakable segments", () => {
    const chunks = splitSpeechText("الجملة الأولى. الجملة الثانية؟ الجملة الثالثة!");
    expect(chunks).toHaveLength(3);
    expect(splitSpeechText("   ")).toHaveLength(0);
  });

  it("plays through the governed agent-tts channel via /api/aria/tts", async () => {
    const onStart = vi.fn();
    const handle = speakFreeAgent({ text: "تقرير الحالة الأمنية.", lang: "ar", onStart });
    await handle.promise;
    expect(bus.acquire).toHaveBeenCalledWith("agent-tts", expect.any(Function));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/aria/tts",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(bus.notifyPlaying).toHaveBeenCalledWith("agent-tts");
    expect(bus.release).toHaveBeenCalledWith("agent-tts");
  });

  it("never starts before the gesture unlock", async () => {
    bus.isUnlocked.mockReturnValue(false);
    const handle = speakFreeAgent({ text: "تجربة", lang: "ar" });
    await handle.promise;
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bus.acquire).not.toHaveBeenCalled();
  });

  it("does not start or consume a specialist voice while ARIA owns audio", async () => {
    // ARIA (chat-tts) owns the bus → acquire("agent-tts") is denied.
    bus.acquire.mockReturnValue(false);
    const handle = speakFreeAgent({ text: "تجربة أخرى", lang: "ar" });
    await handle.promise;
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bus.notifyPlaying).not.toHaveBeenCalled();
  });

  it("stop() releases the channel immediately", async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }), 20),
        ),
    );
    const handle = speakFreeAgent({ text: "نص طويل للإيقاف.", lang: "ar" });
    handle.stop();
    await handle.promise;
    expect(bus.release).toHaveBeenCalledWith("agent-tts");
    expect(bus.notifyPlaying).not.toHaveBeenCalled();
  });
});
