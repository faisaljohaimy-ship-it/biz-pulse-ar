import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  auth: vi.fn(),
  org: vi.fn(),
  delta: vi.fn(),
  greeting: vi.fn(),
  interrupt: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
  rateLimitResponse: () => new Response(null, { status: 429 }),
  rateLimitUnavailableResponse: () => new Response(null, { status: 503 }),
}));
vi.mock("@/lib/sadeed/require-bearer.server", () => ({ requireBearerUser: f.auth }));
vi.mock("@/lib/authz.server", () => ({ getCurrentOrgIdForUser: f.org }));
vi.mock("@/lib/sadeed/presence/since-last-visit.server", () => ({ computePresenceDelta: f.delta }));
vi.mock("@/lib/sadeed/presence/greeting.server", () => ({ composePresenceGreeting: f.greeting }));
vi.mock("@/lib/sadeed/presence/interruption.server", () => ({ detectInterruption: f.interrupt }));
vi.mock("@/lib/sadeed/presence/tiers.server", () => ({ readCursor: f.read, writeCursor: f.write }));
import { Route } from "@/routes/api/public/sadeed-presence";
const handlers = (
  Route as unknown as {
    options: {
      server: {
        handlers: {
          GET: (x: { request: Request }) => Promise<Response>;
          POST: (x: { request: Request }) => Promise<Response>;
        };
      };
    };
  }
).options.server.handlers;
const get = () =>
  new Request(
    "https://example.test/api/public/sadeed-presence?sid=shared&view=changes&org_id=untrusted-org",
  );

beforeEach(() => {
  vi.clearAllMocks();
  f.auth.mockResolvedValue({ userId: "account-a", token: "already-server-verified" });
  f.org.mockResolvedValue("org-a");
  f.delta.mockResolvedValue({ metrics: { incidentsResolved: 0 } });
  f.read.mockReturnValue(null);
  f.greeting.mockResolvedValue({
    greeting_en: "Hello",
    greeting_ar: "مرحبا",
    timeBand: "morning",
    delta: {},
    briefing: { priorities: [], health: {} },
  });
});

describe("existing presence endpoint verified scope", () => {
  it("uses server membership, not the client org hint, with no model/briefing work for changes view", async () => {
    const response = await handlers.GET({ request: get() });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(f.delta).toHaveBeenCalledWith(
      JSON.stringify(["account-a", "org-a", "shared"]),
      "org-a",
      "account-a",
    );
    expect(f.greeting).not.toHaveBeenCalled();
    expect(f.interrupt).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      accountId: "account-a",
      organizationId: "org-a",
      durableBaseline: false,
    });
  });
  it("invalidates cursor scope on account and organization changes even for the same sid", async () => {
    await handlers.GET({ request: get() });
    f.auth.mockResolvedValue({ userId: "account-b" });
    await handlers.GET({ request: get() });
    f.org.mockResolvedValue("org-b");
    await handlers.GET({ request: get() });
    expect(new Set(f.delta.mock.calls.map((call) => call[0])).size).toBe(3);
  });
  it("does not read or advance cursors without verified auth and org membership", async () => {
    f.auth.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    expect((await handlers.GET({ request: get() })).status).toBe(401);
    expect(f.org).not.toHaveBeenCalled();
    expect(f.delta).not.toHaveBeenCalled();
    f.auth.mockResolvedValue({ userId: "account-a" });
    f.org.mockResolvedValue(null);
    expect((await handlers.GET({ request: get() })).status).toBe(503);
    expect(f.delta).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  });
  it("POST heartbeat/seen refs use the same verified scope; extra org/role inputs grant nothing", async () => {
    const response = await handlers.POST({
      request: new Request("https://example.test/api/public/sadeed-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "shared",
          kind: "seen_incident",
          ref: "incident-a",
          orgId: "untrusted-org",
          role: "admin",
        }),
      }),
    });
    expect(response.status).toBe(200);
    expect(f.read).toHaveBeenCalledWith(JSON.stringify(["account-a", "org-a", "shared"]));
    expect(f.write).toHaveBeenCalledWith(
      JSON.stringify(["account-a", "org-a", "shared"]),
      expect.objectContaining({ lastSeenIncidentId: "incident-a" }),
    );
  });
  it("retains the original greeting response for legacy GET callers while isolating its cursor", async () => {
    const response = await handlers.GET({
      request: new Request("https://example.test/api/public/sadeed-presence?sid=shared"),
    });
    expect(response.status).toBe(200);
    expect(f.greeting).toHaveBeenCalledWith(
      JSON.stringify(["account-a", "org-a", "shared"]),
      "org-a",
    );
    expect(await response.json()).toMatchObject({
      greeting_en: "Hello",
      greeting_ar: "مرحبا",
      delta: {},
      top_priorities: [],
    });
  });
});
