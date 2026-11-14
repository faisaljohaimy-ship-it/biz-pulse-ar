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
  expectedCssUrl = "https://offline.invalid/assets/app.css",
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
      assert.equal(input, expectedCssUrl);
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

test("rejects a nomodule-only theme bootstrap ignored by modern browsers", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script nomodule>sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), 1);
});

test("treats nomodule=false as a present HTML boolean attribute", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script nomodule=\"false\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts a modern theme bootstrap following an ignored nomodule fallback", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<script nomodule>sessionStorage.getItem('theme')</script>" +
      "<script type=\"module\">sessionStorage.getItem('theme')</script>",
  );
  assert.equal(await runFixture(html), null);
});

test("rejects theme bootstrap only mentioned in an HTML comment", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    "<!-- sessionStorage.getItem('theme') -->",
  );
  assert.equal(await runFixture(html), 1);
});

// A JS comment or quoted example can contain the exact source text the old
// regex counted as a working theme bootstrap, despite never running the call.
for (const fake of [
  "// sessionStorage.getItem('theme')",
  "/* sessionStorage.getItem('theme') */",
  "const sample = \"sessionStorage.getItem('theme')\";",
  "const sample = `sessionStorage.getItem('theme')`;",
]) {
  test("rejects a theme call appearing only in inert JavaScript text: " + fake, async () => {
    const html = normalPage.replace(
      "<script>sessionStorage.getItem('theme')</script>",
      "<script>" + fake + "</script>",
    );
    assert.equal(await runFixture(html), 1);
  });
}

for (const executable of [
  "const saved = sessionStorage.getItem('theme');",
  "// earlier comment\nconst saved = sessionStorage.getItem('theme');",
  "const url = 'https://offline.invalid'; const saved = sessionStorage.getItem('theme');",
]) {
  test("retains a real theme bootstrap even when comments or URLs precede it", async () => {
    const html = normalPage.replace(
      "<script>sessionStorage.getItem('theme')</script>",
      "<script>" + executable + "</script>",
    );
    assert.equal(await runFixture(html), null);
  });
}

// A regular-expression literal contains pattern text, not an executed
// sessionStorage read. Escaped slashes and character classes remain inert.
for (const { label, source } of [
  {
    label: "regexp assignment",
    source: "const pattern = /sessionStorage.getItem('theme')/;",
  },
  {
    label: "regexp after return",
    source: "function pattern() { return /sessionStorage.getItem('theme')/; }",
  },
  {
    label: "escaped slash and character class in regexp",
    source: String.raw`const pattern = /http:\/\/[a-z]+\/sessionStorage.getItem('theme')/;`,
  },
]) {
  test("rejects inert theme bootstrap text inside " + label, async () => {
    const html = normalPage.replace(
      "<script>sessionStorage.getItem('theme')</script>",
      "<script>" + source + "</script>",
    );
    assert.equal(await runFixture(html), 1);
  });
}

// Regex parsing must not hide a real call later in the script or treat
// division by a sessionStorage read as a regex literal.
for (const source of [
  "const pattern = /sessionStorage.getItem('theme')/; sessionStorage.getItem('theme');",
  "const ratio = 8 / sessionStorage.getItem('theme');",
]) {
  test("retains executable theme bootstrap after regex or division", async () => {
    const html = normalPage.replace(
      "<script>sessionStorage.getItem('theme')</script>",
      "<script>" + source + "</script>",
    );
    assert.equal(await runFixture(html), null);
  });
}

// Template literal text does not run, but its interpolated expressions do.
// Verify nested expressions without accepting escaped, commented or quoted text.
for (const { label, source, expected } of [
  {
    label: "single executable interpolation",
    source: "const saved = `${sessionStorage.getItem('theme')}`;",
    expected: null,
  },
  {
    label: "nested executable template",
    source: "const saved = `outer ${`inner ${sessionStorage.getItem('theme')}`}`;",
    expected: null,
  },
  {
    label: "object literal inside interpolation",
    source: "const saved = `${({ value: sessionStorage.getItem('theme') }).value}`;",
    expected: null,
  },
  {
    label: "plain template text",
    source: "const saved = `sessionStorage.getItem('theme')`;",
    expected: 1,
  },
  {
    label: "escaped interpolation text",
    source: "const saved = `literal \\${sessionStorage.getItem('theme')}`;",
    expected: 1,
  },
  {
    label: "comment inside interpolation",
    source: "const saved = `${/* sessionStorage.getItem('theme') */ 'dark'}`;",
    expected: 1,
  },
  {
    label: "quoted example inside interpolation",
    source: "const saved = `${\"sessionStorage.getItem('theme')\"}`;",
    expected: 1,
  },
]) {
  test("distinguishes executable theme reads within templates: " + label, async () => {
    const html = normalPage.replace(
      "<script>sessionStorage.getItem('theme')</script>",
      "<script>" + source + "</script>",
    );
    assert.equal(await runFixture(html), expected);
  });
}

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

