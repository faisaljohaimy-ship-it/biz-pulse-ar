// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type LockedPackage = { version?: string };
const root = resolve(import.meta.dirname, "../..");
const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8")) as {
  packages: Record<string, LockedPackage>;
};
const parsers = Object.entries(lock.packages).filter(
  ([path]) => path.endsWith("/node_modules/body-parser") || path === "node_modules/body-parser",
);

describe("GHSA-27r3-jxmh-p828 dependency regression", () => {
  it("locks body-parser 2.x at 2.4.0 or newer", () => {
    expect(parsers.length).toBeGreaterThan(0);
    for (const [, pkg] of parsers) {
      expect(pkg.version).toBeDefined();
      if (pkg.version?.startsWith("2.")) {
        expect(Number(pkg.version.split(".")[1])).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("installs the same patched versions recorded in the lockfile", () => {
    for (const [path, pkg] of parsers) {
      const installed = JSON.parse(
        readFileSync(resolve(root, path, "package.json"), "utf8"),
      ) as LockedPackage;
      expect(installed.version).toBe(pkg.version);
      if (installed.version?.startsWith("2.")) {
        expect(Number(installed.version.split(".")[1])).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
