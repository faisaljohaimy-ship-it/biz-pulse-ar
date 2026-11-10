import { readFileSync } from "node:fs";
import vm from "node:vm";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const program = readFileSync(
  resolve(process.cwd(), "scripts/check-production.mjs"),
  "utf8",
);
const healthyHtml = `<!doctype html><script>sessionStorage.getItem('theme')</script><link rel="stylesheet" href="/app.css">SADEED`;

async function runOfflineProbe(redirectStatus?: 302 | 307) {
  let exitCode = 0;
  let redirectMode: string | undefined;
  const context = vm.createContext({
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
    fetch: async (url: string, init: { redirect?: string }) => {
      expect(url).toBe("https://offline.invalid/");
      redirectMode = init.redirect;
      // A following client sees a healthy-looking HTTP 200 login page;
      // a manual client sees the actual redirect for the requested route.
      if (redirectStatus && init.redirect === "manual") {
        return { ok: false, status: redirectStatus };
      }
      return { ok: true, status: 200, text: async () => healthyHtml };
    },
  });
  await new vm.Script(`(async () => {\n${program}\n})()`).runInContext(context);
  return { exitCode, redirectMode };
}

describe("production smoke response provenance", () => {
  it("passes a direct HTTP 200 application page", async () => {
    const result = await runOfflineProbe();
    expect(result.redirectMode).toBe("manual");
    expect(result.exitCode).toBe(0);
  });

  it.each([302, 307] as const)(
    "rejects a %i redirect instead of approving the login destination",
    async (status) => {
      const result = await runOfflineProbe(status);
      expect(result.redirectMode).toBe("manual");
      expect(result.exitCode).toBe(1);
    },
  );
});
