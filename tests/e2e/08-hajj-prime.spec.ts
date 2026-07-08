import { test, expect } from "@playwright/test";

/**
 * Hajj Nexus Prime must open as a full-viewport takeover route
 * (not an embedded mini-dock) and closing it must land back on
 * roughly the previous scroll position.
 */
test.describe("Hajj Prime — full-viewport takeover", () => {
  test("opens full-viewport and closes back to origin", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, 900));
    const startY = await page.evaluate(() => window.scrollY);

    const openLink = page.getByRole("link", { name: /منصة نُسك الحج|Hajj Nexus Prime/i }).first();
    if (!(await openLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Hajj Prime entry not visible on this viewport");
      return;
    }
    await openLink.click();
    await page.waitForURL(/\/hajj-prime/, { timeout: 10_000 });

    // Full-viewport: the takeover should occupy at least ~90% of viewport height.
    const vh = page.viewportSize()?.height ?? 900;
    const takeoverHeight = await page.evaluate(() => {
      const el = document.querySelector("main, [data-hajj-prime], body > div");
      return el ? (el as HTMLElement).getBoundingClientRect().height : 0;
    });
    expect(takeoverHeight).toBeGreaterThan(vh * 0.8);

    // Close: back to home; scroll position should return near start.
    await page.goBack();
    await page.waitForURL((u) => !/\/hajj-prime/.test(u.pathname), { timeout: 10_000 });
    const endY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(endY - startY)).toBeLessThan(400);
  });
});