test("rejects an incompatible stylesheet type despite a real CSS response", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" type="text/plain">',
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts an explicitly typed text/css stylesheet", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" type="text/css">',
  );
  assert.equal(await runFixture(html), null);
});

test("accepts a real stylesheet among whitespace-separated rel tokens", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="preload stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), null);
});

test("accepts a mixed-case stylesheet token after other link relations", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="preload STYLESHEET" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), null);
});

test("does not count alternate stylesheets as enabled app styles", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="alternate stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects lookalike rel tokens that are not a stylesheet relation", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="preload stylesheets" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});

test("uses a valid stylesheet after a link with an incompatible type", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" type="application/json">' +
      '<link rel="stylesheet" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), null);
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
    `<script data-note=" type='module'" type="application/json">sessionStorage.getItem('theme')</script>`,
  );
  assert.equal(await runFixture(html), 1);
});

test("accepts a real classic theme script despite inert type tokens in quoted metadata", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    `<script data-note=" type='application/json'">sessionStorage.getItem('theme')</script>`,
  );
  assert.equal(await runFixture(html), null);
});

test("accepts an empty script type, which browsers execute as classic JavaScript", async () => {
  const html = normalPage.replace(
    "<script>sessionStorage.getItem('theme')</script>",
    `<script type="">sessionStorage.getItem('theme')</script>`,
  );
  assert.equal(await runFixture(html), null);
});

test("rejects an empty text/css response instead of treating its MIME as working styles", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", ""), 1);
});

test("rejects a whitespace-only CSS response as unstyled", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", " \n  \t"), 1);
});

test("rejects a nonempty CSS asset containing only a comment", async () => {
  assert.equal(
    await runFixture(normalPage, "text/html", 200, "text/css", "/* compilation banner */"),
    1,
  );
});

test("rejects multiple CSS comments and whitespace with no styling rules", async () => {
  assert.equal(
    await runFixture(normalPage, "text/html", 200, "text/css", " /* a */\n /* b */\n"),
    1,
  );
});

test("accepts functional CSS following a build banner comment", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      "/* banner */ body { color: navy; }",
    ),
    null,
  );
});

// Media lists are comma-separated OR queries: none of the following can apply
// to a screen, even if a same-origin CSS asset has the correct MIME and bytes.
for (const media of [
  "speech",
  "not screen",
  "only print",
  "print and (color), speech",
  "print, not screen",
]) {
  test(`rejects media="${media}" as app screen CSS evidence`, async () => {
    const html = normalPage.replace(
      '<link rel="stylesheet" href="/assets/app.css">',
      `<link rel="stylesheet" href="/assets/app.css" media="${media}">`,
    );
    assert.equal(await runFixture(html), 1);
  });
}

for (const media of [
  "print, screen",
  "print, all",
  "screen and (min-width: 1px)",
  // CSS negates the WHOLE media query: these can match a screen when the
  // feature is false, so they must not be mistaken for non-screen-only CSS.
  "not screen and (color)",
  "not all and (color)",
  "print, not screen and (monochrome)",
]) {
  test(`accepts a screen-capable media list: ${media}`, async () => {
    const html = normalPage.replace(
      '<link rel="stylesheet" href="/assets/app.css">',
      `<link rel="stylesheet" href="/assets/app.css" media="${media}">`,
    );
    assert.equal(await runFixture(html), null);
  });
}

test("cancels rejected HTTP response streams for both routes and CSS assets", async () => {
  for (const failedCss of [false, true]) {
    let canceled = 0;
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
        if (failedCss && input === "https://offline.invalid/") {
          return new Response(normalPage, { headers: { "content-type": "text/html" } });
        }
        assert.equal(
          input,
          failedCss ? "https://offline.invalid/assets/app.css" : "https://offline.invalid/",
        );
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([35]));
            },
            cancel() {
              canceled += 1;
            },
          }),
          { status: 503, headers: { "content-type": failedCss ? "text/css" : "text/html" } },
        );
      },
    });
    await new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
    assert.equal(exitCode, 1);
    assert.equal(canceled, 1, failedCss ? "CSS response body leaked" : "HTML response body leaked");
  }
});

