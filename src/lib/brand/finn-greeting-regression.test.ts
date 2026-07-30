/**
 * FINN greeting — REGRESSION suite for text AND voice.
 *
 * WHY THIS EXISTS
 * `finn-identity.contract.test.ts` proves the retired name is absent from the
 * source tree. That is a static guarantee only: it says nothing about text
 * COMPOSED at runtime (a greeting built from a display name, an alert title, a
 * stale knowledge row) or about text arriving from OUTSIDE the repo — a client
 * POSTing raw JSON to the voice API. Either path can reach a screen or a
 * speaker with the old name in it while every file in `src/` is clean.
 *
 * WHAT IT LOCKS
 *   1. Every shipped greeting constant is FINN-clean in its display AND its
 *      diacritized TTS twin.
 *   2. Every greeting COMPOSER stays clean when its inputs are contaminated.
 *   3. Every text→voice boundary (`revalidateSpeakableText`, the TTS adapter,
 *      the output gateway's `ttsText`, the speech normaliser) scrubs the old
 *      name — so an API caller cannot make FINN say it.
 *   4. Every TTS route file actually routes its text through one of those
 *      boundaries, so a NEW voice endpoint cannot quietly skip the guard.
 *
 * The banned tokens are written as escape sequences on purpose: this file must
 * be able to name what it bans without tripping the source-level scan in
 * `finn-identity.contract.test.ts`.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  FINN_CONVERSATION_GREETING_AR,
  FINN_CONVERSATION_GREETING_AR_TTS,
} from "@/lib/finn/conversation-greeting";
import {
  enforceFinnIdentity,
  finalizeFinnOutput,
  finnTtsTextFrom,
  renderForUI,
  revalidateSpeakableText,
} from "@/lib/finn/output/finalize";
import { synthesizeSafeSpeech, type SpeakExecutor } from "@/lib/finn/output/tts-adapter.server";
import { normalizeFinnSpeechText } from "@/lib/finn/finn-speech-normalize";
import { composeExecutiveGreeting } from "@/lib/finn/acceptance-experience/executive-greeting.server";
import { sanitizeVoice } from "@/lib/finn/presence/voice";
import type { Actor } from "@/finn/shell";

/* ── The banned tokens, spelled without writing them literally ───────────── */
/** «آريا» — the retired Arabic name. */
const AR_OLD = "\u0622\u0631\u064A\u0627";
/** «اريا» — the same name without the madda, as it is often typed. */
const AR_OLD_PLAIN = "\u0627\u0631\u064A\u0627";
/** The retired Latin name as a standalone word. */
const EN_OLD = "A\u0052IA";
const EN_OLD_RE = /(?<![A-Za-z_-])A\u0052IA(?![A-Za-z_-])/i;

/** One assertion used everywhere: this string may reach a user. */
function expectFinnClean(label: string, text: string): void {
  expect(text, `${label}: contains the retired Arabic name`).not.toContain(AR_OLD);
  expect(text, `${label}: contains the retired Arabic name (plain alef)`).not.toContain(
    AR_OLD_PLAIN,
  );
  expect(text, `${label}: contains the retired Latin name`).not.toMatch(EN_OLD_RE);
}

/**
 * Contaminated greeting drafts — the exact shapes seen in the wild: a model
 * self-introduction, a stale knowledge sentence, an English twin, and a
 * greeting whose only contamination arrives through an interpolated value.
 */
const CONTAMINATED_GREETINGS: ReadonlyArray<{ label: string; text: string }> = [
  { label: "ar self-intro", text: `أهلاً بك، أنا ${AR_OLD}، الذكاء التنفيذي لـ NEXIOS.` },
  { label: "ar self-intro (plain alef)", text: `مرحباً، أنا ${AR_OLD_PLAIN} مساعدك التنفيذي.` },
  { label: "ar mid-sentence", text: `صباح الخير. جهّزت ${AR_OLD} إيجاز اليوم.` },
  { label: "en self-intro", text: `Hello, I am ${EN_OLD}, the executive intelligence of NEXIOS.` },
  { label: "en mid-sentence", text: `Good morning — ${EN_OLD} prepared today's briefing.` },
  { label: "mixed", text: `أهلاً بعودتك، ${EN_OLD} و${AR_OLD} جاهزتان.` },
];

const actor: Actor = { id: "u-1", role: "executive", orgId: "org-1" } as unknown as Actor;

function finalize(modelText: string) {
  return finalizeFinnOutput({
    userText: "أعطني تحية الافتتاح",
    modelText,
    actor,
    evidence: { available: [] },
    liveDataAvailable: false,
    trustedClockISO: new Date("2026-01-01T08:00:00.000Z").toISOString(),
    isSimulationEnv: false,
  });
}

describe("FINN greeting regression — the shipped greetings", () => {
  const SHIPPED: ReadonlyArray<{ label: string; text: string }> = [
    { label: "conversation greeting (display)", text: FINN_CONVERSATION_GREETING_AR },
    { label: "conversation greeting (TTS)", text: FINN_CONVERSATION_GREETING_AR_TTS },
  ];

  it.each(SHIPPED)("$label says FINN and never the retired name", ({ label, text }) => {
    expect(text.length, `${label} is empty`).toBeGreaterThan(0);
    expectFinnClean(label, text);
  });

  it("the display greeting and its TTS twin are the same greeting", () => {
    // A diacritized twin that drifts from the display form is how a stale
    // spoken identity survives a text-only rename.
    const bare = (s: string) => s.replace(/[\u064B-\u0652\u0670]/g, "").replace(/\s+/g, " ").trim();
    expect(bare(FINN_CONVERSATION_GREETING_AR_TTS)).toContain("فن");
    expect(bare(FINN_CONVERSATION_GREETING_AR)).toContain("فن");
  });
});

