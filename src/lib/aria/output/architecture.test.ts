import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architectural guard — fails if a raw model-output path ever returns.
 *
 * Every model entrypoint must buffer + finalize/revalidate before emitting, and
 * no public sink may forward a provider stream body or a `text` field that has
 * not passed the output gateway. This test reads the real route files and
 * asserts the safe-output primitives are present and the raw patterns are gone.
 */
const root = resolve(process.cwd());
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("output architecture — no raw model path may return", () => {
  it("chat.ts buffers (generateText) and never streams raw (no streamText/toUIMessageStreamResponse)", () => {
    const src = read("src/routes/api/chat.ts");
    expect(src).toMatch(/finalizeFinnOutput/);
    expect(src).toMatch(/generateText/);
    expect(src).not.toMatch(/\bstreamText\b/);
    expect(src).not.toMatch(/\.toUIMessageStreamResponse\(/);
  });

  it("aria/chat.ts no longer proxies the raw provider stream body", () => {
    const src = read("src/routes/api/aria/chat.ts");
    expect(src).toMatch(/revalidateSpeakableText/);
    expect(src).not.toMatch(/new Response\(\s*openAIResponse\.body/);
  });

  it("public/aria-stream.ts revalidates buffered text (no per-token forward)", () => {
    const src = read("src/routes/api/public/aria-stream.ts");
    expect(src).toMatch(/revalidateSpeakableText/);
    expect(src).not.toMatch(/send\(\{\s*delta\s*\}\)/);
  });

  it("learn/aria-teach.ts buffers via generateText (no raw streamText passthrough)", () => {
    const src = read("src/routes/api/learn/aria-teach.ts");
    expect(src).toMatch(/generateText/);
    expect(src).toMatch(/revalidateSpeakableText/);
    expect(src).not.toMatch(/result\.toUIMessageStreamResponse/);
  });

  it("both TTS endpoints go through the gateway (adapter or revalidation)", () => {
    expect(read("src/routes/api/aria/tts.ts")).toMatch(/synthesizeSafeSpeech/);
    expect(read("src/routes/api/public/aria-tts.ts")).toMatch(/revalidateSpeakableText/);
  });

  it("public batch text routes apply the safe projection", () => {
    expect(read("src/routes/api/public/aria-ask.ts")).toMatch(/revalidateSpeakableText/);
    expect(read("src/routes/api/public/aria-explain.ts")).toMatch(/revalidateSpeakableText/);
  });

  it("outbound blocks secret/protected leakage", () => {
    expect(read("src/lib/aria/outbound-messaging.server.ts")).toMatch(/containsUnsafeLeakage/);
  });

  it("the client consumes safe display/speech, never a raw fallback string", () => {
    const src = read("src/components/aria-core/FinnCopilot.tsx");
    expect(src).toMatch(/finnDisplayFromMessage|speakableTextFromEnvelope/);
  });

  it("no illegal SafeFinnOutput cast exists outside the gateway module", () => {
    for (const p of [
      "src/routes/api/chat.ts",
      "src/components/aria-core/FinnCopilot.tsx",
      "src/lib/aria/output/chat-core.server.ts",
    ]) {
      expect(read(p)).not.toMatch(/as\s+SafeFinnOutput\b/);
    }
  });
});
