/**
 * FINN identity — contract guard.
 *
 * WHY THIS EXISTS
 * The assistant used to be called «آريا» / ARIA. The owner directive is that
 * the name is gone from every surface a user can read. Nothing enforced that,
 * so a single new string literal — a placeholder, a copied paragraph, a
 * restored old file — would put the old name back on screen with no test
 * failing anywhere.
 *
 * WHAT IT SCANS
 * The surfaces a user actually reads: application source under src/ (string
 * literals), shipped assets under public/ (subtitles, manifests) and the
 * repository README. DATABASE text is out of reach of a file scan; that side
 * is handled by supabase/migrations/20260730130000_finn_visible_text_rename.sql,
 * whose UPDATEs are exercised against a real Postgres, not asserted about.
 *
 * WHAT IT DELIBERATELY ALLOWS
 * Technical identifiers keep the old spelling by owner directive — the WHOLE
 * point is that renaming them breaks working code for a cosmetic gain:
 *   · `aria-*` HTML attributes — accessibility, unrelated to the product name
 *   · `aria_*` tables/columns/functions, `ARIA_*` env vars, `aria/` paths
 *   · the ARIA→«فِنّ» entry in the speech normaliser, whose LEFT-HAND SIDE is
 *     the token being caught: delete it and stale text is mispronounced
 * Only two things are banned: the Arabic spelling «آريا» anywhere in code, and
 * the standalone uppercase word ARIA in code (not `aria-`, not `ARIA_`).
 *
 * Comments are stripped before the negative assertions, because this file and
 * the normaliser both DOCUMENT the old name in prose. Without stripping, the
 * sentence describing the rule would fail the rule.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Old name in Arabic script — banned outright in any scanned surface. */
const AR_OLD = "آريا";
/** Old name in Latin script, as a standalone word: `ARIA`, never `aria-`/`ARIA_`. */
const EN_OLD = /(?<![A-Za-z_-])ARIA(?![A-Za-z_-])/;
/**
 * The retired VOICE name. Distinct from the assistant name and missed by the
 * two checks above — which is how «صوت ليان الحصري» survived on the integrations
 * card and `identity: "FINN · Layan"` survived in the voice-diagnostics payload
 * long after the voice itself became a male one with a different id. A stale
 * voice label is a visible identity leak too, so it gets its own check.
 * Scanned in STRING LITERALS only: ~28 code comments still narrate the old
 * voice, and rewriting comments is a separate cleanup, not an identity fix.
 */
const VOICE_OLD_AR = "ليان";
const VOICE_OLD_EN = /(?<![A-Za-z])Layan(?![A-Za-z])/;

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/**
 * Files exempt from the scan, each for a stated reason. An exemption is a
 * liability, so the list is short and every entry says why removing the old
 * name there would be wrong rather than merely inconvenient.
 */
const EXEMPT: ReadonlyMap<string, string> = new Map([
  [
    "src/lib/finn/finn-speech-normalize.ts",
    "maps the literal token ARIA to its spoken form; the token is the input",
  ],
  [
    "src/lib/finn/finn-speech-normalize.test.ts",
    "feeds the literal token ARIA in as INPUT to assert the mapping fires",
  ],
  [
    // Runtime last line of defence: enforceFinnIdentity() strips the legacy
    // self-name (and the «أنا … الذكاء التنفيذي لـ NEXIOS» clause) out of every
    // assistant turn before it can reach a screen or the voice path. Its
    // patterns have to spell out what they match, so the token appearing here
    // is the cure, not the disease. Deleting it would let stale model output
    // and stale knowledge rows say "ARIA" again with nothing to catch them.
    "src/lib/finn/output/finalize.ts",
    "enforceFinnIdentity strips the legacy name; its patterns must name it",
  ],
  ["src/lib/brand/finn-identity.contract.test.ts", "this file — it must name what it bans"],
]);

const scanned = globSync("src/**/*.{ts,tsx}").filter((f) => !EXEMPT.has(f));

const ASSETS = ["public/media/nexios-executive-presentation-chapters.vtt", "README.md"];

describe("FINN identity — the old name stays off every visible surface", () => {
  it("actually scanned the application source", () => {
    // A guard that silently matches nothing passes forever. If the glob breaks
    // or the tree moves, this fails first and says so.
    expect(scanned.length).toBeGreaterThan(300);
  });

  it("detects the banned strings when they are present", () => {
    // Proves the assertions below can fail. Without this the suite could be
    // green because the checks are inert, not because the repo is clean.
    expect(stripComments('const x = "أهلاً بك، أنا آريا";')).toContain(AR_OLD);
    expect(stripComments('const x = "I am ARIA";')).toMatch(EN_OLD);
    // ...and that the allowed identifier shapes are NOT flagged.
    expect('<div aria-label="x" />').not.toMatch(EN_OLD);
    expect("process.env.ARIA_ELEVENLABS_VOICE_ID").not.toMatch(EN_OLD);
    expect("from('finn_knowledge')").not.toMatch(EN_OLD);
  });

  it("has no «آريا» in application source", () => {
    const hits = scanned.filter((f) => stripComments(readFileSync(f, "utf8")).includes(AR_OLD));
    expect(hits).toEqual([]);
  });

  it("has no standalone ARIA in application source", () => {
    const hits = scanned.filter((f) => EN_OLD.test(stripComments(readFileSync(f, "utf8"))));
    expect(hits).toEqual([]);
  });

  it("has no retired VOICE name in any string literal", () => {
    // Comments are stripped AND quoted strings are isolated: the point is what
    // reaches a screen or an API payload, not what a comment reminisces about.
    const hits = scanned.filter((f) => {
      const literals = stripComments(readFileSync(f, "utf8")).match(/"[^"\n]*"|'[^'\n]*'/g) ?? [];
      return literals.some((s) => s.includes(VOICE_OLD_AR) || VOICE_OLD_EN.test(s));
    });
    expect(hits).toEqual([]);
  });

  it("has no old name in shipped assets or the README", () => {
    const hits = ASSETS.filter((f) => {
      const text = readFileSync(f, "utf8");
      return text.includes(AR_OLD) || EN_OLD.test(text);
    });
    expect(hits).toEqual([]);
  });
});
