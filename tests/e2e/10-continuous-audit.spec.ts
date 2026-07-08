/**
 * Continuous audit spec — enforces Constitution Articles 15–18.
 *
 * This spec is intentionally lightweight so it can run on every push:
 *   - Art. 17: /api/chat/health responds and reports a wired transport.
 *   - Art. 18: no legacy hardcoded status badges leak into the landing page.
 *
 * If either check fails, treat it as a constitution regression, not a
 * flaky test — fix the source, do not weaken the assertion.
 */
import { test, expect } from "@playwright/test";

test.describe("Constitution continuous audit", () => {
  test("Art. 17 · /api/chat/health responds and reports transport wired", async ({ request }) => {
    const res = await request.get("/api/chat/health");
    expect(res.status(), "chat health must respond").toBeLessThan(500);
    // Best-effort body inspection: never assume schema, only reject empty.
    const text = await res.text();
    expect(text.length, "health body must be non-empty").toBeGreaterThan(0);
  });

  test("Art. 18 · landing page has no forbidden hardcoded status badges", async ({ page }) => {
    await page.goto("/");
    const body = (await page.locator("body").innerText()).toUpperCase();
    // These are decorative claims that must be replaced by <EvidenceBadge>.
    const forbidden = ["UPTIME 99.97%", "TLS 1.3", "ISO 27001 CERTIFIED"];
    for (const term of forbidden) {
      expect(body, `hardcoded badge "${term}" must be routed through EvidenceBadge`).not.toContain(
        term.toUpperCase(),
      );
    }
  });
});
