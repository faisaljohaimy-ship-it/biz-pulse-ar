import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/public/health reports readiness and correct HTTP status", async ({ request }) => {
    const res = await request.get("/api/public/health");
    const body = await res.json();

    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["content-type"]).toContain("application/json");
    expect(body).toHaveProperty("status");
    expect(["ok", "degraded", "down"]).toContain(body.status);
    expect(body).toHaveProperty("timestamp");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    expect(body).toHaveProperty("subsystems");
    expect(body.subsystems).toHaveProperty("db");
    expect(body.subsystems.db).toHaveProperty("status");
    expect(body.subsystems).toHaveProperty("rate_limit_storage");
    expect(body.subsystems.web.status).toBe("ok");

    const statuses = Object.values(
      body.subsystems as Record<string, { status: string }>,
    ).map((subsystem) => subsystem.status);
    for (const status of statuses) {
      expect(["ok", "degraded", "down", "unknown"]).toContain(status);
    }
    const expectedStatus = statuses.includes("down")
      ? "down"
      : statuses.includes("degraded")
        ? "degraded"
        : "ok";
    expect(body.status).toBe(expectedStatus);
    // A real dependency outage is a readiness failure (503), not a server 500.
    // Missing CI credentials must not turn an intentional fail-closed response
    // into a false E2E failure or allow an incorrect success status.
    expect(res.status()).toBe(expectedStatus === "down" ? 503 : 200);
  });

  test("GET /api/public/live remains available when dependencies are unhealthy", async ({
    request,
  }) => {
    const res = await request.get("/api/public/live");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("no-store");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("live");
    expect(body).toHaveProperty("build");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
  });
});
