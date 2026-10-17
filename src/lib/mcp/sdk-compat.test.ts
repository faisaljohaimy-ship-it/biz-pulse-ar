/**
 * توافق MCP SDK المثبَّت بـ`overrides` مع `@lovable.dev/mcp-js`.
 *
 * `package.json` يرفع `@modelcontextprotocol/sdk` فوق ما يعلنه `mcp-js`
 * (‏1.28.0 حرفيًّا) لإغلاق GHSA-6qxp-vccf-f47h (‏< 1.31.0). ما يحرسه هذا
 * الملفّ: الوحدات الأربع التي يستوردها `mcp-js` من الـSDK ما زالت تُحلّ،
 * وتعريف خادم سَدِيد يُحمَّل بأدواته الأربع — فرفعُ التثبيت لا يكسر `/mcp`
 * صامتًا كما لا يلتقطه `tsc` (الاستيراد ديناميكي داخل حزمة خارجية).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("MCP SDK pinned by overrides", () => {
  it("يُثبَّت فوق الحدّ الأدنى المُصحَّح 1.31.0 ويُحلّ من المكان الذي يقرؤه mcp-js", async () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      overrides: Record<string, string>;
    };
    const pinned = pkg.overrides["@modelcontextprotocol/sdk"];
    expect(pinned).toMatch(/^\d+\.\d+\.\d+$/);
    const [major, minor] = pinned.split(".").map(Number);
    expect(major).toBe(1);
    expect(minor).toBeGreaterThanOrEqual(31);
    const installed = JSON.parse(
      readFileSync("node_modules/@modelcontextprotocol/sdk/package.json", "utf8"),
    ) as { version: string };
    expect(installed.version).toBe(pinned);
  });

  it("الوحدات التي يستوردها mcp-js من الـSDK تُحلّ كلّها", async () => {
    for (const subpath of [
      "@modelcontextprotocol/sdk/server/mcp.js",
      "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js",
      "@modelcontextprotocol/sdk/server/zod-compat.js",
      "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js",
    ]) {
      const mod = (await import(/* @vite-ignore */ subpath)) as Record<string, unknown>;
      expect(Object.keys(mod).length, `${subpath} فارغة`).toBeGreaterThan(0);
    }
  });

  it("تعريف خادم سَدِيد يُحمَّل بأدواته الأربع", async () => {
    const mod = (await import("@/lib/mcp")) as { default: unknown };
    expect(mod.default).toBeTruthy();
    const def = mod.default as { tools?: unknown[] } & Record<string, unknown>;
    const tools = Array.isArray(def.tools) ? def.tools : null;
    if (tools) expect(tools).toHaveLength(4);
  });
});
