import { describe, expect, it } from "vitest";
import { assertCapability, ENV_CAPABILITIES, formatEnvReport, validateEnv } from "./env-manifest";

describe("env-manifest — capability validation (never throws on read)", () => {
  it("reports a fully-degraded environment as degraded, not an error", () => {
    const report = validateEnv({});
    expect(report.allReady).toBe(false);
    // Every non-optional capability is degraded when nothing is set.
    expect(report.degraded.length).toBeGreaterThan(0);
    expect(report.ready.every((s) => s.requirement === "optional")).toBe(true);
  });

  it("treats a one-of capability as ready when ANY single provider key is set", () => {
    const report = validateEnv({ GEMINI_API_KEY: "x" });
    const brain = [...report.ready, ...report.degraded].find((s) => s.key === "aria-brain");
    expect(brain?.ready).toBe(true);
    expect(brain?.missing).toEqual([]);
  });

  it("treats an all-of capability as degraded until every var is set", () => {
    const partial = validateEnv({ TWILIO_ACCOUNT_SID: "sid" });
    const sms = partial.degraded.find((s) => s.key === "outbound-sms");
    expect(sms).toBeDefined();
    expect(sms?.missing).toContain("TWILIO_AUTH_TOKEN");

    const full = validateEnv({ TWILIO_ACCOUNT_SID: "sid", TWILIO_AUTH_TOKEN: "tok" });
    expect(full.degraded.find((s) => s.key === "outbound-sms")).toBeUndefined();
  });

  it("ignores blank / whitespace-only values (treated as unset)", () => {
    const report = validateEnv({ ELEVENLABS_API_KEY: "   " });
    expect(report.degraded.some((s) => s.key === "sadeed-voice")).toBe(true);
  });

  it("assertCapability throws a specific, value-free message when unconfigured", () => {
    expect(() => assertCapability("sadeed-voice", {})).toThrowError(/ELEVENLABS_API_KEY/);
    expect(() => assertCapability("sadeed-voice", { ELEVENLABS_API_KEY: "k" })).not.toThrow();
    expect(() => assertCapability("nope", {})).toThrowError(/Unknown env capability/);
  });

  it("formats a boot-safe, value-free summary line", () => {
    const line = formatEnvReport(validateEnv({ GEMINI_API_KEY: "x" }));
    expect(line).toContain("[env]");
    // A summary must never leak a value — only names/keys.
    expect(line).not.toContain("x");
  });

  it("every capability var carries a name, scope and description", () => {
    for (const cap of ENV_CAPABILITIES) {
      for (const v of cap.vars) {
        expect(v.name).toMatch(/^[A-Z][A-Z0-9_]+$/);
        expect(["client", "server"]).toContain(v.scope);
        expect(v.description.length).toBeGreaterThan(0);
      }
    }
  });
});
