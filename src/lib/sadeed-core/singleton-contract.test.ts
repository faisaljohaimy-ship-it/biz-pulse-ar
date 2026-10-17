import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("SADEED singleton release contract", () => {
  it("mounts one official SADEED UI at the application root", () => {
    const root = source("src/routes/__root.tsx");
    expect(root.match(/<SadeedCopilot\b/g)).toHaveLength(1);
    expect(root).not.toContain("SadeedDock");
  });

  it("keeps historical assistant routes on the singleton surface", () => {
    for (const route of [
      "src/routes/_authenticated/sadeed.tsx",
      "src/routes/_authenticated/assistant.index.tsx",
      "src/routes/_authenticated/assistant.$threadId.tsx",
      "src/routes/_authenticated/voice.tsx",
    ]) {
      const contents = source(route);
      expect(contents).toContain("CanonicalSadeedRoute");
      expect(contents).not.toMatch(/useChat|useSadeedVoice|DefaultChatTransport/);
    }
  });

  it("does not mount a second SADEED dock in Digital Twin", () => {
    const twin = source("src/routes/_authenticated/digital-twin.tsx");
    expect(twin).not.toMatch(/SadeedDock|useSadeedVoice|DefaultChatTransport/);
  });

  it("routes every authenticated voice caller to the canonical endpoint", () => {
    for (const caller of [
      "src/components/sadeed-core/SadeedCopilot.tsx",
      "src/routes/_authenticated/tts.tsx",
    ]) {
      const contents = source(caller);
      expect(contents).toContain("/api/sadeed/tts");
      expect(contents).not.toMatch(/["']\/api\/tts["']/);
    }
  });

  it("keeps the legacy TTS URL as a redirect, not a second provider", () => {
    const compatibilityRoute = source("src/routes/api/tts.ts");
    expect(compatibilityRoute).toContain("status: 308");
    expect(compatibilityRoute).toContain("/api/sadeed/tts");
    expect(compatibilityRoute).not.toMatch(/ELEVENLABS|xi-api-key/);
  });

  it("does not mint a second conversational voice token", () => {
    const compatibilityRoute = source("src/routes/api/voice-token.ts");
    expect(compatibilityRoute).toContain("status: 410");
    expect(compatibilityRoute).not.toMatch(/ELEVENLABS|single-use-token|conversation\/token/);
  });

  it("keeps voice setup read-only and free of parallel conversation providers", () => {
    const diagnostics = source("src/routes/api/voice-diagnostics.ts");
    expect(diagnostics).toContain("SADEED_ELEVENLABS_VOICE_ID");
    expect(diagnostics).not.toMatch(/ELEVENLABS_AGENT_ID|convai|realtime_scribe|single-use-token/);

    for (const route of [
      "src/routes/_authenticated/elevenlabs-status.tsx",
      "src/routes/_authenticated/voice-setup.tsx",
    ]) {
      const contents = source(route);
      expect(contents).toContain("CanonicalVoiceStatus");
      expect(contents).not.toMatch(/useChat|useSadeedVoice|DefaultChatTransport/);
    }
  });

  it("routes learning conversations through the same SADEED brain", () => {
    for (const component of [
      "src/components/learn/LessonSADEEDChat.tsx",
      "src/components/learn/simulations/MeetSadeedSimulation.tsx",
    ]) {
      const contents = source(component);
      expect(contents).toContain("useSadeed");
      // المسار القديم `/api/learn/aria-teach` حُذف؛ الحارس يلاحق الآن المسار
      // الحقيقي — فالمقصود منع نداء مباشر للنقطة، لا منع اسم مهجور.
      expect(contents).not.toMatch(/useChat|DefaultChatTransport|\/api\/learn\/sadeed-teach/);
    }
  });

  it("keeps every audible voice on the server SADEED voice route (no browser TTS)", () => {
    const client = source("src/lib/digital-humans/sadeed-voice.ts");
    const specialists = source("src/lib/digital-humans/free-agent-speech.ts");
    expect(client).toContain('authenticatedFetch("/api/sadeed/tts"');
    expect(client).toContain("speakFreeAgent");
    expect(client).not.toContain("/api/agents/tts");
    // Specialists now speak through the SAME server ElevenLabs route,
    // governed by the agent-tts bus channel; browser speech is banned and
    // the provider key never appears client-side.
    expect(specialists).toContain('authenticatedFetch("/api/sadeed/tts"');
    expect(specialists).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
    expect(specialists).not.toMatch(/ELEVENLABS_API_KEY|OPENAI_API_KEY/);
  });
});
