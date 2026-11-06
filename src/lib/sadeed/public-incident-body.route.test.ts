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

  it.each([
    ["kind", '{"kind":{"toString":null}}'],
    ["detail", '{"kind":"offline","detail":{"toString":null}}'],
    ["url", '{"kind":"offline","url":{"toString":null}}'],
    ["device_class", '{"kind":"offline","device_class":{"toString":null}}'],
    ["detail array", '{"kind":"offline","detail":[]}'],
  ])("rejects non-scalar %s without HTTP 500", async (_field, body) => {
    const response = await handler({ request: request(body) });
    expect(response.status).toBe(400);
    expect(fixture.insert).not.toHaveBeenCalled();
  });

  it("rejects objects without altering valid scalar telemetry", async () => {
    const response = await handler({
      request: request('{"kind":"offline","detail":123,"url":"/health","device_class":"ci"}'),
    });
    expect(response.status).toBe(202);
    expect(fixture.insert).toHaveBeenCalledWith({
      kind: "offline",
      detail: "123",
      url: "/health",
      device_class: "ci",
    });
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

  it("marks a resolved database write error as an audit warning without exposing details", async () => {
    const secret = "synthetic-private-db-error-from-test";
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockResolvedValue({ error: { message: secret } });
      const response = await handler({
        request: request('{"kind":"offline","detail":"test"}'),
      });
      expect(response.status).toBe(202);
      expect(fixture.audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "public.aria-incident.received", status: "warn" }),
      );
      expect(JSON.stringify(errorLog.mock.calls)).toContain("sink insert failed");
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(secret);
    } finally {
      errorLog.mockRestore();
    }
  });

  it("keeps the beacon nonfatal when the database throws, but audits a warning", async () => {
    const secret = "synthetic-private-db-exception-from-test";
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockRejectedValue(new Error(secret));
      const response = await handler({
        request: request('{"kind":"offline","detail":"test"}'),
      });
      expect(response.status).toBe(202);
      expect(fixture.audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "public.aria-incident.received", status: "warn" }),
      );
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(secret);
    } finally {
      errorLog.mockRestore();
    }
  });

  it("does not report successful persistence without an acknowledged insert result", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fixture.insert.mockResolvedValue(undefined);
      const response = await handler({
        request: request('{"kind":"offline","detail":"test"}'),
      });
      expect(response.status).toBe(202);
      expect(fixture.audit).toHaveBeenCalledWith(expect.objectContaining({ status: "warn" }));
    } finally {
      errorLog.mockRestore();
    }
  });

  it("keeps successful persistence marked as ok in the executive audit", async () => {
    const response = await handler({
      request: request('{"kind":"offline","detail":"test"}'),
    });
    expect(response.status).toBe(202);
    expect(fixture.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "public.aria-incident.received", status: "ok" }),
    );
  });

  it("records the real Sadeed incident route in the accepted-beacon audit", async () => {
    const response = await handler({ request: request('{"kind":"offline","detail":"test"}') });
    expect(response.status).toBe(202);
    expect(fixture.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public.aria-incident.received",
        surface: "api/public/hooks/sadeed-incident",
      }),
    );
  });

  it("records the real Sadeed incident route in the throttled-beacon audit", async () => {
    fixture.quota.mockResolvedValue({ allowed: false });
    const response = await handler({ request: request('{"kind":"offline","detail":"test"}') });
    expect(response.status).toBe(429);
    expect(fixture.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public.aria-incident.throttled",
        surface: "api/public/hooks/sadeed-incident",
      }),
    );
  });
});
