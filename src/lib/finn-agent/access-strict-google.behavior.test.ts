// @vitest-environment node
/**
 * سلوك `getFinnAccess` تحت تشديد «Google وحده» (أمر المالك ٢٠٢٦/١٠/٣٠) — اختبارٌ سلوكي بتشغيل الدالة نفسها
 * (وقت بدء TanStack مُحاكى)، لا فحصُ نصٍّ. كتبه حارس الجودة نموذجًا وتبنّيناه: ينجح كاملًا على الشيفرة الحالية،
 * ويحمرّ عند عكس `!token || !sessionIsOAuth(token)` أو عند جعل غياب الرمز يمرّ (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = { auth: null as string | null, throwNoRequest: false };
vi.mock("@tanstack/react-start", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- محاكاة سلسلة createServerFn
  const chain: any = {
    middleware: () => chain,
    inputValidator: () => chain,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (fn: any) => (ctx: any) => fn({ context: ctx }),
  };
  return { createServerFn: () => chain, createMiddleware: () => ({ server: () => ({}) }) };
});
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => {
    if (sim.throwNoRequest) throw new Error("No StartEvent found in AsyncLocalStorage");
    return sim.auth === null
      ? undefined
      : new Request("https://x.test/", { headers: { authorization: sim.auth } });
  },
}));
vi.mock("@/integrations/supabase/optional-auth-middleware", () => ({ optionalSupabaseAuth: {} }));
vi.mock("./engine.server", () => ({
  readFinnEngineStatus: () => ({ gpt: true, gptModel: "m", fallback: false, paused: false }),
}));

const OWNER = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OTHER = "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const jwt = (sub: string, amr?: unknown) => {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "HS256" })}.${b(amr === undefined ? { sub } : { sub, amr })}.sig`;
};
const GOOGLE = [{ method: "oauth" }];
const PASSWORD = [{ method: "password" }];

import { getFinnAccess } from "./access.functions";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (userId: string | null) => (getFinnAccess as any)({ userId });

describe("getFinnAccess: strict Google switch (behaviour)", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.FINN_OWNER_USER_IDS = OWNER;
    delete process.env.FINN_REQUIRE_GOOGLE;
    sim.throwNoRequest = false;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("off: the owner enters with any login method, a non-owner never", async () => {
    for (const a of [jwt(OWNER, PASSWORD), jwt(OWNER, GOOGLE), jwt(OWNER)]) {
      sim.auth = `Bearer ${a}`;
      expect((await call(OWNER)).allowed).toBe(true);
    }
    expect((await call(OTHER)).allowed).toBe(false);
    expect((await call(null)).allowed).toBe(false);
  });

  it("on: only owner + oauth; everything else is denied with the same shape", async () => {
    process.env.FINN_REQUIRE_GOOGLE = "1";
    sim.auth = `Bearer ${jwt(OWNER, [{ method: "token_refresh" }, { method: "oauth" }])}`;
    expect((await call(OWNER)).allowed).toBe(true);
    for (const bad of [jwt(OWNER, PASSWORD), jwt(OWNER), jwt(OWNER, "oauth"), "garbled"]) {
      sim.auth = `Bearer ${bad}`;
      expect(await call(OWNER), bad).toEqual({ allowed: false });
    }
    sim.auth = null;
    expect(await call(OWNER)).toEqual({ allowed: false });
    sim.auth = `Bearer ${jwt(OTHER, GOOGLE)}`;
    expect(await call(OTHER)).toEqual({ allowed: false });
  });

  it("on + no request context: fails closed (throws), never allowed:true", async () => {
    process.env.FINN_REQUIRE_GOOGLE = "1";
    sim.throwNoRequest = true;
    await expect(call(OWNER)).rejects.toThrow();
  });
});
