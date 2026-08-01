/**
 * ملف القفل — حارس العقد.
 *
 * WHY THIS EXISTS, WITH THE INCIDENT THAT CAUSED IT
 * The repo carried BOTH `bun.lock` and `package-lock.json` for a while. That
 * is not a tidiness complaint — it is a live break, and it broke:
 *
 *   1. A platform bot bumped two devDependencies in `package.json`.
 *   2. Its tooling regenerated `bun.lock` to match.
 *   3. `package-lock.json` was left on the OLD versions.
 *   4. CI runs `npm ci` in three places, and `npm ci` refuses to install when
 *      the lockfile disagrees with `package.json`:
 *        "lock file's @lovable.dev/vite-tanstack-config@2.8.2 does not
 *         satisfy @lovable.dev/vite-tanstack-config@2.8.5"
 *
 * So `main` was unbuildable, and nothing in the test suite noticed — the break
 * lives in the install step, upstream of every test. Two lockfiles means one of
 * them is always the stale one, and which tool updates which is not something
 * anyone can hold in their head.
 *
 * This guard therefore asserts two things a human would otherwise have to
 * remember: npm is the package manager, and its lockfile agrees with the
 * manifest. It reads the files rather than shelling out to `npm ci`, so it
 * costs milliseconds and runs in the ordinary unit-test pass.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

/** Every lockfile shape a JS package manager can leave behind. */
const FOREIGN_LOCKFILES = ["bun.lock", "bun.lockb", "pnpm-lock.yaml", "yarn.lock"] as const;

describe("exactly one package manager owns this repo", () => {
  it("npm's lockfile is present", () => {
    expect(existsSync(join(ROOT, "package-lock.json"))).toBe(true);
  });

  it("no other package manager's lockfile is committed", () => {
    // The evidence npm is the owner: `packageManager` names it, `engines.npm`
    // constrains it, and ci.yml + deploy.yml + vercel.json all run `npm ci`.
    const present = FOREIGN_LOCKFILES.filter((f) => existsSync(join(ROOT, f)));
    expect(
      present,
      `a second lockfile guarantees one of them goes stale — see this file's header`,
    ).toEqual([]);
  });

  it("package.json still declares npm as the package manager", () => {
    const pkg = read("package.json");
    expect(pkg.packageManager ?? "").toMatch(/^npm@/);
  });

  /**
   * The check above DETECTS a second lockfile. This one checks that it cannot
   * be committed in the first place.
   *
   * The distinction earned itself: `bun.lock` was deleted once, and a platform
   * bot restored it within minutes because its tooling regenerates the file and
   * `git add -A` swept it back in. Detection alone buys a red CI run per cycle;
   * the ignore rule ends the cycle. Both are kept — the ignore prevents, the
   * check catches anyone who force-adds past it.
   */
  it(".gitignore prevents a second lockfile from being committed at all", () => {
    const ignored = readFileSync(join(ROOT, ".gitignore"), "utf8")
      .split("\n")
      .map((l) => l.trim());
    for (const f of FOREIGN_LOCKFILES) {
      expect(ignored, `.gitignore must list ${f} — see this file's header`).toContain(f);
    }
    // …and must NOT ignore npm's own lockfile, which has to stay tracked.
    expect(ignored).not.toContain("package-lock.json");
  });
});

describe("the lockfile agrees with the manifest", () => {
  const pkg = read("package.json");
  const lock = read("package-lock.json");
  const declared: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  /**
   * Compare only EXACT pins (`"2.8.5"`). Ranges like `^1.2.0` are satisfiable
   * by many resolved versions, and re-implementing semver here would be a
   * second, weaker copy of npm's own resolver. Exact pins are where the real
   * desync happened: both broken packages were pinned.
   */
  const exactPins = Object.entries(declared).filter(([, range]) => /^\d+\.\d+\.\d+/.test(range));

  it("has exact pins to check — an empty set would prove nothing", () => {
    expect(exactPins.length).toBeGreaterThan(0);
  });

  it("every exactly-pinned dependency resolves to that version in the lockfile", () => {
    const mismatches: string[] = [];
    for (const [name, want] of exactPins) {
      const entry = lock.packages?.[`node_modules/${name}`];
      if (!entry) {
        mismatches.push(`${name}: absent from package-lock.json`);
        continue;
      }
      if (entry.version !== want) {
        mismatches.push(`${name}: package.json wants ${want}, lock has ${entry.version}`);
      }
    }
    expect(
      mismatches,
      `npm ci will refuse to install:\n${mismatches.join("\n")}\nRun: npm install --package-lock-only`,
    ).toEqual([]);
  });

  it("the lockfile describes this package", () => {
    // Catches a lockfile copied in from another project — a rarer but nastier
    // version of the same class of fault.
    expect(lock.name).toBe(pkg.name);
  });
});
