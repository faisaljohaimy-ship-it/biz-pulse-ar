import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARIA, DIGITAL_HUMANS, SPECIALISTS } from "./registry";
import { resolveVoice, selectSystemVoice } from "./voice-profiles";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("specialist voice release contract", () => {
  it("keeps one ARIA and ten voice-ready specialist identities", () => {
    expect(DIGITAL_HUMANS).toHaveLength(11);
    expect(ARIA.id).toBe("aria");
    expect(SPECIALISTS).toHaveLength(10);
    expect(new Set(DIGITAL_HUMANS.map((human) => human.id)).size).toBe(11);
    expect(SPECIALISTS.every((human) => human.voiceProfileId !== "aria")).toBe(true);
  });

  it("resolves a distinct free device-voice profile for every specialist", () => {
    const signatures = new Set<string>();
    for (const specialist of SPECIALISTS) {
      for (const lang of ["ar", "en"] as const) {
        const profile = resolveVoice(specialist.voiceProfileId, lang);
        expect(profile.languageTag).toMatch(lang === "ar" ? /^ar-/ : /^en-/);
        expect(profile.preferredNames.length).toBeGreaterThanOrEqual(4);
        expect(profile.rate).toBeGreaterThanOrEqual(0.8);
        expect(profile.rate).toBeLessThanOrEqual(1.2);
        expect(profile.pitch).toBeGreaterThanOrEqual(0.7);
        expect(profile.pitch).toBeLessThanOrEqual(1.3);
        signatures.add(
          `${specialist.voiceProfileId}:${lang}:${profile.rate}:${profile.pitch}:${profile.fallbackIndex}`,
        );
      }
    }
    expect(signatures.size).toBe(20);
  });

  it("removes the paid specialist endpoint and uses only the governed system engine", () => {
    const local = source("src/lib/digital-humans/free-agent-speech.ts");
    expect(existsSync(join(process.cwd(), "src/routes/api/agents/tts.ts"))).toBe(false);
    expect(local).toContain("SpeechSynthesisUtterance");
    expect(local).toContain("AriaAudioBus.systemVoices()");
    expect(local).toContain('AriaAudioBus.acquire("agent-tts"');
    expect(local).toContain("AriaAudioBus.speakAgentUtterance");
    expect(local).not.toMatch(/OPENAI_API_KEY|gpt-4o-mini-tts|authenticatedFetch/);
  });

  it("selects a preferred same-language voice and keeps a deterministic fallback", () => {
    const voice = (name: string, lang: string, localService: boolean): SpeechSynthesisVoice =>
      ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;
    const voices = [
      voice("Generic Arabic", "ar-SA", true),
      voice("Microsoft Hamed Online (Natural)", "ar-SA", false),
      voice("Samantha", "en-US", true),
    ];

    const selected = selectSystemVoice("incident", "ar", voices);
    expect(selected.voiceName).toContain("Hamed");
    expect(selected.languageTag).toBe("ar-SA");
    expect(selectSystemVoice("risk", "en", []).voice).toBeNull();
  });

  it("renders and routes all eleven speakers in presentation mode", () => {
    const presentation = source("src/components/digital-humans/PresentationMode.tsx");
    expect(presentation).toContain("DIGITAL_HUMANS");
    expect(presentation).toContain("visitor_intelligence: vi");
    expect(presentation).toContain("digital_twin: dt");
    expect(presentation).toContain("useState(true)");
  });

  it("uses one priority-controlled audio channel for specialist speech", () => {
    const bus = source("src/lib/aria/audio-bus.ts");
    const client = source("src/lib/digital-humans/aria-voice.ts");
    const local = source("src/lib/digital-humans/free-agent-speech.ts");
    expect(bus).toContain('"agent-tts": 2');
    expect(bus).toContain('"chat-tts": 3');
    expect(bus).toContain("speakAgentUtterance");
    expect(client).toContain('authenticatedFetch("/api/aria/tts"');
    expect(client).toContain("speakFreeAgent");
    expect(client).not.toContain("/api/agents/tts");
    expect(local).toContain('AriaAudioBus.currentSource() === "chat-tts"');
    expect(client).not.toContain("/api/public/aria-tts");
  });
});

describe("responsive command-home artwork", () => {
  it("ships purpose-built mobile, tablet, and desktop assets", () => {
    for (const file of [
      "src/assets/nexios-command-home-mobile.webp",
      "src/assets/nexios-command-home-tablet.webp",
      "src/assets/nexios-command-home-desktop.webp",
    ]) {
      const bytes = statSync(join(process.cwd(), file)).size;
      expect(bytes).toBeGreaterThan(10_000);
      expect(bytes).toBeLessThan(150_000);
    }

    const backdrop = source("src/components/home/HomeVideoBackdrop.tsx");
    expect(backdrop).toContain("nexios-command-home-mobile.webp");
    expect(backdrop).toContain("nexios-command-home-tablet.webp");
    expect(backdrop).toContain("nexios-command-home-desktop.webp");
    expect(backdrop).toContain('media="(max-width: 639px)"');
    expect(backdrop).toContain('media="(min-width: 1200px)"');
    expect(backdrop).toContain('fetchPriority="high"');
  });
});
