import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createFixturePolicy,
  fixtureAwareGet,
  fixturePolicyFromEnvironment,
  installFixtureBrowserGuard,
} from "../e2e/support/fixture-network.mjs";

const env = {
  SADEED_E2E_FIXTURE_ONLY: "true",
  VITE_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_URL: "http://127.0.0.1:54321",
  VITE_SUPABASE_PUBLISHABLE_KEY: "fixture-only-publishable-key",
  SUPABASE_PUBLISHABLE_KEY: "fixture-only-publishable-key",
  VITE_SUPABASE_PROJECT_ID: "fixture-only-local",
  SUPABASE_PROJECT_ID: "fixture-only-local",
};
const policy = fixturePolicyFromEnvironment("http://localhost:8080", env);

test("only the configured loopback origins/ports may contact fixture upstreams", () => {
  for (const url of ["http://localhost:8080/", "http://127.0.0.1:54321/rest/v1/example"]) {
    assert.equal(policy.allows(url), true);
  }
  for (const url of [
    "https://upstream.example.invalid/read",
    "http://localhost:8081/",
    "http://127.0.0.1:8080/",
    "http://localhost.example.invalid:8080/",
    "http://user:password@localhost:8080/",
    "file:///fixture.json",
  ])
    assert.equal(policy.allows(url), false, url);
  for (const baseURL of [
    "https://upstream.example.invalid",
    "http://localhost",
    "http://localhost:8080/path",
  ]) {
    assert.throws(() =>
      createFixturePolicy({ enabled: true, baseURL, supabaseURL: env.SUPABASE_URL }),
    );
  }
});

test("inline data is local; blob and WebSocket URLs remain origin bound", () => {
  assert.equal(policy.allows("data:image/svg+xml,%3Csvg/%3E"), true);
  assert.equal(policy.allows("about:blank"), true);
  assert.equal(policy.allows("blob:http://localhost:8080/fixture"), true);
  assert.equal(policy.allows("blob:https://upstream.example.invalid/fixture"), false);
  assert.equal(policy.allows("blob:null/fixture"), false);
  assert.equal(policy.allows("ws://localhost:8080/hmr", true), true);
  assert.equal(policy.allows("wss://upstream.example.invalid/stream", true), false);
  assert.equal(policy.allows("ws://localhost:8081/hmr", true), false);
});

test("missing/mismatched fixture env fails closed; false and omitted stay unchanged", () => {
  for (const key of Object.keys(env).filter((key) => key !== "SADEED_E2E_FIXTURE_ONLY")) {
    const missing = { ...env };
    delete missing[key];
    assert.throws(() => fixturePolicyFromEnvironment("http://localhost:8080", missing), key);
  }
  for (const flag of [undefined, "false"]) {
    assert.equal(
      fixturePolicyFromEnvironment("https://upstream.example.invalid", {
        SADEED_E2E_FIXTURE_ONLY: flag,
      }),
      null,
    );
  }
});

test("API readiness denies nonlocal GET before the request and never follows redirects", async () => {
  const calls = [];
  const request = {
    get: async (...args) => {
      calls.push(args);
      return { status: () => 200 };
    },
  };
  await assert.rejects(fixtureAwareGet(request, "https://upstream.example.invalid/read", policy));
  assert.equal(calls.length, 0);
  await fixtureAwareGet(request, "/api/public/live", policy);
  assert.deepEqual(calls, [["http://localhost:8080/api/public/live", { maxRedirects: 0 }]]);
  await assert.rejects(
    fixtureAwareGet(
      {
        get: async (_url, options) => {
          assert.equal(options.maxRedirects, 0);
          return { status: () => 302 };
        },
      },
      "/redirect",
      policy,
    ),
  );
  calls.length = 0;
  await fixtureAwareGet(request, "/unchanged-default", null);
  assert.deepEqual(calls, [["/unchanged-default"]]);
});

test("browser routes deny before fetch, reject redirect responses and preserve normal mode", async () => {
  let handler, socketHandler;
  const calls = [];
  const context = {
    route: async (_pattern, fn) => {
      handler = fn;
    },
    routeWebSocket: async (_pattern, fn) => {
      socketHandler = fn;
    },
  };
  await installFixtureBrowserGuard(context, null);
  assert.equal(handler, undefined);
  await installFixtureBrowserGuard(context, policy);
  const route = (url, status) => ({
    request: () => ({ url: () => url }),
    abort: () => calls.push("abort"),
    fetch: async (options) => {
      calls.push("fetch");
      assert.equal(options.maxRedirects, 0);
      return { status: () => status };
    },
    fulfill: () => calls.push("fulfill"),
  });
  await handler(route("https://upstream.example.invalid/read", 200));
  assert.deepEqual(calls, ["abort"]);
  calls.length = 0;
  await handler(route("http://localhost:8080/redirect", 302));
  assert.deepEqual(calls, ["fetch", "abort"]);
  calls.length = 0;
  await handler(route("http://localhost:8080/direct", 200));
  assert.deepEqual(calls, ["fetch", "fulfill"]);
  calls.length = 0;
  socketHandler({
    url: () => "wss://upstream.example.invalid/stream",
    close: () => calls.push("close"),
    connectToServer: () => calls.push("connect"),
  });
  assert.deepEqual(calls, ["close"]);
});

test("CI and both E2E entrypoints actually wire the conditional fixture boundary", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const decision = readFileSync(
    new URL("../e2e/16-security-decision-center.spec.ts", import.meta.url),
    "utf8",
  );
  const readiness = readFileSync(
    new URL("../e2e/07-health-endpoint.spec.ts", import.meta.url),
    "utf8",
  );
  const step = workflow.slice(
    workflow.indexOf("- name: Restrict fixture-only"),
    workflow.indexOf("- name: Verify the fixture-only"),
  );
  assert.match(step, /if: inputs\.fixture_only == true/);
  for (const [key, value] of Object.entries(env))
    assert.ok(step.includes(`echo '${key}=${value}'`));
  assert.ok(
    workflow.indexOf("- name: Restrict fixture-only") <
      workflow.indexOf("- name: Start isolated dev server"),
  );
  assert.match(decision, /if \(fixtureOnly\) test\.use\(\{ serviceWorkers: "block" \}\)/);
  assert.match(decision, /fixtureOnly \? route\.fallback\(\) : route\.continue\(\)/);
  assert.ok(
    decision.indexOf("installFixtureBrowserGuard(page.context()") <
      decision.indexOf('page.goto("/sec/decision-center"'),
  );
  assert.equal((readiness.match(/await fixtureAwareGet\(/g) || []).length, 2);
});
