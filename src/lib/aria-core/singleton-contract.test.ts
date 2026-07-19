import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("ARIA singleton release contract", () => {
  it("mounts one official ARIA UI at the application root", () => {
    const root = source("src/routes/__root.tsx");
    expect(root.match(/<AriaCopilot\b/g)).toHaveLength(1);
    expect(root).not.toContain("AriaDock");
  });

  it("keeps historical assistant routes on the singleton surface", () => {
    for (const route of [
      "src/routes/_authenticated/aria.tsx",
      "src/routes/_authenticated/assistant.index.tsx",
      "src/routes/_authenticated/assistant.$threadId.tsx",
      "src/routes/_authenticated/voice.tsx",
    ]) {
      const contents = source(route);
      expect(contents).toContain("CanonicalAriaRoute");
      expect(contents).not.toMatch(/useChat|useAriaVoice|DefaultChatTransport/);
    }
  });

  it("does not mount a second ARIA dock in Digital Twin", () => {
    const twin = source("src/routes/_authenticated/digital-twin.tsx");
    expect(twin).not.toMatch(/AriaDock|useAriaVoice|DefaultChatTransport/);
  });

  it("routes every authenticated voice caller to the canonical endpoint", () => {
    for (const caller of [
      "src/components/aria-core/AriaCopilot.tsx",
      "src/hooks/useAriaSpeech.ts",
      "src/routes/_authenticated/tts.tsx",
    ]) {
      const contents = source(caller);
      expect(contents).toContain("/api/aria/tts");
      expect(contents).not.toMatch(/["']\/api\/tts["']/);
    }
  });

  it("keeps the legacy TTS URL as a redirect, not a second provider", () => {
    const compatibilityRoute = source("src/routes/api/tts.ts");
    expect(compatibilityRoute).toContain("status: 308");
    expect(compatibilityRoute).toContain("/api/aria/tts");
    expect(compatibilityRoute).not.toMatch(/ELEVENLABS|xi-api-key/);
  });

  it("does not mint a second conversational voice token", () => {
    const compatibilityRoute = source("src/routes/api/voice-token.ts");
    expect(compatibilityRoute).toContain("status: 410");
    expect(compatibilityRoute).not.toMatch(/ELEVENLABS|single-use-token|conversation\/token/);
  });

  it("keeps voice setup read-only and free of parallel conversation providers", () => {
    const diagnostics = source("src/routes/api/voice-diagnostics.ts");
    expect(diagnostics).toContain("ARIA_ELEVENLABS_VOICE_ID");
    expect(diagnostics).not.toMatch(/ELEVENLABS_AGENT_ID|convai|realtime_scribe|single-use-token/);

    for (const route of [
      "src/routes/_authenticated/elevenlabs-status.tsx",
      "src/routes/_authenticated/voice-setup.tsx",
    ]) {
      const contents = source(route);
      expect(contents).toContain("CanonicalVoiceStatus");
      expect(contents).not.toMatch(/useChat|useAriaVoice|DefaultChatTransport/);
    }
  });

  it("routes learning conversations through the same ARIA brain", () => {
    for (const component of [
      "src/components/learn/LessonARIAChat.tsx",
      "src/components/learn/simulations/MeetAriaSimulation.tsx",
    ]) {
      const contents = source(component);
      expect(contents).toContain("useAria");
      expect(contents).not.toMatch(/useChat|DefaultChatTransport|\/api\/learn\/aria-teach/);
    }
  });

  it("derives command-center ARIA status from the singleton runtime", () => {
    const preview = source("src/components/executive/command/cc/AriaConsole.tsx");
    expect(preview).toContain("useAria");
    expect(preview).not.toMatch(/setInterval|useChat|useAriaVoice/);
  });

  it("keeps every audible voice on the server Layan route (no browser TTS)", () => {
    const client = source("src/lib/digital-humans/aria-voice.ts");
    const specialists = source("src/lib/digital-humans/free-agent-speech.ts");
    expect(client).toContain('authenticatedFetch("/api/aria/tts"');
    expect(client).toContain("speakFreeAgent");
    expect(client).not.toContain("/api/agents/tts");
    // Specialists now speak through the SAME server ElevenLabs route,
    // governed by the agent-tts bus channel; browser speech is banned and
    // the provider key never appears client-side.
    expect(specialists).toContain('authenticatedFetch("/api/aria/tts"');
    expect(specialists).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
    expect(specialists).not.toMatch(/ELEVENLABS_API_KEY|OPENAI_API_KEY/);
  });
});
