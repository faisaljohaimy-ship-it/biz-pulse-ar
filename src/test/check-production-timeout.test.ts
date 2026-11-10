import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const program = readFileSync(resolve(process.cwd(), "scripts/check-production.mjs"), "utf8").replace(
  /^#![^\n]*\n/,
  "",
);
const healthyHtml = `<!doctype html><script>sessionStorage.getItem('theme')</script><link rel="stylesheet" href="/app.css">SADEED`;

describe("production smoke network deadline", () => {
  it("fails closed when a production request never answers until aborted", async () => {
    let exitCode = 0;
    const deadlines: number[] = [];
    const context = vm.createContext({
      AbortSignal: {
        timeout(ms: number) {
          deadlines.push(ms);
          return AbortSignal.abort(new Error("simulated stalled fetch"));
        },
      },
      process: {
        env: {
          PRODUCTION_URL: "https://offline.invalid",
          ROUTES: "/",
          ATTEMPTS: "1",
        },
        exit(code: number) {
          exitCode = code;
        },
      },
      console: { log() {}, error() {} },
      fetch: async (_url: string, init: { signal?: AbortSignal; redirect?: string }) => {
        expect(init.redirect).toBe("manual");
        // Without a deadline, the old script would accept this apparent 200.
        // With an aborted request signal, native fetch rejects the request.
        if (init.signal?.aborted) throw init.signal.reason;
        return { ok: true, status: 200, text: async () => healthyHtml };
      },
    });
    await new vm.Script(`(async () => {\n${program}\n})()`).runInContext(context);
    expect(deadlines).toEqual([10_000]);
    expect(exitCode).toBe(1);
  });
});
