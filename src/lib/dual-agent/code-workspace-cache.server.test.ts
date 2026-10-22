// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Callback = (args: {
  next: () => Promise<unknown>;
  context: object;
  data?: unknown;
}) => Promise<unknown>;
const state = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  authenticated: false,
  list: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getResponseHeader: (name: string) => state.headers.get(name.toLowerCase()),
  setResponseHeader: (name: string, value: string) => state.headers.set(name.toLowerCase(), value),
}));
vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ server: (callback: Callback) => callback }),
  createServerFn: () => {
    let middlewares: Callback[] = [];
    const builder = {
      middleware: (callbacks: Callback[]) => {
        middlewares = callbacks;
        return builder;
      },
      inputValidator: () => builder,
      handler: (handler: Callback) => async () => {
        const run = async (index: number): Promise<unknown> =>
          index < middlewares.length
            ? middlewares[index]({ context: {}, next: () => run(index + 1) })
            : handler({ context: {}, next: async () => undefined });
        return run(0);
      },
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: async ({ next }: { next: () => Promise<unknown> }) => {
    expect(state.headers.get("cache-control")).toBe("private, no-store");
    if (!state.authenticated) throw new Error("Unauthorized");
    return next();
  },
}));
vi.mock("./code-workspace.server", () => ({
  listCodeBundles: state.list,
  readCodeBundle: state.read,
  saveCodeBundle: state.save,
}));
import {
  listFnnCodeBundles,
  readFnnCodeBundle,
  saveFnnCodeBundle,
} from "./code-workspace.functions";

const functions = [listFnnCodeBundles, readFnnCodeBundle, saveFnnCodeBundle];
const invoke = (fn: unknown) => (fn as () => Promise<unknown>)();
beforeEach(() => {
  state.headers.clear();
  state.authenticated = false;
  vi.clearAllMocks();
  for (const handler of [state.list, state.read, state.save])
    handler.mockResolvedValue({ ok: true });
});
describe("Code function HTTP privacy boundary", () => {
  it.each(functions)("sets private headers before anonymous denial", async (fn) => {
    state.headers.set("vary", "Accept-Encoding");
    await expect(invoke(fn)).rejects.toThrow("Unauthorized");
    expect(state.headers.get("cache-control")).toBe("private, no-store");
    expect(state.headers.get("vercel-cdn-cache-control")).toBe("no-store");
    expect(state.headers.get("vary")).toBe("Accept-Encoding, Authorization");
    expect(state.list).not.toHaveBeenCalled();
    expect(state.read).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });
  it.each(functions)("protects authenticated success and preserves downstream Vary", async (fn) => {
    state.authenticated = true;
    for (const handler of [state.list, state.read, state.save])
      handler.mockImplementation(async () => {
        state.headers.set("cache-control", "public");
        state.headers.set("vary", "Accept-Language");
        return { ok: true };
      });
    await expect(invoke(fn)).resolves.toEqual({ ok: true });
    expect(state.headers.get("cache-control")).toBe("private, no-store");
    expect(state.headers.get("vary")).toBe("Accept-Language, Authorization");
  });
  it.each(["Accept-Encoding, authorization", "*"])(
    "preserves already sufficient Vary %s on handler failure",
    async (vary) => {
      state.authenticated = true;
      state.headers.set("vary", vary);
      state.list.mockRejectedValueOnce(new Error("Storage unavailable"));
      await expect(invoke(listFnnCodeBundles)).rejects.toThrow("Storage unavailable");
      expect(state.headers.get("vary")).toBe(vary);
      expect(state.headers.get("cache-control")).toBe("private, no-store");
    },
  );
});
