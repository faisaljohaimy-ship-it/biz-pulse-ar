/**
 * أسماء الشاشات — حارس العقد.
 *
 * Two properties, and the second is the one that actually caught bugs.
 *
 * ① The registry is a bijection. A name that resolves to two routes makes the
 *    navigation unlearnable — the operator clicks the words they remember and
 *    lands somewhere else.
 *
 * ② Navigation surfaces do not RE-TYPE those names. The registry alone fixes
 *    nothing if `app-shell.tsx` keeps its own string literal: that is exactly
 *    how `/sec` came to be «الأمن الصناعي» and «غرفة العمليات» and «مركز
 *    العمليات» in three files at once. Article 31 — sweep by effect, not by
 *    component name.
 *
 * SCOPE OF ② IS DELIBERATELY NARROW. It covers the four routes that actually
 * collided (items ٢٢ and ٣٨), not every screen name in the app. A rule wide
 * enough to ban all literals would need dozens of unrelated call sites
 * converted in the same commit, and a guard nobody can keep green gets
 * disabled instead of obeyed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES } from "./modules";
import { SCREEN_NAMES, screenName, screenNameAr, screenNameEn } from "./screen-names";

const ROOT = resolve(__dirname, "../../..");

/** Files that declare navigation ITEM LISTS — where a name is a label. */
const NAV_SURFACES = [
  "src/components/app-shell.tsx",
  "src/components/sec/sec-shell.tsx",
  "src/components/executive/CommandPalette.tsx",
  "src/routes/_authenticated/dashboard.tsx",
  // Not a list, but its exit button names a destination — and it is rendered
  // over two different screens, so a hard-coded name is wrong on one of them.
  "src/components/bridge/BriefingStage.tsx",
] as const;

/**
 * The routes whose names collided. Prose elsewhere may still say «غرفة
 * العمليات» inside a sentence — that is language, not a label.
 */
const GUARDED_ROUTES = [
  "/sec",
  "/situation-room",
  "/mission-control",
  "/command-center",
  "/bridge",
] as const;

/**
 * Names the review retired.
 *
 * «غرفة العمل» needs the lookahead: it is a PREFIX of «غرفة العمليات», so a
 * plain substring test reports a hit on every correct use of the canonical
 * name — a check that fails on healthy code gets deleted, not obeyed.
 */
const RETIRED_ALIASES = [/مركز العمليات/, /غرفة العمل(?!يات)/] as const;

/** Comments must be readable — they are where a fix explains the bug it fixed. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/**
 * The window around a route reference in which a name literal is a LABEL for
 * that route rather than unrelated prose. Nav rows are small object literals;
 * 200 characters covers the longest one in these files with room to spare.
 */
const LABEL_WINDOW = 200;

describe("the registry is a bijection", () => {
  it("no Arabic name is claimed by two routes", () => {
    const byName = new Map<string, string[]>();
    for (const [route, name] of Object.entries(SCREEN_NAMES)) {
      byName.set(name.ar, [...(byName.get(name.ar) ?? []), route]);
    }
    const collisions = [...byName].filter(([, routes]) => routes.length > 1);
    expect(collisions, `Arabic name(s) claimed by more than one route`).toEqual([]);
  });

  it("no English name is claimed by two routes", () => {
    const byName = new Map<string, string[]>();
    for (const [route, name] of Object.entries(SCREEN_NAMES)) {
      byName.set(name.en, [...(byName.get(name.en) ?? []), route]);
    }
    expect([...byName].filter(([, routes]) => routes.length > 1)).toEqual([]);
  });

  it("MODULES itself carries no duplicate name — it is the derivation source", () => {
    const ar = MODULES.map((m) => m.ar);
    expect(new Set(ar).size).toBe(ar.length);
  });
});

describe("the four names the review unified", () => {
  // Written as literals on purpose. Deriving the expectation from the code
  // under test would pass no matter what the code said (article ٣٠).
  it("«غرفة العمليات» is /situation-room and nothing else", () => {
    expect(screenNameAr("/situation-room")).toBe("غرفة العمليات");
    expect(screenNameAr("/sec")).not.toBe("غرفة العمليات");
  });

  it("«مركز القيادة» is /mission-control and nothing else", () => {
    expect(screenNameAr("/mission-control")).toBe("مركز القيادة");
    expect(screenNameAr("/command-center")).not.toBe("مركز القيادة");
  });

  it("/sec is «الأمن الصناعي»", () => {
    expect(screenNameAr("/sec")).toBe("الأمن الصناعي");
  });

  it("/command-center keeps its own distinct name", () => {
    expect(screenNameAr("/command-center")).toBe("مركز القيادة التنفيذي");
  });
});

describe("navigation surfaces read the name, they do not re-type it", () => {
  const guardedNames = GUARDED_ROUTES.map((r) => SCREEN_NAMES[r]!.ar);

  /**
   * Locate hard-coded labels by PAIRING, not by file-wide search.
   *
   * These files legitimately mention «الأمن الصناعي» in a region heading and
   * «مركز القيادة التنفيذي» in an aria-label — that is prose. What must never
   * exist again is a name literal sitting next to the route it labels, which
   * is the exact shape the drift took:
   *     { to: "/sec", label: ar("غرفة العمليات", "Ops Room") }
   */
  function hardCodedLabels(src: string): string[] {
    const clean = stripComments(src);
    const hits: string[] = [];
    for (const route of GUARDED_ROUTES) {
      const needle = `"${route}"`;
      for (let i = clean.indexOf(needle); i !== -1; i = clean.indexOf(needle, i + 1)) {
        const window = clean.slice(Math.max(0, i - LABEL_WINDOW), i + needle.length + LABEL_WINDOW);
        for (const name of guardedNames) {
          if (window.includes(name)) hits.push(`${route} ← "${name}"`);
        }
      }
    }
    return [...new Set(hits)];
  }

  for (const file of NAV_SURFACES) {
    it(`${file} hard-codes no guarded screen name beside its route`, () => {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      expect(
        hardCodedLabels(src),
        `${file} must call screenNameAr(route) instead of a literal`,
      ).toEqual([]);
    });

    it(`${file} carries no retired alias`, () => {
      const clean = stripComments(readFileSync(resolve(ROOT, file), "utf8"));
      const found = RETIRED_ALIASES.filter((re) => re.test(clean)).map(String);
      expect(found).toEqual([]);
    });
  }

  it("the pairing check goes red on the original defect", () => {
    // Article ٣٠: a green check proves nothing until it is shown to redden on
    // the fault. This is the line that was in app-shell.tsx.
    const regressed = `{ to: "/sec", icon: Activity, label: ar("غرفة العمليات", "Ops Room") },`;
    expect(hardCodedLabels(regressed).length).toBeGreaterThan(0);
  });
});

describe("lookup", () => {
  it("throws on an unknown route rather than rendering a raw path", () => {
    // A silent fallback prints "/nope" in the sidebar, which reads as a CSS
    // bug and survives review; a throw is caught here instead.
    expect(() => screenNameAr("/nope")).toThrow(/no canonical name/);
    expect(() => screenNameEn("/nope")).toThrow(/no canonical name/);
  });

  it("screenName picks the language", () => {
    expect(screenName("/situation-room", true)).toBe("غرفة العمليات");
    expect(screenName("/situation-room", false)).toBe("Situation Room");
  });
});
