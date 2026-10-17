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

  it("keeps the glow but drops the dip under reduced motion — both variants", () => {
    expect(tokens).toMatch(
      /\.nx-holo-icon:active,\s*\.nx-holo-icon-scrim:active\s*\{\s*scale:\s*1;/,
    );
  });
});

describe("adoption — icon controls carry no glass fill", () => {
  // بوابة SADEED كانت هنا. أزال المالك أيقونة «تحدث الآن» صراحةً — نصّه في
  // d4ac6a2، والحذف في 4d1789b — فلم يبقَ في الملف زرٌّ أيقوني أصلًا: نداؤه
  // الوحيد اليوم رابط نصّي معنون. إبقاؤه في قائمة «أسطح تحمل أيقونات» كان
  // يطالب ملفًا بلا أيقونة أن يحمل معالجة أيقونة، فيسقط الفحص على قرار لا
  // على عطل. الثابت الذي وُجد لأجله لم يُلغَ — نُقل إلى فحصه الخاص أدناه.
  const iconSurfaces = [
    "src/components/cockpit/header.tsx",
    "src/components/cockpit/events.tsx",
    "src/components/cockpit/experience-bar.tsx",
    "src/components/cockpit/map.tsx",
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
});

describe("internal pages — icon chips carry the holographic edge", () => {
  const pages = [
    "src/routes/trust.tsx",
    "src/routes/security.tsx",
    "src/routes/aup.tsx",
    "src/routes/dpa.tsx",
    "src/routes/cookie-policy.tsx",
    "src/routes/subprocessors.tsx",
    "src/routes/responsible-ai.tsx",
    "src/routes/_authenticated/learn.index.tsx",
  ];

  it("every internal page adopted the treatment", () => {
    for (const p of pages) {
      expect(read(p), `${p} should adopt nx-holo-icon`).toContain("nx-holo-icon");
    }
  });

  it("semantic tint is preserved by re-tinting, not overwritten with cyan", () => {
    // Amber compliance chips stay amber; cyan learning chips stay cyan.
    expect(read("src/routes/trust.tsx")).toContain("[--nx-holo-rgb:251_191_36]");
    // ٢٠٢٦/٠٨/٢٤ — صفحة /situation-room دُمجت في /sec وصارت إعادة توجيه،
    // فلم يبقَ فيها رقاقة أيقونة تُفحص.
  });

  it("no icon chip kept its filled background", () => {
    expect(read("src/routes/trust.tsx")).not.toContain("rounded-lg bg-amber-400/10 text-amber-200");
  });
});

describe("media-overlay variant keeps a legibility scrim", () => {
  it("video controls use the scrim variant, not the transparent one", () => {
    const show = read("src/routes/executive-showcase.tsx");
    expect(show).toContain("nx-holo-icon-scrim");
    expect(show).not.toContain("bg-black/40 text-white/80 backdrop-blur");
  });

  it("the scrim variant retains a background (contrast over bright frames)", () => {
    const block = tokens.slice(tokens.indexOf("@utility nx-holo-icon-scrim"));
    const body = block.slice(0, block.indexOf("\n}\n"));
    expect(body).toMatch(/background-color:\s*rgb\(2 8 17/);
    expect(body).toContain("var(--nx-holo-press)");
  });
});
