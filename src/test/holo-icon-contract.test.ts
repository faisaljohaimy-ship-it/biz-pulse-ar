/**
 * Holographic icon contract — the system-wide icon treatment.
 *
 * The rule this pins: an icon control carries NO glass fill. Its identity is a
 * glowing holographic EDGE in the glass tint, its glyph glows in the same
 * tint, and pressing it produces a real response (edge saturates, halo blooms,
 * control dips). Enforced by reading the token sheet and the components, so a
 * future edit that reintroduces a frosted panel behind an icon fails here.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const tokens = read("src/styles/nx-tokens.css");

describe("nx-holo-icon utility — the token contract", () => {
  it("declares the holographic tint and its three intensity steps", () => {
    expect(tokens).toContain("--nx-holo-rgb");
    expect(tokens).toContain("--nx-holo-rest");
    expect(tokens).toContain("--nx-holo-hover");
    expect(tokens).toContain("--nx-holo-press");
  });

  it("removes the glass fill: transparent background, no backdrop blur", () => {
    const block = tokens.slice(tokens.indexOf("@utility nx-holo-icon"));
    const body = block.slice(0, block.indexOf("\n}\n"));
    expect(body).toContain("background-color: transparent");
    expect(body).toContain("backdrop-filter: none");
    expect(body).not.toContain("blur(var(--nx-blur");
  });

  it("glows the glyph itself and reacts on press", () => {
    const block = tokens.slice(tokens.indexOf("@utility nx-holo-icon"));
    const body = block.slice(0, block.indexOf("\n}\n"));
    expect(body).toContain("drop-shadow");
    expect(body).toContain("&:active");
    expect(body).toContain("var(--nx-holo-press)");
  });

  it("dips with the standalone `scale` property, never `transform`", () => {
    // transform would erase the translate(-50%,-50%) that centres several of
    // these controls; scale composes with an existing transform instead.
    const block = tokens.slice(tokens.indexOf("@utility nx-holo-icon"));
    // Strip CSS comments first — the explanatory note inside this very block
    // quotes `transform: scale()` as the thing we must NOT emit.
    const body = block.slice(0, block.indexOf("\n}\n")).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).toContain("scale: 0.94");
    expect(body).not.toMatch(/transform:\s*scale/);
  });

  it("keeps the glow but drops the dip under reduced motion", () => {
    expect(tokens).toMatch(/\.nx-holo-icon:active\s*\{\s*scale:\s*1;/);
  });
});

describe("adoption — icon controls carry no glass fill", () => {
  const iconSurfaces = [
    "src/components/cockpit/header.tsx",
    "src/components/cockpit/events.tsx",
    "src/components/cockpit/experience-bar.tsx",
    "src/components/cockpit/map.tsx",
    "src/components/home/FinnHolographicPortal.tsx",
    "src/components/home/FourRegionHub.tsx",
  ];

  it("every listed surface uses the holographic treatment", () => {
    for (const file of iconSurfaces) {
      expect(read(file), `${file} should adopt nx-holo-icon`).toContain("nx-holo-icon");
    }
  });

  it("no fixed-size icon button anywhere still wears a glass panel", () => {
    for (const file of iconSurfaces) {
      const src = read(file);
      // e.g. `nx-glass-e1 … inline-flex size-11` — the old icon-chip recipe.
      expect(src, `${file} still has a glass icon button`).not.toMatch(
        /nx-glass-e1[^"']*(?:inline-flex\s+size-11|size-11\s+items-center)/,
      );
    }
  });

  it("FINN's talk control lost its opaque disc and gained the holo edge", () => {
    const finn = read("src/components/home/FinnHolographicPortal.tsx");
    const talk = finn.slice(finn.indexOf("Talk to FINN now"));
    const cls = talk.slice(0, talk.indexOf(">"));
    expect(cls).toContain("nx-holo-icon");
    expect(cls).not.toContain("bg-[#061525]");
  });
});
