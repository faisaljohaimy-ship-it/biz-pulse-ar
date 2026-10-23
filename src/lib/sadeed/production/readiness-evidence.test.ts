import { describe, expect, it } from "vitest";
import { describeReadiness } from "./readiness-evidence";
import type { ReadinessInputs } from "./readiness-evidence";

const states: ReadinessInputs[] = [];
for (const geminiPresent of [false, true]) {
  for (const elevenLabsPresent of [false, true]) {
    for (const ragReindexConfirmed of [false, true]) {
      for (const gate of ["verified", "closed", "degraded"] as const) {
        states.push({ geminiPresent, elevenLabsPresent, ragReindexConfirmed, gate });
      }
    }
  }
}

describe("production readiness evidence", () => {
  it.each(states)("never upgrades configuration to execution proof: %j", (input) => {
    const report = describeReadiness(input);
    expect(report.chat.verification).toBe("not_run");
    expect(report.fnn.state).toBe("not_verified");
    expect(report.voice.state).toBe(
      input.elevenLabsPresent ? "configured_unverified" : "not_configured",
    );
    expect(report.rag.state).toBe(
      !input.ragReindexConfirmed
        ? "reindex_not_confirmed"
        : input.geminiPresent
          ? "configured_unverified"
          : "embedding_key_missing",
    );
    expect(report.chat.state).toBe(
      !input.geminiPresent
        ? "not_configured"
        : input.gate === "verified"
          ? "configured_unverified"
          : input.gate === "closed"
            ? "blocked"
            : "degraded",
    );
  });
  it("does not equate Gemini presence with ElevenLabs TTS configuration", () => {
    const report = describeReadiness({
      geminiPresent: true,
      elevenLabsPresent: false,
      ragReindexConfirmed: false,
      gate: "verified",
    });
    expect(report.voice.provider).toBe("elevenlabs");
    expect(report.voice.state).toBe("not_configured");
    expect(report.transcription.state).toBe("configured_unverified");
  });
  it("keeps its input immutable and emits no secret values", () => {
    const input = Object.freeze(states[0]);
    const before = JSON.stringify(input);
    const report = describeReadiness(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.keys(report)).not.toContain("api_key");
  });
});
