import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  quota: vi.fn(),
  insert: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({ enforceRateLimit: fixture.quota }));
vi.mock("@/lib/sadeed/public-incident-limit.server", () => ({
  allowIncidentDuringStorageOutage: () => false,
}));
vi.mock("@/lib/sadeed/audit-log.server", () => ({ logSadeedAction: fixture.audit }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: fixture.insert }) },
}));

import { Route } from "../../routes/api/public/hooks/sadeed-incident";
const handler = (
  Route as unknown as {
    server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } };
  }
).server.handlers.POST;
const request = (body: string) =>
  new Request("http://localhost/api/public/hooks/sadeed-incident", { method: "POST", body });

beforeEach(() => {
  vi.clearAllMocks();
  fixture.quota.mockResolvedValue({ allowed: true });
  fixture.insert.mockResolvedValue({ error: null });
  fixture.audit.mockResolvedValue(undefined);
});

describe("incident route body validation", () => {
  it.each(["null", "[]", "true", "{"])("returns 400, not 500, for %s", async (body) => {
    expect((await handler({ request: request(body) })).status).toBe(400);
    expect(fixture.insert).not.toHaveBeenCalled();
  });

  it("rejects an oversized body without Content-Length", async () => {
    const body = JSON.stringify({ kind: "offline", detail: "x".repeat(5000) });
    expect((await handler({ request: request(body) })).status).toBe(413);
    expect(fixture.insert).not.toHaveBeenCalled();
  });

  it("keeps the successful beacon response and persistence", async () => {
    const response = await handler({ request: request('{"kind":"offline","detail":"test"}') });
    expect(response.status).toBe(202);
    expect(fixture.insert).toHaveBeenCalledWith({
      kind: "offline",
      detail: "test",
      device_class: "desktop",
      url: null,
    });
  });

  it("preserves quota enforcement before attempting body parsing", async () => {
    fixture.quota.mockResolvedValue({ allowed: false });
    const req = request("null");
    const response = await handler({ request: req });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(req.bodyUsed).toBe(false);
    expect(fixture.insert).not.toHaveBeenCalled();
  });
});
