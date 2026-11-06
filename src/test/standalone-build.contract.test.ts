// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("vite.config.ts", "utf8");

describe("standalone SADEED build contract", () => {
  it("owns the build configuration instead of invoking the Lovable wrapper", () => {
    expect(config).not.toMatch(/from\s+["']@lovable\.dev\/vite-tanstack-config["']/);
    for (const module of [
      "vite",
      "@tailwindcss/vite",
      "vite-tsconfig-paths",
      "@tanstack/react-start/plugin/vite",
      "nitro/vite",
      "@vitejs/plugin-react",
    ]) {
      expect(config).toContain(`from "${module}"`);
    }
  });

  it("retains the custom SSR entry and strict client/server import protection", () => {
    expect(config).toContain('server: { entry: "server" }');
    expect(config).toContain('behavior: "error"');
    expect(config).toContain('files: ["**/server/**"]');
    expect(config).toContain('specifiers: ["server-only"]');
  });

  it("keeps Nitro build-only and preserves Vercel and local SSR targets", () => {
    expect(config).toContain('command === "build"');
    expect(config).toContain('defaultPreset: "cloudflare-module"');
    expect(config).toContain('preset: "vercel"');
    expect(config).toContain("process.env.VERCEL");
  });

  it("keeps MCP, environment scoping, SSR externalization and bundle safeguards", () => {
    expect(config).toContain("mcpPlugin()");
    expect(config).toContain('loadEnv(mode, process.cwd(), "VITE_")');
    expect(config).toContain('css: { transformer: "lightningcss" }');
    expect(config).toContain("sourcemap: false");
    expect(config).toContain('"@tanstack/query-core"');
    expect(config).toContain('"@shikijs/engine-oniguruma"');
    expect(config).toContain('"motion-vendor"');
  });
});
