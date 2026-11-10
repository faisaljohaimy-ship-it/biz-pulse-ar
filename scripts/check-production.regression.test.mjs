/** Offline regression tests for the production HTML gate; no real network. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./check-production.mjs", import.meta.url), "utf8");
const normalPage = `<!doctype html><html lang="ar"><head>
<script>sessionStorage.getItem('theme')</script>
<link rel="stylesheet" href="/assets/app.css">
</head><body>SADEED</body></html>`;

async function runFixture(body, contentType = "text/html") {
  let exitCode = null;
  const context = vm.createContext({
    process: {
      env: { PRODUCTION_URL: "https://offline.invalid", ROUTES: "/", ATTEMPTS: "1" },
      exit(code) {
        exitCode = code;
      },
    },
    console: { log() {}, error() {} },
    AbortSignal,
    async fetch(input, options) {
      assert.equal(input, "https://offline.invalid/");
      assert.equal(options.redirect, "manual");
      return new Response(body, { status: 200, headers: { "content-type": contentType } });
    },
  });
  await new vm.Script(`(async () => {\n${source}\n})()`).runInContext(context);
  return exitCode;
}

test("accepts a real HTML document with a stylesheet link", async () => {
  assert.equal(await runFixture(normalPage), null);
});

test("rejects 200 application/json even with plausible HTML fragments", async () => {
  assert.equal(await runFixture(normalPage, "application/json"), 1);
});

test("rejects 200 HTML with only a textual .css mention", async () => {
  const html = normalPage.replace('<link rel="stylesheet" href="/assets/app.css">', '<script>const asset = "/assets/app.css";</script>');
  assert.equal(await runFixture(html), 1);
});

test("rejects an in-place SSO login wall even when theme and CSS are present", async () => {
  const html = normalPage.replace("SADEED", "<title>Authentication Required</title>");
  assert.equal(await runFixture(html), 1);
});
