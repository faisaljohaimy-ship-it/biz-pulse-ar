import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/public/health returns real shape", async ({ request }) => {
    const res = await request.get("/api/public/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["ok", "degraded", "down"]).toContain(body.status);
    expect(body).toHaveProperty("timestamp");
    expect(new Date(body.timestamp).toString()).not.toBe("Invalid Date");
    expect(body).toHaveProperty("subsystems");
    expect(body.subsystems).toHaveProperty("db");
    expect(body.subsystems.db).toHaveProperty("status");
  });
});