test("decodes HTML-escaped ampersands in CSS query strings before probing", async () => {
  for (const entity of ["&amp;", "&#38;", "&#x26;"]) {
    const html = normalPage.replace(
      'href="/assets/app.css"',
      `href="/assets/app.css?version=1${entity}mode=dark"`,
    );
    assert.equal(
      await runFixture(
        html,
        "text/html",
        200,
        "text/css",
        "body {}",
        200,
        "https://offline.invalid/assets/app.css?version=1&mode=dark",
      ),
      null,
    );
  }
});

test("does not decode a nested ampersand HTML reference twice", async () => {
  const html = normalPage.replace(
    'href="/assets/app.css"',
    'href="/assets/app.css?x=1&amp;amp;y=2"',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css?x=1&amp;y=2",
    ),
    null,
  );
});

for (const delay of ["0", "2.5", "5"]) {
  test(
    "rejects an immediate HTML meta refresh (" + delay + "s) despite valid theme and CSS",
    async () => {
      const html = normalPage.replace(
        "</head>",
        '<meta http-equiv="refresh" content="' + delay + '; url=/login"></head>',
      );
      assert.equal(await runFixture(html), 1);
    },
  );
}

test("ignores fake refresh attributes inside quoted metadata", async () => {
  const html = normalPage.replace(
    "</head>",
    '<meta data-note="http-equiv=refresh" content="0; url=/login"></head>',
  );
  assert.equal(await runFixture(html), null);
});

test("ignores a refresh tag only present in an inert template or script", async () => {
  for (const fake of [
    '<template><meta http-equiv="refresh" content="0; url=/login"></template>',
    '<script>const example = "<meta http-equiv=refresh content=0>";</script>',
  ]) {
    assert.equal(await runFixture(normalPage.replace("</head>", fake + "</head>")), null);
  }
});

test("does not reject a delayed periodic refresh outside the immediate redirect window", async () => {
  const html = normalPage.replace("</head>", '<meta http-equiv="refresh" content="3600"></head>');
  assert.equal(await runFixture(html), null);
});

test("rejects a stylesheet containing only a CSS encoding declaration", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css", '@charset "UTF-8";'), 1);
});

test("rejects CSS comments followed only by a charset declaration", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      '/* build header */ @charset "UTF-8"; /* no actual rules */',
    ),
    1,
  );
});

test("accepts real application styles following a charset declaration", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      '@charset "UTF-8"; body { color: navy; }',
    ),
    null,
  );
});

test("does not hang on a failed HTTP response whose stream cancellation never settles", async () => {
  let exitCode = null;
  let cancellationStarted = false;
  const failedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
    },
    cancel() {
      cancellationStarted = true;
      return new Promise(() => {}); // Simulate a stuck upstream body.
    },
  });
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
    async fetch() {
      return new Response(failedBody, { status: 503 });
    },
  });
  const check = new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
  const outcome = await Promise.race([
    check.then(() => "settled"),
    new Promise((resolve) => setTimeout(() => resolve("hung"), 1000)),
  ]);
  assert.equal(outcome, "settled", "a stalled cancel must not bypass the retry deadline");
  assert.equal(cancellationStarted, true);
  assert.equal(exitCode, 1, "a 503 must still fail the production gate");
});

for (const [equiv, content] of [
  ["refre&#x73;h", "0;url=/login"],
  ["refresh", "0&#59;url=/login"],
  ["refresh", "0&#x3b;url=/login"],
  ["refresh", "0&semi;url=/login"],
  ["refresh", "0&#59url=/login"],
  ["refresh&Tab;", "0;url=/login"],
]) {
  test(`detects HTML-encoded meta refresh: ${equiv} / ${content}`, async () => {
    const html = normalPage.replace(
      "</head>",
      `<meta http-equiv="${equiv}" content="${content}"></head>`,
    );
    assert.equal(await runFixture(html), 1);
  });
}

test("does not double-decode nested refresh entities", async () => {
  const html = normalPage.replace(
    "</head>",
    '<meta http-equiv="refresh" content="0&amp;semi;url=/login"></head>',
  );
  assert.equal(await runFixture(html), null);
});

test("rejects a relative app stylesheet redirected off-origin by HTML base", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="https://outside.invalid/"><link rel="stylesheet" href="assets/app.css">',
  );
  // The old checker fetched /assets/app.css locally and falsely passed.
  assert.equal(await runFixture(html), 1);
});

test("resolves a relative app stylesheet using the first same-origin base", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="/dashboard/"><link rel="stylesheet" href="assets/app.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/dashboard/assets/app.css",
    ),
    null,
  );
});

test("honors the first base href rather than a later safe override", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="https://outside.invalid/"><base href="/dashboard/">' +
      '<link rel="stylesheet" href="assets/app.css">',
  );
  assert.equal(await runFixture(html), 1);
});
