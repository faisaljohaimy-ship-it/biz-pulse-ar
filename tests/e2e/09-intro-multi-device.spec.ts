/**
 * ARIA Cinematic Intro — Cross-Device Rendering Constitution enforcement.
 *
 * Guards FR-1..FR-8 in docs/ARIA_INTRO_CONSTITUTION.md. Any regression here
 * MUST fail CI and block merge. Do NOT weaken these assertions without a
 * documented constitutional amendment.
 */
import { test, expect, devices } from "@playwright/test";

type Vp = { name: string; width: number; height: number; expectFit: "cover" | "contain" };

const VIEWPORTS: readonly Vp[] = [
  { name: "mobile-portrait-390",  width: 390,  height: 844,  expectFit: "cover"   },
  { name: "mobile-portrait-440",  width: 440,  height: 799,  expectFit: "cover"   },
  { name: "mobile-landscape",     width: 844,  height: 390,  expectFit: "contain" },
  { name: "tablet-portrait",      width: 1024, height: 1366, expectFit: "contain" },
  { name: "laptop-1440",          width: 1440, height: 900,  expectFit: "contain" },
  { name: "desktop-1920",         width: 1920, height: 1080, expectFit: "contain" },
];

for (const vp of VIEWPORTS) {
  test.describe(`intro @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("renders per constitution", async ({ page, context }) => {
      // Fresh session — intro must show.
      await context.clearCookies();
      await page.addInitScript(() => {
        try { window.sessionStorage.removeItem("nexios-welcome"); } catch { /* noop */ }
        try { window.localStorage.removeItem("aria_intro_seen_v1"); } catch { /* noop */ }
      });

      const start = Date.now();
      await page.goto("/", { waitUntil: "domcontentloaded" });

      // FR-3/FR-5: intro dialog must be visible within 500ms of DOM ready.
      const intro = page.getByRole("dialog", { name: /cinematic intro|مقدّمة/i });
      await expect(intro).toBeVisible({ timeout: 500 });
      expect(Date.now() - start).toBeLessThan(1500);

      // FR-1/FR-2: object-fit matches device class.
      const video = intro.locator("video").nth(1); // foreground video (index 0 is blurred bg)
      const fit = await video.evaluate((el) => getComputedStyle(el as HTMLElement).objectFit);
      expect(fit).toBe(vp.expectFit);

      // FR-4: Skip button reachable (not clipped by notch / off-screen).
      const skip = intro.getByRole("button", { name: /skip|تخطّي/i });
      await expect(skip).toBeVisible();
      const box = await skip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(8);
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);

      // FR-5: intro MUST NOT auto-dismiss before MIN_DISPLAY_MS (3500ms).
      await page.waitForTimeout(1200);
      await expect(intro).toBeVisible();

      // FR-7: after Skip + reload, session guard prevents re-show.
      await skip.click();
      await page.waitForTimeout(700);
      await expect(intro).toBeHidden({ timeout: 1500 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("dialog", { name: /cinematic intro|مقدّمة/i }))
        .toHaveCount(0, { timeout: 1500 });
    });
  });
}
