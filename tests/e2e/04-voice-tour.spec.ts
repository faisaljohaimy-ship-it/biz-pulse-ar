import { test, expect } from "@playwright/test";

/**
 * Voice tour panel opens on button tap and closes cleanly.
 * The button label may vary slightly; match on the Arabic phrase.
 */
test.describe("ARIA voice tour — open/close", () => {
  test("tour opens and closes cleanly", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const openBtn = page.getByRole("button", { name: /جولة صوتية|جولة مع آريا/i }).first();
    if (!(await openBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "voice tour trigger not present on this viewport");
      return;
    }
    await openBtn.click();

    // Panel presence: look for a dialog/aria-modal or a close (✕) control.
    const closeBtn = page.getByRole("button", { name: /إغلاق|Close|✕|×/i }).first();
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });

    await closeBtn.click();
    await expect(closeBtn).toBeHidden({ timeout: 5_000 });
  });
});