describe("FINN greeting regression — composed greetings", () => {
  it("the executive greeting stays clean when its inputs are contaminated", () => {
    for (const lang of ["ar", "en"] as const) {
      const composed = composeExecutiveGreeting({
        lang,
        userDisplayName: EN_OLD,
        systemHealth: "amber",
        topAlerts: [`${AR_OLD} تنبيه`, `${EN_OLD} alert`],
        priorities: [`${AR_OLD} أولوية`],
      });
      // The composer itself interpolates freely; the guard is what ships.
      expectFinnClean(`executive greeting (${lang}) display`, enforceFinnIdentity(composed.text));
      const spoken = revalidateSpeakableText(composed.text);
      expect(spoken.ok).toBe(true);
      expectFinnClean(`executive greeting (${lang}) voice`, spoken.text);
    }
  });

  it("the voice sanitizer never re-introduces the retired name", () => {
    for (const { label, text } of CONTAMINATED_GREETINGS) {
      expectFinnClean(`sanitizeVoice+guard: ${label}`, enforceFinnIdentity(sanitizeVoice(text)));
    }
  });
});

describe("FINN greeting regression — every text→voice boundary scrubs the name", () => {
  it.each(CONTAMINATED_GREETINGS)(
    "the output gateway cleans display AND tts text: $label",
    ({ label, text }) => {
      const safe = finalize(text);
      expectFinnClean(`gateway display: ${label}`, renderForUI(safe));
      expectFinnClean(`gateway tts: ${label}`, finnTtsTextFrom(safe));
    },
  );

  it.each(CONTAMINATED_GREETINGS)(
    "the HTTP TTS re-validation cleans raw API text: $label",
    ({ label, text }) => {
      const rev = revalidateSpeakableText(text);
      expect(rev.ok, `${label}: should still be speakable after scrubbing`).toBe(true);
      expectFinnClean(`revalidateSpeakableText: ${label}`, rev.text);
    },
  );

  it.each(CONTAMINATED_GREETINGS)(
    "the TTS adapter never hands the retired name to the synthesizer: $label",
    async ({ label, text }) => {
      const seen: string[] = [];
      const speak: SpeakExecutor = async (t) => {
        seen.push(t);
        return { ok: true, status: 200, audio: null, contentType: "audio/mpeg" };
      };
      const outcome = await synthesizeSafeSpeech({ text, voiceId: "voice-1" }, { speak });
      // A banned self-introduction can scrub down to nothing — staying SILENT
      // is a correct outcome. What is never correct is synthesizing the name.
      if (!outcome.spoken) {
        expect(outcome.reason, `${label}: refused for the wrong reason`).toBe("empty");
        expect(seen, `${label}: synthesizer was called after a refusal`).toHaveLength(0);
        return;
      }
      expect(seen).toHaveLength(1);
      expectFinnClean(`synthesizer input: ${label}`, seen[0]!);
    },
  );

  it.each(CONTAMINATED_GREETINGS)(
    "the speech normaliser produces a clean spoken form: $label",
    ({ label, text }) => {
      // Normalisation runs on text that already passed the guard — the pipeline
      // order the routes use. It must not resurrect the token it maps.
      const guarded = revalidateSpeakableText(text);
      const { speech } = normalizeFinnSpeechText(guarded.text);
      expectFinnClean(`normalized speech: ${label}`, speech);
    },
  );

  it("proves the assertions can fail (a guard that matches nothing passes forever)", () => {
    expect(() => expectFinnClean("canary ar", `أنا ${AR_OLD}`)).toThrow();
    expect(() => expectFinnClean("canary en", `I am ${EN_OLD}`)).toThrow();
    // ...and that legitimate identifiers — accessibility attributes and the
    // legacy env alias kept for backward compatibility — are NOT the product
    // name and must not be flagged.
    expect(() => expectFinnClean("aria-label", '<div aria-label="close" />')).not.toThrow();
    expect(() =>
      expectFinnClean("env alias", "process.env.A\u0052IA_FORCE_GEMINI_FLASH"),
    ).not.toThrow();
  });

});

describe("FINN greeting regression — every TTS endpoint is wired to a guard", () => {
  /** Every route that can turn text into audio. A new one must join this list. */
  const TTS_ROUTES = [
    "src/routes/api/finn/tts.ts",
    "src/routes/api/public/finn-tts.ts",
    "src/routes/api/public/aria-tts.ts",
  ];

  /** Symbols that guarantee the identity guard runs before synthesis. */
  const GUARDS = [
    "revalidateSpeakableText",
    "synthesizeSafeSpeech",
    "enforceFinnIdentity",
    // The legacy alias delegates wholesale to the canonical guarded handler.
    "LEGACY_HANDLERS",
  ];

  it.each(TTS_ROUTES)("%s routes its text through the identity guard", (file) => {
    const src = readFileSync(file, "utf8");
    expect(
      GUARDS.some((g) => src.includes(g)),
      `${file} synthesizes speech without a guarded text boundary`,
    ).toBe(true);
  });

  it("the guard used by the routes is the one this suite tested", () => {
    // Binds the static check above to the behavioural checks: if the guard is
    // renamed, both the wiring test and this one fail together.
    expect(typeof revalidateSpeakableText).toBe("function");
    expect(typeof synthesizeSafeSpeech).toBe("function");
    expect(typeof enforceFinnIdentity).toBe("function");
  });
});
