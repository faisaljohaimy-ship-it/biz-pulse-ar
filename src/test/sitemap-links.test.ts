import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("published static sitemap excludes verified missing routes", () => {
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  for (const path of ["/about", "/os"]) {
    it(`does not advertise ${path}, which returns 404`, () => {
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (match) => new URL(match[1]).pathname,
      );
      expect(urls).not.toContain(path);
    });
  }
});
