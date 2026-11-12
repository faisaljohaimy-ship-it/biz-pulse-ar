/** Offline regression tests for the production HTML gate; no real network. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./check-production.mjs", import.meta.url), "utf8");
// An executable shebang cannot appear inside a VM async-function wrapper.
const executableSource = source.replace(/^#![^\n]*\n/, "");
const normalPage = `<!doctype html><html lang="ar"><head>
<script>sessionStorage.getItem('theme')</script>
<link rel="stylesheet" href="/assets/app.css">
</head><body>SADEED</body></html>`;

async function runFixture(
  body,
  contentType = "text/html",
  cssStatus = 200,
  cssType = "text/css",
  cssBody = "body {}",
  pageStatus = 200,
) {
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
    URL,
    async fetch(input, options) {
      assert.equal(options.redirect, "manual");
      if (input === "https://offline.invalid/") {
        return new Response(body, { status: pageStatus, headers: { "content-type": contentType } });
      }
      assert.equal(input, "https://offline.invalid/assets/app.css");
      return new Response(cssBody, { status: cssStatus, headers: { "content-type": cssType } });
    },
  });
  await new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
  return exitCode;
}

test("accepts a real HTML document with a stylesheet link", async () => {
  assert.equal(await runFixture(normalPage), null);
});

test("rejects a partial HTTP 206 HTML response despite valid-looking markup", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", "body {}", 206), 1);
});

test("rejects a partial HTTP 206 stylesheet despite a valid CSS content type", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 206), 1);
});

test("rejects 200 application/json even with plausible HTML fragments", async () => {
  assert.equal(await runFixture(normalPage, "application/json"), 1);
});

test("rejects 200 HTML with only a textual .css mention", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<script>const asset = "/assets/app.css";</script>',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects an in-place SSO login wall even when theme and CSS are present", async () => {
  const html = normalPage.replace("SADEED", "<title>Authentication Required</title>");
  assert.equal(await runFixture(html), 1);
});

test("rejects 200 HTML when a stylesheet exists only inside an HTML comment", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<!-- <link rel="stylesheet" href="/assets/app.css"> -->',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects 200 HTML when a stylesheet exists only in a script string", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    `<script>const fake = '<link rel="stylesheet" href="/assets/app.css">';</script>`,
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects 200 HTML when a stylesheet exists only inside an inert template", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<template><link rel="stylesheet" href="/assets/app.css"></template>',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects theme bootstrap only mentioned in an HTML comment", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<!-- sessionStorage.getItem('theme') -->",
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects theme bootstrap only inside an inert template", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<template><script>sessionStorage.getItem('theme')</script></template>",
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects a stylesheet link whose referenced CSS asset returns HTTP 404", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 404), 1);
});

test("rejects a stylesheet link whose asset serves HTML instead of CSS", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/html"), 1);
});

test("accepts the real root's Google Fonts stylesheet before its same-origin CSS", async () => {
  const withFonts = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo">' +
      '<link rel="stylesheet" href="/assets/app.css">',
  );
  // Never fetch an off-origin CDN just to establish the app's CSS contract.
  assert.equal(await runFixture(withFonts), null);
});

test("rejects a disabled stylesheet as proof that screen styles are active", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" disabled>',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects a print-only stylesheet as proof that screen styles are active", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" media="print">',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects a never-matching media=not all stylesheet as screen-style proof", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" media="not all">',
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts active app CSS after an inert media=not all stylesheet", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" media="not all">' +
      '<link rel="stylesheet" href="/assets/app.css" media="screen">',
  );
  assert.equal(await runFixture(html), null);
});

test("accepts active screen styles even if a print-only stylesheet precedes them", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" media="print">' +
      '<link rel="stylesheet" href="/assets/app.css" media="all">',
  );
  assert.equal(await runFixture(html), null);
});

test("rejects an external font stylesheet without any local app CSS", async () => {
  const fontsOnly = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo">',
  );
  assert.equal(await runFixture(fontsOnly), 1);
});

test("does not let a font CDN hide a broken local CSS asset", async () => {
  const withFonts = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo">' +
      '<link rel="stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(withFonts, "text/html", 404), 1);
});

test("rejects inert JSON script that only quotes the theme bootstrap", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script type=\"application/json\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects unquoted non-JavaScript script types as theme proof", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script type=text/plain>sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts an executable module theme bootstrap", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script type=\"module\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), null);
});

test("accepts an explicit JavaScript MIME theme bootstrap", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script type=\"text/javascript\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), null);
});

test("rejects a data-rel attribute masquerading as an active stylesheet", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link data-rel="stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects a data-href attribute masquerading as a loaded stylesheet", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" data-href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects stylesheet tokens that appear only inside quoted metadata", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    `<link data-note=" rel='stylesheet' href='/assets/app.css'">`,
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects a fake href inside quoted metadata even with a real rel", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    `<link rel="stylesheet" data-note=" href='/assets/app.css'">`,
  );
  assert.equal(await runFixture(html), 1);
});

test("keeps the first duplicated rel attribute as browsers do", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="icon" rel="stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts genuine link attributes next to unrelated quoted metadata", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    `<link data-note=" rel='icon' href='/wrong.css'" rel="stylesheet" href="/assets/app.css">`,
  );
  assert.equal(await runFixture(html), null);
});

test("rejects a noscript-only stylesheet in the JavaScript-enabled application", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<noscript><link rel="stylesheet" href="/assets/app.css"></noscript>',
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts real application CSS alongside a noscript fallback", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<noscript><link rel="stylesheet" href="/assets/app.css"></noscript>' +
      '<link rel="stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), null);
});

test("rejects theme text inside an external script whose inline body is ignored by browsers", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script src=\"/assets/missing.js\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts a genuine inline theme script when src appears only in quoted metadata", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script data-note=\"src='/assets/missing.js'\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), null);
});

test("rejects inert JSON scripts even when quoted metadata falsely says type=module", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    '<script data-note=" type=\\'module\\'" type="application/json">sessionStorage.getItem(\\'theme\\')</script>',
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts a real classic theme script despite inert type tokens in quoted metadata", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    '<script data-note=" type=\\'application/json\\'">sessionStorage.getItem(\\'theme\\')</script>',
  );
  assert.equal(await runFixture(html), null);
});

test("accepts an empty script type, which browsers execute as classic JavaScript", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    '<script type="">sessionStorage.getItem(\\'theme\\')</script>',
  );
  assert.equal(await runFixture(html), null);
});

test("rejects an empty text/css response instead of treating its MIME as working styles", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", ""), 1);
});

test("rejects a whitespace-only CSS response as unstyled", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", " \n  \t"), 1);
});
