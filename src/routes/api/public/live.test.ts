/**
 * `/api/public/live`: حياةٌ لا جاهزية — 200 بلا أي شبكة، ومعه ختم البناء أو null صادق.
 */
import { describe, expect, it, vi } from "vitest";

type Handler = () => Promise<Response>;

describe("GET /api/public/live", () => {
  it("يجيب 200 بلا لمس قاعدة أو مخزن، ويحمل ختم البناء بالشكل نفسه الذي يعرضه health", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("live must not touch the network");
    });
    const mod = (await import("@/routes/api/public/live")) as unknown as {
      Route: { options: { server: { handlers: { GET: Handler } } } };
    };
    const res = await mod.Route.options.server.handlers.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as {
      ok: boolean;
      status: string;
      build: { sha: string; ref: string; built_at: string | null; source: string } | null;
      timestamp: string;
    };
    expect(body.ok).toBe(true);
    expect(body.status).toBe("live");
    expect("build" in body).toBe(true);
    if (body.build) {
      expect(body.build.sha).toMatch(/^([0-9a-f]{7,40}|unknown)$/i);
      expect(typeof body.build.ref).toBe("string");
    } else {
      expect(body.build).toBeNull();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
