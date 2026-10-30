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

describe("env-manifest: قناة n8n قدرةٌ اختيارية (أمر المالك ٢٠٢٦/١٠/٣٠)", () => {
  const N8N_NAMES = [
    "SADEED_N8N_BASE_URL",
    "SADEED_N8N_SECRET",
    "FINN_N8N_SECRET",
    "SADEED_WEB_RESEARCH",
    "SADEED_WEB_DISABLED",
  ];
  const find = (name: string) =>
    ENV_CAPABILITIES.flatMap((c) => c.vars.map((v) => ({ cap: c, v }))).find(
      (x) => x.v.name === name,
    );

  it("الأسماء الخمسة كلها في البيان، خادمية، تحت قدرةٍ اختيارية", () => {
    for (const n of N8N_NAMES) {
      const hit = find(n);
      expect(hit, n).toBeDefined();
      expect(hit!.v.scope, n).toBe("server");
      expect(hit!.cap.requirement, n).toBe("optional");
      expect(n.startsWith("VITE_"), n).toBe(false);
    }
  });

  it("السرّان حسّاسان والباقي (أصل · وضع · مفتاح إيقاف) ليس أسرارًا", () => {
    expect(find("SADEED_N8N_SECRET")!.v.sensitive).toBe(true);
    expect(find("FINN_N8N_SECRET")!.v.sensitive).toBe(true);
    for (const n of ["SADEED_N8N_BASE_URL", "SADEED_WEB_RESEARCH", "SADEED_WEB_DISABLED"]) {
      expect(find(n)!.v.sensitive, n).toBe(false);
    }
  });

  it("غيابها كلّها لا يجعل شيئًا «متدهورًا» ولا يرمي", () => {
    const report = validateEnv({});
    const keys = report.degraded.map((s) => s.key);
    expect(keys).not.toContain("sadeed-web-research");
    expect(keys).not.toContain("fnn-n8n");
    const ready = report.ready.map((s) => s.key);
    expect(ready).toEqual(expect.arrayContaining(["sadeed-web-research", "fnn-n8n"]));
  });

  it("وجود قيمٍ لا يطبع قيمة: ملخّص الإقلاع بأسماء القدرات فقط", () => {
    const secret = "never-print-this-secret-value-0123456789abcdef";
    const line = formatEnvReport(
      validateEnv({ SADEED_N8N_SECRET: secret, FINN_N8N_SECRET: secret }),
    );
    expect(line).not.toContain(secret);
  });
});
