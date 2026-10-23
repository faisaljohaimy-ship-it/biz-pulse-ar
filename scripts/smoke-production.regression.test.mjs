/** Offline regression tests: no network, credentials, production writes or AI calls. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = readFileSync(new URL("./smoke-production.mjs", import.meta.url), "utf8");
const program = source.replace('import { writeFileSync } from "node:fs";', "");

async function runFixture(options = {}) {
  const written = new Map();
  let exitCode = null;
  let anonymousCalls = 0;
  const encodeEvent = (value) => `data: ${JSON.stringify(value)}\n\n`;
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  const context = vm.createContext({
    console: {
      log() {},
      error() {},
    },
    process: {
      env: { PRODUCTION_URL: "https://offline.invalid", STRICT: options.strict ? "1" : "0" },
      exit(code) {
        exitCode = code;
      },
    },
    performance,
    TextDecoder,
    AbortSignal,
    crypto: webcrypto,
    writeFileSync(path, data) {
      written.set(path, data);
    },
    async fetch(input, init = {}) {
      const url = new URL(input);
      assert.equal(url.origin, "https://offline.invalid", "Network access is forbidden");
      if (url.pathname === "/api/public/health") {
        return json(
          {
            build: { sha: "a".repeat(40), ref: "fixture" },
            subsystems: {
              db: { status: options.db ?? "ok" },
              rate_limit_storage: { status: options.storage ?? "ok" },
            },
          },
          options.healthStatus ?? 200,
        );
      }
      if (url.pathname === "/api/chat/health") {
        return json(
          { ok: true, key_present: true, provider: "fixture", gate: "verified" },
          options.chatHealthStatus ?? 200,
        );
      }
      assert.equal(url.pathname, "/api/chat");
      if (init.headers.authorization) return json({ error: "unauthorized" }, 401);
      anonymousCalls++;
      if (anonymousCalls > 1) {
        return json({ code: "duplicate_request" }, 429);
      }
      if (options.networkFailure) throw new Error("fixture network failure");
      const text = options.text ?? "تحقق من تصريح العمل ومعدات الوقاية قبل البدء.";
      let body = encodeEvent({ type: "text-delta", delta: text });
      if (options.event) body += encodeEvent(options.event);
      body += "data: [DONE]\n\n";
      const headers = { "content-type": "text/event-stream", "x-sadeed-gate": "verified" };
      if (options.source !== null) headers["x-sadeed-reply-source"] = options.source ?? "model";
      return new Response(body, { status: options.status ?? 200, headers });
    },
  });
  await new vm.Script(`(async () => {\n${program}\n})()`).runInContext(context);
  const report = JSON.parse(written.get("smoke-result.json"));
  return {
    exitCode,
    result(id) {
      return report.results.find((entry) => entry.id === id);
    },
    markdown: written.get("smoke-summary.md"),
  };
}

test("a complete Arabic model reply passes", async () => {
  const r = await runFixture();
  assert.equal(r.result("C1 chat").status, "pass");
  assert.equal(r.exitCode, 0);
});
test("HTTP 200 model-error must fail", async () => {
  const r = await runFixture({ source: "model-error", text: "تعذر إكمال الرد" });
  assert.equal(r.result("C1 chat").status, "fail");
  assert.equal(r.exitCode, 1);
});
for (const event of [
  { type: "error", errorText: "failed" },
  { type: "abort" },
  { type: "finish", finishReason: "error" },
]) {
  test(`partial Arabic text followed by ${JSON.stringify(event)} fails`, async () => {
    const r = await runFixture({ event });
    assert.equal(r.result("C1 chat").status, "fail");
    assert.equal(r.exitCode, 1);
  });
}
test("a local fallback is a warning, not proof of a model reply", async () => {
  const r = await runFixture({ source: "local-guaranteed" });
  assert.equal(r.result("C1 chat").status, "warn");
  assert.equal(r.exitCode, 0);
});
test("missing source fails", async () => {
  const r = await runFixture({ source: null });
  assert.equal(r.result("C1 chat").status, "fail");
});
test("transport failure fails", async () => {
  const r = await runFixture({ networkFailure: true });
  assert.equal(r.result("C1 chat").status, "fail");
});
test("non-200 chat fails", async () => {
  const r = await runFixture({ status: 503 });
  assert.equal(r.result("C1 chat").status, "fail");
});
test("a failed storage probe cannot turn green from a later verified gate", async () => {
  const r = await runFixture({ storage: "down" });
  assert.equal(r.result("H1 public/health").status, "warn");
  assert.equal(r.result("DB").status, "warn");
});
test("strict mode fails an unhealthy storage probe", async () => {
  const r = await runFixture({ storage: "down", strict: true });
  assert.equal(r.result("H1 public/health").status, "fail");
  assert.equal(r.result("DB").status, "fail");
  assert.equal(r.exitCode, 1);
});
test("non-200 health cannot pass even if the JSON contains ok states", async () => {
  const r = await runFixture({ healthStatus: 503, chatHealthStatus: 503 });
  assert.equal(r.result("H1 public/health").status, "warn");
  assert.equal(r.result("H2 chat/health").status, "fail");
  assert.equal(r.result("DB").status, "warn");
});
test("a non-Arabic answer fails and the summary makes no global correctness claim", async () => {
  const r = await runFixture({ text: "hello" });
  assert.equal(r.result("C1 chat").status, "fail");
  const healthy = await runFixture();
  assert.ok(!healthy.markdown.includes("لا عيب شيفرة"));
});
