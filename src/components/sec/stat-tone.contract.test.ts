/**
 * نغمات بطاقة المؤشر — حارس العقد.
 *
 * OWNER DIRECTIVE, recorded so a later "let's unify the card colours" cannot
 * quietly undo it: «خطر» stays red, «تحذير» stays amber, and the two must be
 * distinguishable in the background, the border, the icon, the text colour,
 * the status badge, and the hover state.
 *
 * The load-bearing assertion is the LAST one. Every other check would still
 * pass on a card that differs only in hue — which is the state this replaced,
 * and which is unreadable to a red/amber colour-blind operator on a board
 * whose entire job is telling people what is dangerous.
 */
import { describe, expect, it } from "vitest";
import { STAT_TONES, type StatTone } from "./sec-shell";

const DANGER = STAT_TONES.danger;
const WARNING = STAT_TONES.warning;

describe("خطر وتحذير لا يُوحَّدان", () => {
  it("danger is red and warning is amber — the assigned hues, not swapped", () => {
    expect(DANGER.card).toContain("red-");
    expect(DANGER.card).not.toContain("amber-");
    expect(WARNING.card).toContain("amber-");
    expect(WARNING.card).not.toContain("red-");
  });

  it("the border differs", () => {
    // Both carry a border colour, and it is not the same one.
    expect(DANGER.card).toMatch(/border-red-\d/);
    expect(WARNING.card).toMatch(/border-amber-\d/);
  });

  it("the background differs", () => {
    expect(DANGER.card).toMatch(/\sbg-red-\d/);
    expect(WARNING.card).toMatch(/\sbg-amber-\d/);
  });

  it("the hover state differs", () => {
    expect(DANGER.card).toMatch(/hover:bg-red-\d/);
    expect(WARNING.card).toMatch(/hover:bg-amber-\d/);
  });

  it("the value text colour differs", () => {
    expect(DANGER.value).not.toBe(WARNING.value);
    expect(DANGER.value).toContain("red-");
    expect(WARNING.value).toContain("amber-");
  });

  it("the status badge differs in WORDS, not only in colour", () => {
    expect(DANGER.badge).toBe("خطر");
    expect(WARNING.badge).toBe("تحذير");
    expect(DANGER.badgeCls).not.toBe(WARNING.badgeCls);
  });

  it("each tone carries an icon, and they are different components", () => {
    expect(DANGER.icon).toBeTruthy();
    expect(WARNING.icon).toBeTruthy();
    expect(DANGER.icon).not.toBe(WARNING.icon);
  });

  it("success stays a third, distinct signal", () => {
    const ok = STAT_TONES.success;
    expect(ok.icon).not.toBe(DANGER.icon);
    expect(ok.icon).not.toBe(WARNING.icon);
    expect(ok.badge).toBe("سليم");
    expect(ok.card).toContain("emerald-");
  });

  it("no tone is left without a hover affordance", () => {
    for (const tone of Object.keys(STAT_TONES) as StatTone[]) {
      expect(STAT_TONES[tone].card, `${tone} has no hover state`).toContain("hover:");
    }
  });
});

describe("WCAG 1.4.1 — colour is never the only carrier", () => {
  // THE assertion. Strip every colour utility from both tones; what remains
  // must still differ. If it does not, the card is telling a colour-blind
  // operator nothing, and the previous implementation failed exactly here.
  const decolour = (s: string) =>
    s.replace(
      /\b(?:hover:|focus:|dark:)?(?:bg|text|border|ring)-(?:red|amber|emerald|rose|orange|yellow|green)-\d{2,3}(?:\/\d{1,3})?\b/g,
      "",
    );

  it("danger and warning still differ once every colour class is removed", () => {
    const carriers = (t: typeof DANGER) => ({
      badge: t.badge,
      icon: t.icon?.displayName ?? t.icon?.name ?? null,
      card: decolour(t.card).replace(/\s+/g, " ").trim(),
    });

    const d = carriers(DANGER);
    const w = carriers(WARNING);

    // The word and the icon shape are the non-colour carriers.
    expect(d.badge).not.toBe(w.badge);
    expect(d.icon).not.toBe(w.icon);
    expect(d.icon).toBeTruthy();
    expect(w.icon).toBeTruthy();
  });

  it("the de-colouring helper actually strips colour — a no-op would fake this", () => {
    // Article ٣٠: prove the instrument works before trusting its reading.
    expect(decolour("border-red-500/50 bg-red-500/10 hover:bg-red-500/15").trim()).toBe("");
    expect(decolour("rounded-xl border-red-500/50 p-4")).toContain("rounded-xl");
  });
});
