import { describe, expect, it } from "vitest";
import { finalizeSadeedOutput } from "./finalize";
import { parseEnvelope, sealEnvelope, SAFE_OUTPUT_VERSION } from "./envelope";
import {
  displayTextFromEnvelope,
  sadeedDisplayFromMessage,
  speakableTextFromEnvelope,
  CLIENT_SAFE_FALLBACK,
} from "./client-consumer";
import { mintReceipt, sha256Hex, verifyReceipt, type ReceiptClaims } from "./provenance.server";
import { synthesizeSafeSpeech, type SpeakExecutor, type SpeakResult } from "./tts-adapter.server";

const seal = (userText: string, modelText: string) =>
  sealEnvelope(
    finalizeSadeedOutput({
      userText,
      modelText,
      actor: { userId: "u1", appRoles: [], orgRole: null, orgId: "org-1" },
      evidence: { available: [] },
      liveDataAvailable: true,
      trustedClockISO: "2026-07-24T09:00:00Z",
      isSimulationEnv: false,
    }),
    { requestId: "r1", locale: "ar", createdAt: "2026-07-24T09:00:00Z" },
  );

describe("envelope — serialize / validate round-trip", () => {
  it("round-trips a sealed envelope through JSON", () => {
    const env = seal("ما وحدات سَدِيد؟", "سَدِيد يوفّر مركز القيادة.");
    const wire = JSON.parse(JSON.stringify(env));
    const parsed = parseEnvelope(wire);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.envelope.version).toBe(SAFE_OUTPUT_VERSION);
  });
  it("rejects an unknown version", () => {
    const env = seal("x", "y");
    const bad = { ...env, version: "sadeed-safe-output.v2" };
    expect(parseEnvelope(bad).ok).toBe(false);
  });
  it("rejects a missing required field", () => {
    const env = seal("x", "y") as Record<string, unknown>;
    const { displayText: _drop, ...missing } = env;
    expect(parseEnvelope(missing).ok).toBe(false);
  });
});

describe("client consumer — displayText only, fail-closed", () => {
  it("returns displayText from a valid envelope", () => {
    const env = seal("ما وحدات سَدِيد؟", "سَدِيد يوفّر مركز القيادة.");
    expect(displayTextFromEnvelope(JSON.parse(JSON.stringify(env)))).toBe(env.displayText);
  });
  it("returns a safe fallback for a malformed envelope (never raw)", () => {
    expect(displayTextFromEnvelope({ version: "nope", displayText: "sk-leak" })).toBe(
      CLIENT_SAFE_FALLBACK,
    );
    expect(displayTextFromEnvelope(null)).toBe(CLIENT_SAFE_FALLBACK);
  });
  it("prefers a validated envelope in message metadata over raw parts", () => {
    const env = seal("ما وحدات سَدِيد؟", "سَدِيد يوفّر مركز القيادة.");
    const shown = sadeedDisplayFromMessage({
      parts: [{ type: "text", text: "RAW MODEL LEAK" }],
      metadata: { envelope: JSON.parse(JSON.stringify(env)) },
    });
    expect(shown).toBe(env.displayText);
    expect(shown).not.toContain("RAW MODEL LEAK");
  });
  it("speakableText comes only from a valid envelope", () => {
    const env = seal("ما وحدات سَدِيد؟", "سَدِيد يوفّر مركز القيادة.");
    expect(speakableTextFromEnvelope(JSON.parse(JSON.stringify(env)))).toBe(env.speakableText);
    expect(speakableTextFromEnvelope({})).toBe("");
  });
});

describe("provenance — receipts bind to request/user/org/text", () => {
  const SECRET = "x".repeat(48);
  const claims = async (over: Partial<ReceiptClaims> = {}): Promise<ReceiptClaims> => ({
    requestId: "r1",
    userId: "u1",
    orgId: "org-1",
    textHash: await sha256Hex("مرحبا"),
    expiresAt: "2026-07-24T10:00:00Z",
    ...over,
  });
  const NOW = Date.parse("2026-07-24T09:00:00Z");

  it("verifies a valid receipt", async () => {
    const c = await claims();
    const token = await mintReceipt(c, SECRET);
    expect((await verifyReceipt(token, c, SECRET, NOW)).ok).toBe(true);
  });
  it("rejects an expired receipt", async () => {
    const c = await claims({ expiresAt: "2026-07-24T08:00:00Z" });
    const token = await mintReceipt(c, SECRET);
    const v = await verifyReceipt(token, c, SECRET, NOW);
    expect(v.ok).toBe(false);
  });
  it("rejects a cross-org receipt (claim change breaks signature)", async () => {
    const minted = await mintReceipt(await claims({ orgId: "org-1" }), SECRET);
    const v = await verifyReceipt(minted, await claims({ orgId: "org-2" }), SECRET, NOW);
    expect(v.ok).toBe(false);
  });
  it("rejects a tampered token", async () => {
    const c = await claims();
    const token = (await mintReceipt(c, SECRET)) + "x";
    expect((await verifyReceipt(token, c, SECRET, NOW)).ok).toBe(false);
  });
});

describe("TTS adapter — only sanitized text reaches the executor", () => {
  function spy(): { speak: SpeakExecutor; seen: string[] } {
    const seen: string[] = [];
    const speak: SpeakExecutor = async (text): Promise<SpeakResult> => {
      seen.push(text);
      return { ok: true, status: 200, audio: null, contentType: "audio/mpeg" };
    };
    return { speak, seen };
  }

  it("speaks safe text and passes ONLY sanitized text to the executor", async () => {
    const s = spy();
    const out = await synthesizeSafeSpeech(
      { text: "نطاق التوجيه يشمل الحماية.", voiceId: "v1" },
      { speak: s.speak },
    );
    expect(out.spoken).toBe(true);
    expect(s.seen).toHaveLength(1);
  });

  it("BLOCKS a payload leaking a secret — executor never called", async () => {
    const s = spy();
    const out = await synthesizeSafeSpeech(
      { text: "secret = sk-abcdef123456789 now", voiceId: "v1" },
      { speak: s.speak },
    );
    expect(out.spoken).toBe(false);
    expect(s.seen).toHaveLength(0);
  });

  it("redacts PII before speaking (no phone reaches the executor)", async () => {
    const s = spy();
    await synthesizeSafeSpeech({ text: "اتصل على 0551234567", voiceId: "v1" }, { speak: s.speak });
    expect(s.seen[0]).not.toMatch(/0\d{9}/);
  });

  it("rejects a tampered provenance receipt", async () => {
    const s = spy();
    const SECRET = "y".repeat(48);
    const text = "نص آمن للنطق";
    const textHash = await sha256Hex(text);
    const claims: ReceiptClaims = {
      requestId: "r1",
      userId: "u1",
      orgId: "org-1",
      textHash,
      expiresAt: "2026-07-24T10:00:00Z",
    };
    const token = (await mintReceipt(claims, SECRET)) + "tamper";
    const out = await synthesizeSafeSpeech(
      {
        text,
        voiceId: "v1",
        provenance: { token, claims, secret: SECRET, nowMs: Date.parse("2026-07-24T09:00:00Z") },
      },
      { speak: s.speak },
    );
    expect(out.spoken).toBe(false);
    expect(s.seen).toHaveLength(0);
  });
});
