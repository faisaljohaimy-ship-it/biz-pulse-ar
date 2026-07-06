import { test, expect } from "@playwright/test";

test.describe("Landing page — clean load", () => {
  test("renders without console errors and contains Arabic branded copy", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Text body must contain the Arabic comma phrase.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("الذكاء،");

    // Internal asset paths must not appear as visible text nodes.
    expect(bodyText).not.toContain("/aria-hero-motion.mp4");
    expect(bodyText).not.toContain("/hajj-prime");

    // Filter noise: 3rd-party asset 404s, network aborts, etc. Only block genuine JS errors.
    const meaningful = errors.filter(
      (e) => !/favicon|Network|abort|Failed to load resource/i.test(e),
    );
    expect(meaningful, `unexpected console errors:\n${meaningful.join("\n")}`).toEqual([]);
  });
});
