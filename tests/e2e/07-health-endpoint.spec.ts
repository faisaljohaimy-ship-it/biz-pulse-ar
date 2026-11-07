import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/public/health returns real shape", async ({ request }) => {
    const res = await request.get("/api/public/health");
    const body = await res.json();

    // This unprivileged PR runner intentionally has no DB/admin secrets.
    // Require a precise fail-closed 503 only there. Configured weekly and
    // production targets must still return 200, not an arbitrary server error.
    if (process.env.SADEED_EXPECT_UNCONFIGURED_HEALTH === "1") {
      expect(res.status(), "unconfigured rate-limit storage must fail closed").toBe(503);
      expect(body).toMatchObject({
        status: "down",
        subsystems: {
          db: { status: "unknown", detail: "not_configured" },
          rate_limit_storage: { status: "down" },
        },
      });
    } else {
      expect(res.status(), "configured health must be available").toBe(200);
      expect(["ok", "degraded"]).toContain(body.status);
    }
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(body).toHaveProperty("status");
    expect(["ok", "degraded", "down"]).toContain(body.status);
    expect(body).toHaveProperty("timestamp");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    expect(body).toHaveProperty("subsystems");
    expect(body.subsystems).toHaveProperty("db");
    expect(body.subsystems.db).toHaveProperty("status");
  });
});
