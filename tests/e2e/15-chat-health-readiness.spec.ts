/**
 * Read-only HTTP regression for the chat health route.
 * Exercises the built local server with no production credentials or DB writes
 * beyond the route's existing fail-closed rate-limit storage probe.
 * The helper's single-flight/TTL semantics are separately covered by unit tests.
 */
import { test, expect } from "@playwright/test";

test.describe("Chat health HTTP contract", () => {
  test("concurrent health reads preserve response, gate and no-store semantics", async ({ request }) => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => request.get("/api/chat/health")),
    );
    for (const response of responses) {
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(["verified", "degraded", "closed"]).toContain(body.gate);
      expect(typeof body.key_present).toBe("boolean");
      expect(typeof body.zero_cost_ready).toBe("boolean");
      expect(typeof body.rag_ready).toBe("boolean");
      expect(typeof body.voice_configured).toBe("boolean");
      expect(body.retrieval).toEqual(
        expect.objectContaining({
          lexical_ready: expect.any(Boolean),
          vector_ready: expect.any(Boolean),
          embedding_provider: expect.any(String),
        }),
      );
    }
  });
});
