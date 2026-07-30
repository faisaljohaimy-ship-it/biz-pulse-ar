/**
 * Home route — contract guard.
 *
 * WHY THIS EXISTS
 * A refactor deleted `export const Route = createFileRoute("/")` from
 * src/routes/index.tsx. The cause was an unanchored lazy multiline regex:
 * it searched forward for a terminator that did not exist near its target,
 * expanded past the route export, and removed everything in between.
 *
 * Nothing caught it. tsc passed (the file still compiled), eslint passed, all
 * 872 tests passed, the production build succeeded and the performance budget
 * was green — because a missing route export is not a type error or a lint
 * error. It is a 404 at runtime, and only at runtime.
 *
 * So the gate gets an assertion it did not have: the homepage must export its
 * route, and must still render its sections.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const INDEX = readFileSync("src/routes/index.tsx", "utf8");

describe("homepage route contract", () => {
  it("exports the '/' route — without this the homepage 404s at runtime", () => {
    expect(INDEX).toMatch(/export const Route\s*=\s*createFileRoute\("\/"\)/);
  });

  it("still renders the sections the homepage is made of", () => {
    // Each of these was removed and restored at least once. Listing them by
    // name means a future deletion has to be deliberate, not incidental.
    for (const section of [
      "<FourRegionHub />",
      "<SovereignCommandDeck",
      "<DashboardPreviewRail",
      "<FinnAnomalyStrip />",
      "<FinnTodayRecommendations />",
      "<OsDecisionQueue",
      "<ExecutiveShowcaseHub />",
      "<HolographicFlowShowcase",
      "<HomeTopNav />",
    ]) {
      expect(INDEX).toContain(section);
    }
  });

  it("keeps every rendered component actually imported", () => {
    // The same regex incident also stripped a `const` the JSX still referenced.
    // A rendered identifier with no import is a runtime ReferenceError.
    // The lookbehind matters: without it this also matches TYPE PARAMETERS
    // like `useFreezeOffscreen<HTMLDivElement>()`, which are not JSX and are
    // never imported. A JSX tag is preceded by whitespace, `(`, `{` or `>`;
    // a generic is preceded by an identifier character.
    const rendered = [...INDEX.matchAll(/(?<=[\s({>])<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map(
      (m) => m[1],
    );
    const missing = [...new Set(rendered)].filter(
      (name) =>
        !new RegExp(`import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}`, "s").test(INDEX) &&
        !new RegExp(`import\\s+${name}\\b`).test(INDEX),
    );
    expect(missing).toEqual([]);
  });
});
