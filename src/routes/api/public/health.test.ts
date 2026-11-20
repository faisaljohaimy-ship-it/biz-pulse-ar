/**
 * `/api/public/health` يسمّي مخزن حدّ المعدّل تبعيةً مستقلة (VIBE 5.1):
 * حين يسقط يظهر «down» باسمه مع حالة القاطع وسياسة التدهور — لا يُدفن في «db».
 * وفحص القاعدة نفسه محدود بمهلة: قاعدةٌ لا تجيب ⇐ «down/timeout» لا تعليق.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");

const db = vi.hoisted(() => ({
  hang: false,
  errorMessage: "",
  throwMessage: "",
  signal: null as AbortSignal | null,
}));

vi.mock("@supabase/supabase-js", () => {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => {
          if (!db.hang) resolve({ error: db.errorMessage ? { message: db.errorMessage } : null });
        };
      }
      if (prop === "abortSignal") {
        return (signal: AbortSignal) => {
          db.signal = signal;
          return chain;
        };
      }
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    createClient: () => {
      if (db.throwMessage) throw new Error(db.throwMessage);
      return { from: () => chain };
    },
  };
});

const gate = vi.hoisted(() => ({
  unavailable: false,
  state: "closed" as "closed" | "open" | "half-open",
  throwMessage: "",
}));

vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => {
    if (gate.throwMessage) throw new Error(gate.throwMessage);
    return gate.unavailable ? { allowed: false, unavailable: true } : { allowed: true };
  },
  rateLimitStorageState: () => ({
    state: gate.state,
    consecutiveFailures: gate.unavailable ? 2 : 0,
    openedAt: null,
    lastFailureAt: null,
    lastSuccessAt: null,
  }),
  gateDegradedMode: () => "bounded",
}));

afterAll(() => vi.unstubAllEnvs());

type Handler = (args: { request: Request }) => Promise<Response>;
type Body = {
  status: string;
  build: { sha: string; ref: string; built_at: string | null; source: string } | null;
  subsystems: Record<string, { status: string; detail?: string; latency_ms?: number }>;
};
async function get() {
  const mod = (await import("@/routes/api/public/health")) as unknown as {
    Route: { options: { server: { handlers: { GET: Handler } } } };
    HEALTH_DB_DEADLINE_MS: number;
  };
  const res = await mod.Route.options.server.handlers.GET({
    request: new Request("http://local/api/public/health"),
  });
  return { res, body: (await res.json()) as Body, deadline: mod.HEALTH_DB_DEADLINE_MS };
}

beforeEach(() => {
  gate.unavailable = false;
  gate.state = "closed";
  db.hang = false;
  db.signal = null;
  db.errorMessage = "";
  db.throwMessage = "";
  gate.throwMessage = "";
});

describe("مخزن حدّ المعدّل في فحص الصحّة", () => {
  it("المخزن يجيب ⇐ ok مع حالة القاطع", async () => {
    const { res, body } = await get();
    expect(res.status).toBe(200);
    expect(body.subsystems.rate_limit_storage.status).toBe("ok");
    expect(body.subsystems.rate_limit_storage.detail).toContain("breaker=closed");
    expect(body.subsystems.db.status).toBe("ok");
    expect(db.signal).toBeInstanceOf(AbortSignal);
    expect(db.signal?.aborted).toBe(false);
  });

  it("المخزن ساقط والقاطع مفتوح ⇐ down باسمه، والحالة الكلّية 503", async () => {
    gate.unavailable = true;
    gate.state = "open";
    const { res, body } = await get();
    expect(res.status).toBe(503);
    expect(body.status).toBe("down");
    expect(body.subsystems.rate_limit_storage.status).toBe("down");
    expect(body.subsystems.rate_limit_storage.detail).toContain("breaker=open");
    expect(body.subsystems.rate_limit_storage.detail).toContain("degraded_mode=bounded");
  });
});

describe("معرّف البناء", () => {
  it("حقل `build` حاضرٌ دائمًا: ختم البناء إن كُتب، وإلا null صادق لا رقم مختلَق", async () => {
    const { body } = await get();
    expect("build" in body).toBe(true);
    if (body.build) {
      expect(body.build.sha).toMatch(/^([0-9a-f]{7,40}|unknown)$/i);
      expect(typeof body.build.ref).toBe("string");
      expect(typeof body.build.source).toBe("string");
    } else {
      expect(body.build).toBeNull();
    }
  });
});

describe("فحص القاعدة لا يعلق", () => {
  it("قاعدةٌ تقبل ولا تجيب ⇐ db down/timeout خلال المهلة، والفحص كلّه يردّ", async () => {
    db.hang = true;
    const t0 = Date.now();
    const { res, body, deadline } = await get();
    const elapsed = Date.now() - t0;
    expect(res.status).toBe(503);
    expect(body.subsystems.db).toMatchObject({ status: "down", detail: "timeout" });
    expect(db.signal).toBeInstanceOf(AbortSignal);
    expect(db.signal?.aborted).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(deadline - 50);
    expect(elapsed).toBeLessThan(deadline + 1_500);
  }, 10_000);
});

describe("anonymous health diagnostics never expose backend error messages", () => {
  const privateMarker = "PRIVATE_BACKEND_DETAIL_DO_NOT_EXPORT";

  it("redacts query failures while preserving the degraded signal", async () => {
    db.errorMessage = `relation hidden.table_${privateMarker} is inaccessible`;
    const { res, body } = await get();
    expect(res.status).toBe(200);
    expect(body.subsystems.db).toMatchObject({
      status: "degraded",
      detail: "query_failed",
    });
    expect(JSON.stringify(body)).not.toContain(privateMarker);
  });

  it("redacts database client exceptions while reporting a 503", async () => {
    db.throwMessage = `connection string exposed: ${privateMarker}`;
    const { res, body } = await get();
    expect(res.status).toBe(503);
    expect(body.subsystems.db).toMatchObject({
      status: "down",
      detail: "connection_failed",
    });
    expect(JSON.stringify(body)).not.toContain(privateMarker);
  });

  it("redacts rate-limit storage exceptions without hiding their outage", async () => {
    gate.throwMessage = `RPC internals: ${privateMarker}`;
    const { res, body } = await get();
    expect(res.status).toBe(503);
    expect(body.subsystems.rate_limit_storage).toMatchObject({
      status: "down",
      detail: "probe_failed",
    });
    expect(JSON.stringify(body)).not.toContain(privateMarker);
  });
});
