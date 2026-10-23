import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_FILM_REVISIONS, brandFilmSource } from "./brand-film-assets";

describe("brand film cache fingerprints", () => {
  for (const [path, revision] of Object.entries(BRAND_FILM_REVISIONS)) {
    it(`versions the actual bytes of ${path}`, () => {
      const bytes = readFileSync(`public${path}`);
      const hash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
      expect(revision).toBe(hash);
      expect(brandFilmSource(path)).toBe(`${path}?v=${hash}`);
    });
  }
});
