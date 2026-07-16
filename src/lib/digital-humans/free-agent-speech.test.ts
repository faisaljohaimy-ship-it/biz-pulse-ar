import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { bus, state } = vi.hoisted(() => {
  const state = {
    owner: null as string | null,
    voices: [] as SpeechSynthesisVoice[],
    utterances: [] as SpeechSynthesisUtterance[],
  };
  const bus = {
    isUnlocked: vi.fn(() => true),
    currentSource: vi.fn(() => state.owner),
    systemVoices: vi.fn(() => state.voices),
    acquire: vi.fn(() => true),
    release: vi.fn(),
    notifyPlaying: vi.fn(),
    notifyStopped: vi.fn(),
    cancelAgentUtterance: vi.fn(),
    speakAgentUtterance: vi.fn((utterance: SpeechSynthesisUtterance) => {
      state.utterances.push(utterance);
      queueMicrotask(() => {
        utterance.onstart?.({} as SpeechSynthesisEvent);
        utterance.onend?.({} as SpeechSynthesisEvent);
      });
      return true;
    }),
  };
  return { bus, state };
});

vi.mock("@/lib/aria/audio-bus", () => ({ AriaAudioBus: bus }));

import { speakFreeAgent, splitSpeechText } from "./free-agent-speech";

class UtteranceStub {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;
  rate = 1;
  pitch = 1;
  onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
  onend: ((event: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const voice = (name: string, lang: string, localService = true): SpeechSynthesisVoice =>
  ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

describe("free specialist speech runtime", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      value: UtteranceStub,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: () => 1,
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      configurable: true,
      value: () => {},
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    state.owner = null;
    state.utterances = [];
    state.voices = [
      voice("Generic Arabic", "ar-SA"),
      voice("Microsoft Hamed Online (Natural)", "ar-SA", false),
      voice("Samantha", "en-US"),
    ];
    bus.isUnlocked.mockReturnValue(true);
    bus.currentSource.mockImplementation(() => state.owner);
    bus.systemVoices.mockImplementation(() => state.voices);
    bus.acquire.mockReturnValue(true);
    bus.speakAgentUtterance.mockImplementation((utterance) => {
      state.utterances.push(utterance);
      queueMicrotask(() => {
        utterance.onstart?.({} as SpeechSynthesisEvent);
        utterance.onend?.({} as SpeechSynthesisEvent);
      });
      return true;
    });
  });

  it("speaks with the selected free Arabic persona through the governed bus", async () => {
    await speakFreeAgent({
      text: "اكتملت المهمة بنجاح.",
      lang: "ar",
      voiceProfileId: "incident",
    }).promise;

    expect(bus.acquire).toHaveBeenCalledWith("agent-tts", expect.any(Function));
    expect(bus.speakAgentUtterance).toHaveBeenCalledTimes(1);
    expect(state.utterances[0]?.voice?.name).toContain("Hamed");
    expect(state.utterances[0]?.lang).toBe("ar-SA");
    expect(bus.release).toHaveBeenCalledWith("agent-tts");
  });

  it("does not start or consume a specialist voice while ARIA owns audio", async () => {
    state.owner = "chat-tts";
    await speakFreeAgent({ text: "لن أتداخل مع أريا", lang: "ar" }).promise;
    expect(bus.acquire).not.toHaveBeenCalled();
    expect(bus.speakAgentUtterance).not.toHaveBeenCalled();
  });

  it("splits long narration at natural boundaries", () => {
    const chunks = splitSpeechText(
      "اكتملت المرحلة الأولى بنجاح. بدأت المرحلة الثانية، وهي تحتوي على تفاصيل تشغيلية متعددة ينبغي عرضها بوضوح. انتهى التقرير.",
      55,
    );
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 55)).toBe(true);
    expect(chunks.join(" ")).toContain("انتهى التقرير");
  });
});
