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
  cssAssets = null,
  pageDisposition = null,
  pageCsp = null,
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
        return new Response(body, {
          status: pageStatus,
          headers: {
            "content-type": contentType,
            ...(pageDisposition === null ? {} : { "content-disposition": pageDisposition }),
            ...(pageCsp === null ? {} : { "content-security-policy": pageCsp }),
          },
        });
      }
      if (cssAssets) {
        const asset = cssAssets[input];
        assert.ok(asset, `unexpected stylesheet request: ${input}`);
        return new Response(asset.body ?? "body { color: navy; }", {
          status: asset.status,
          headers: { "content-type": asset.type ?? "text/css" },
        });
      }
      assert.equal(input, expectedCssUrl);
      return new Response(cssBody, { status: cssStatus, headers: { "content-type": cssType } });
    },
  });
  await new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
  return exitCode;
}

// MIME sniffing must not certify a page or stylesheet with an invalid
// MIME subtype merely because it starts with text/html or text/css.
test("rejects an HTML-looking document served as text/html-invalid", async () => {
  assert.equal(await runFixture(normalPage, "text/html-invalid"), 1);
});

test("rejects an app stylesheet served as text/css-invalid", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css-invalid"), 1);
});

test("accepts exact text/html with a charset parameter", async () => {
  assert.equal(await runFixture(normalPage, "text/html; charset=utf-8"), null);
});

test("accepts exact text/css with a charset parameter", async () => {
  assert.equal(await runFixture(normalPage, "text/html", 200, "text/css; charset=utf-8"), null);
});

// A stylesheet with HTTP 200 is not rendered when enforced CSP blocks it.
// Only unequivocally blocking source lists are rejected by this offline gate;
// more complex host-source restrictions require browser evidence.
for (const [label, policy, expected] of [
  ["style-src none", "style-src 'none'", 1],
  ["style-src-elem none overrides self", "style-src 'self'; style-src-elem 'none'", 1],
  ["default-src none without style override", "default-src 'none'; script-src 'unsafe-inline'", 1],
  ["empty style-src source list", "style-src", 1],
  ["second policy blocks styles", "style-src 'self', style-src 'none'", 1],
  [
    "self style override beats default none",
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'self'",
    null,
  ],
  ["style-src-elem self overrides style-src none", "style-src 'none'; style-src-elem 'self'", null],
]) {
  test("enforces stylesheet CSP: " + label, async () => {
    assert.equal(
      await runFixture(
        normalPage,
        "text/html",
        200,
        "text/css",
        "body {}",
        200,
        undefined,
        null,
        null,
        policy,
      ),
      expected,
    );
  });
}

test("accepts a real HTML document with a stylesheet link", async () => {
  assert.equal(await runFixture(normalPage), null);
});

test("rejects a downloadable HTML attachment despite healthy markup and CSS", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      'attachment; filename="app.html"',
    ),
    1,
  );
});

test("rejects case-insensitive attachment response headers", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      "ATTACHMENT",
    ),
    1,
  );
});

test("accepts inline HTML content disposition", async () => {
  assert.equal(
    await runFixture(
      normalPage,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      'inline; filename="app.html"',
    ),
    null,
  );
});

// Every same-origin active stylesheet must load: a valid vendor CSS file
// must not conceal a missing or unusable application CSS file.
for (const [label, statuses, expected] of [
  ["later application CSS missing", [200, 404], 1],
  ["earlier vendor CSS missing", [404, 200], 1],
  ["both local stylesheets served", [200, 200], null],
]) {
  test("validates every same-origin stylesheet: " + label, async () => {
    const html = normalPage.replace(
      '<link rel="stylesheet" href="/assets/app.css">',
      '<link rel="stylesheet" href="/assets/vendor.css">' +
        '<link rel="stylesheet" href="/assets/app.css">',
    );
    const cssAssets = {
      "https://offline.invalid/assets/vendor.css": { status: statuses[0] },
      "https://offline.invalid/assets/app.css": { status: statuses[1] },
    };
    assert.equal(
      await runFixture(
        html,
        "text/html",
        200,
        "text/css",
        "body {}",
        200,
        "https://offline.invalid/assets/app.css",
        cssAssets,
      ),
      expected,
    );
  });
}

// HTML parses named character references too. An un-decoded href can
// certify a decoy stylesheet while the browser requests a broken real asset.
// Browser HTML parsing replaces invalid numeric references and remaps
// legacy Windows-1252 character references before requesting CSS assets.
for (const [label, encodedHref, expectedUrl] of [
  ["C1 euro sign", "/assets/app&#x80;.css", "https://offline.invalid/assets/app%E2%82%AC.css"],
  ["null replacement", "/assets/app&#0;.css", "https://offline.invalid/assets/app%EF%BF%BD.css"],
]) {
  test("resolves HTML numeric character references in CSS URLs: " + label, async () => {
    const html = normalPage.replace(
      '<link rel="stylesheet" href="/assets/app.css">',
      '<link rel="stylesheet" href="' + encodedHref + '">',
    );
    assert.equal(
      await runFixture(html, "text/html", 200, "text/css", "body {}", 200, expectedUrl),
      null,
    );
  });
}

test("cannot certify broken CSS through a decoy C1 numeric-reference URL", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&#x80;.css">',
  );
  const actualBrowserUrl = "https://offline.invalid/assets/app%E2%82%AC.css";
  const decoyCheckerUrl = "https://offline.invalid/assets/app%C2%80.css";
  assert.equal(
    await runFixture(html, "text/html", 200, "text/css", "body {}", 200, actualBrowserUrl, {
      [actualBrowserUrl]: { status: 404 },
      [decoyCheckerUrl]: { status: 200 },
    }),
    1,
  );
});

// HTML named references are case-sensitive. A mixed-case spelling that is
// not in the HTML entity table remains literal in the browser's asset URL.
test("cannot certify missing CSS via a mixed-case pseudo-entity decoy", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&CoPy;.css">',
  );
  const actualBrowserUrl = "https://offline.invalid/assets/app&CoPy;.css";
  const decoyCheckerUrl = "https://offline.invalid/assets/app%C2%A9.css";
  assert.equal(
    await runFixture(html, "text/html", 200, "text/css", "body {}", 200, actualBrowserUrl, {
      [actualBrowserUrl]: { status: 404 },
      [decoyCheckerUrl]: { status: 200 },
    }),
    1,
  );
});

test("accepts real CSS whose URL contains a literal mixed-case pseudo-entity", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&CoPy;.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app&CoPy;.css",
    ),
    null,
  );
});

test("decodes valid uppercase COPY references in stylesheet URLs", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&COPY;.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app%C2%A9.css",
    ),
    null,
  );
});

test("resolves named &sol; references in stylesheet paths", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="&sol;assets&sol;app.css">',
  );
  assert.equal(await runFixture(html), null);
});

test("resolves named references in base URLs and relative stylesheet paths", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="&sol;static&sol;"><link rel="stylesheet" href="assets&sol;app.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/static/assets/app.css",
    ),
    null,
  );
});

test("resolves &colon; and &period; in absolute stylesheet links", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="https&colon;&sol;&sol;offline&period;invalid&sol;assets&sol;app&period;css">',
  );
  assert.equal(await runFixture(html), null);
});

// Browsers decode other standard named references, too. In particular,
// a decoy &copy; path must never certify the actual %C2%A9 asset.
test("resolves copyright-named HTML references in stylesheet URLs", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&copy;.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app%C2%A9.css",
    ),
    null,
  );
});

test("rejects a named copyright reference when only a decoy stylesheet responds", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app&copy;.css">',
  );
  const cssAssets = {
    "https://offline.invalid/assets/app&copy;.css": { status: 200 },
    "https://offline.invalid/assets/app%C2%A9.css": { status: 404 },
  };
  assert.equal(
    await runFixture(html, "text/html", 200, "text/css", "body {}", 200, undefined, cssAssets),
    1,
  );
});

test("resolves registered-sign references in a stylesheet base href", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="/assets&reg;/"><link rel="stylesheet" href="app.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets%C2%AE/app.css",
    ),
    null,
  );
});

test("rejects a named-entity stylesheet when the real asset is missing but a decoy responds", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="&sol;assets&sol;app.css">',
  );
  const cssAssets = {
    "https://offline.invalid/&sol;assets&sol;app.css": { status: 200 },
    "https://offline.invalid/assets/app.css": { status: 404 },
  };
  assert.equal(
    await runFixture(html, "text/html", 200, "text/css", "body {}", 200, undefined, cssAssets),
    1,
  );
});

test("resolves numeric HTML references in stylesheet paths before probing CSS", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="&#x2f;assets&#47;app.css">',
  );
  assert.equal(await runFixture(html), null);
});

test("resolves a numerically encoded base href like a browser", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<base href="&#x2f;static&#47;"><link rel="stylesheet" href="assets/app.css">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/static/assets/app.css",
    ),
    null,
  );
});

test("decodes one HTML entity layer, not two, for stylesheet query parameters", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css?next=&#38;amp;">',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css?next=&amp;",
    ),
    null,
  );
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

// The HTML parser decodes common named references in quoted href values.
// Probe the browser's actual URL, not an encoded decoy with a different asset.
for (const [entity, encoded] of [
  ["quot", "%22"],
  ["apos", "%27"],
  ["lt", "%3C"],
  ["gt", "%3E"],
]) {
  test(`resolves named &${entity}; references in stylesheet URLs`, async () => {
    const html = normalPage.replace(
      'href="/assets/app.css"',
      `href="/assets/app.css?marker=&${entity};safe"`,
    );
    assert.equal(
      await runFixture(
        html,
        "text/html",
        200,
        "text/css",
        "body {}",
        200,
        `https://offline.invalid/assets/app.css?marker=${encoded}safe`,
      ),
      null,
    );
  });
}

test("rejects encoded-quote stylesheet decoy when the browser asset is missing", async () => {
  const html = normalPage.replace(
    'href="/assets/app.css"',
    'href="/assets/app.css?marker=&quot;safe"',
  );
  const cssAssets = {
    "https://offline.invalid/assets/app.css?marker=&quot;safe": { status: 200 },
    "https://offline.invalid/assets/app.css?marker=%22safe": { status: 404 },
  };
  assert.equal(
    await runFixture(html, "text/html", 200, "text/css", "body {}", 200, undefined, cssAssets),
    1,
  );
});

// Invalid retry configuration must never turn a failed deployment probe into
// an endless sequence of 503 fetches (e.g. Number("Infinity") => Infinity).
for (const attemptSetting of ["Infinity", "1e309", "-1", "0", "2.5", "100000000"]) {
  test(`rejects unbounded or malformed ATTEMPTS=${attemptSetting} before network I/O`, async () => {
    const halt = new Error("configuration rejected");
    let fetchCalls = 0;
    const context = vm.createContext({
      process: {
        env: { PRODUCTION_URL: "https://offline.invalid", ROUTES: "/", ATTEMPTS: attemptSetting },
        exit(code) {
          assert.equal(code, 1);
          throw halt;
        },
      },
      console: { log() {}, error() {} },
      AbortSignal,
      URL,
      async fetch() {
        fetchCalls++;
        return new Response("unavailable", { status: 503 });
      },
    });
    await assert.rejects(
      new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context),
      (error) => error === halt,
    );
    assert.equal(fetchCalls, 0, "invalid retry settings must not probe the network");
  });
}

// Never turn a mistyped release gate ROUTES setting into a green result
// without probing any application page.
for (const routeSetting of [
  "",
  ",",
  " , ",
  "/,,/sec",
  "https://outside.invalid/",
  "//outside.invalid/",
  "/#/sec/twin", // A fragment never reaches the HTTP server; only "/" is probed.
  "/sec/twin#overview", // Fragment silently drops the expected route suffix.
  "/sec/twin/../..", // URL normalization makes this a probe of "/".
  "/sec/%2e%2e/", // Percent-encoded dot segments also normalize to "/".
]) {
  test(`rejects empty or unsafe production ROUTES=${JSON.stringify(routeSetting)} before requests`, async () => {
    const halt = new Error("invalid route configuration");
    let fetchCalls = 0;
    const context = vm.createContext({
      process: {
        env: { PRODUCTION_URL: "https://offline.invalid", ROUTES: routeSetting, ATTEMPTS: "1" },
        exit(code) {
          assert.equal(code, 1);
          throw halt;
        },
      },
      console: { log() {}, error() {} },
      AbortSignal,
      URL,
      async fetch() {
        fetchCalls++;
        throw new Error("invalid routes must not make network requests");
      },
    });
    await assert.rejects(
      new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context),
      (error) => error === halt,
    );
    assert.equal(fetchCalls, 0);
  });
}

test("accepts whitespace around one valid same-origin route and still checks its stylesheet", async () => {
  const seenUrls = [];
  const context = vm.createContext({
    process: {
      env: { PRODUCTION_URL: "https://offline.invalid", ROUTES: " / ", ATTEMPTS: "1" },
      exit(code) {
        throw new Error(`unexpected exit ${code}`);
      },
    },
    console: { log() {}, error() {} },
    AbortSignal,
    URL,
    async fetch(input) {
      seenUrls.push(input);
      if (input === "https://offline.invalid/") {
        return new Response(normalPage, { headers: { "content-type": "text/html" } });
      }
      if (input === "https://offline.invalid/assets/app.css") {
        return new Response("body {}", { headers: { "content-type": "text/css" } });
      }
      throw new Error(`unexpected URL ${input}`);
    },
  });
  await new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
  assert.deepEqual(seenUrls, [
    "https://offline.invalid/",
    "https://offline.invalid/assets/app.css",
  ]);
});

// An ambiguous base URL can redirect every route probe to "/" or a query
// parameter while the report still names /sec/twin as healthy.
for (const productionUrl of [
  "",
  "not-a-url",
  "//offline.invalid",
  "ftp://offline.invalid",
  "https://offline.invalid/#/sec/twin",
  "https://offline.invalid/?route=/",
  "https://offline.invalid/admin",
  "https://offline.invalid/admin/",
  "https://user:password@offline.invalid",
  "https://offline.invalid/?",
  "https://offline.invalid/#",
]) {
  test(`rejects ambiguous PRODUCTION_URL=${JSON.stringify(productionUrl)} before requests`, async () => {
    const halt = new Error("invalid production target");
    let fetchCalls = 0;
    const context = vm.createContext({
      process: {
        env: { PRODUCTION_URL: productionUrl, ROUTES: "/sec/twin", ATTEMPTS: "1" },
        exit(code) {
          assert.equal(code, 1);
          throw halt;
        },
      },
      console: { log() {}, error() {} },
      AbortSignal,
      URL,
      async fetch() {
        fetchCalls++;
        throw new Error("an invalid target must not be fetched");
      },
    });
    await assert.rejects(
      new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context),
      (error) => error === halt,
    );
    assert.equal(fetchCalls, 0);
  });
}

for (const productionUrl of ["https://offline.invalid/", "https://offline.invalid:443"]) {
  test(`normalizes a valid production origin ${productionUrl} without changing route`, async () => {
    const seenUrls = [];
    const context = vm.createContext({
      process: {
        env: { PRODUCTION_URL: productionUrl, ROUTES: "/", ATTEMPTS: "1" },
        exit(code) {
          throw new Error(`unexpected exit ${code}`);
        },
      },
      console: { log() {}, error() {} },
      AbortSignal,
      URL,
      async fetch(input) {
        seenUrls.push(input);
        if (input === "https://offline.invalid/") {
          return new Response(normalPage, { headers: { "content-type": "text/html" } });
        }
        if (input === "https://offline.invalid/assets/app.css") {
          return new Response("body {}", { headers: { "content-type": "text/css" } });
        }
        throw new Error(`unexpected URL ${input}`);
      },
    });
    await new vm.Script(`(async () => {\n${executableSource}\n})()`).runInContext(context);
    assert.deepEqual(seenUrls, [
      "https://offline.invalid/",
      "https://offline.invalid/assets/app.css",
    ]);
  });
}

// A page with correct markup is not usable if the browser refuses to execute
// the inline bootstrap. Test enforced (not report-only) CSP using real Headers.
for (const [name, policy, expected] of [
  ["script-src forbids all script execution", "script-src 'none'", 1],
  [
    "script-src-elem overrides permissive script-src",
    "script-src 'unsafe-inline'; script-src-elem 'none'",
    1,
  ],
  ["default-src forbids scripts when no script directive exists", "default-src 'none'", 1],
  ["second enforced policy still blocks the bootstrap", "default-src 'self', script-src 'none'", 1],
  [
    "script-src-elem overrides restrictive script-src",
    "script-src 'none'; script-src-elem 'unsafe-inline'",
    null,
  ],
  ["script-src self blocks inline scripts", "script-src 'self'", 1],
  ["default-src self blocks inline scripts", "default-src 'self'", 1],
  ["unsafe-eval does not authorize inline scripts", "script-src 'self' 'unsafe-eval'", 1],
  [
    "unsafe-inline permits an otherwise restricted inline script",
    "script-src 'self' 'unsafe-inline'",
    null,
  ],
  [
    "a nonce source without matching script nonce blocks inline code",
    "script-src 'nonce-missing'",
    1,
  ],
  [
    "hash-only policy cannot certify an unverified theme script",
    "script-src 'sha256-unmatched'",
    1,
  ],
  ["nonce sources override unsafe-inline in CSP3", "script-src 'unsafe-inline' 'nonce-other'", 1],
  ["unrelated CSP does not block the bootstrap", "img-src 'none'", null],
]) {
  test("production theme CSP guard: " + name, async () => {
    assert.equal(
      await runFixture(
        normalPage,
        "text/html",
        200,
        "text/css",
        "body {}",
        200,
        "https://offline.invalid/assets/app.css",
        null,
        null,
        policy,
      ),
      expected,
    );
  });
}

test("allows a theme bootstrap with a matching CSP nonce", async () => {
  const noncePage = normalPage.replace("<script>", '<script nonce="releaseNonce123">');
  assert.equal(
    await runFixture(
      noncePage,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      null,
      "script-src 'nonce-releaseNonce123'",
    ),
    null,
  );
});

test("rejects a theme bootstrap with a nonmatching CSP nonce", async () => {
  const noncePage = normalPage.replace("<script>", '<script nonce="releaseNonce123">');
  assert.equal(
    await runFixture(
      noncePage,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      null,
      "script-src 'nonce-other'",
    ),
    1,
  );
});

// Early head meta CSP is enforced in browsers even without an HTTP CSP header.
test("rejects an early head meta CSP that blocks the inline theme bootstrap", async () => {
  const html = normalPage.replace(
    "<script>",
    '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'"><script>',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects an early head meta CSP that disables application CSS", async () => {
  const html = normalPage.replace(
    "<script>",
    '<meta http-equiv="content-security-policy" content="style-src \'none\'"><script>',
  );
  assert.equal(await runFixture(html), 1);
});

test("honors restrictive head meta CSP despite a permissive HTTP policy", async () => {
  const html = normalPage.replace(
    "<script>",
    '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'"><script>',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      null,
      null,
      "script-src 'unsafe-inline'; style-src 'self'",
    ),
    1,
  );
});

test("accepts early head meta CSP allowing theme and CSS", async () => {
  const html = normalPage.replace(
    "<script>",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'unsafe-inline'; style-src 'self'\"><script>",
  );
  assert.equal(await runFixture(html), null);
});

test("does not retroactively enforce late head meta CSP on earlier resources", async () => {
  const html = normalPage.replace(
    "</head>",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; style-src 'none'\"></head>",
  );
  assert.equal(await runFixture(html), null);
});

test("ignores a commented-out head CSP declaration", async () => {
  const html = normalPage.replace(
    "<script>",
    '<!-- <meta http-equiv="Content-Security-Policy" content="style-src \'none\'"> --><script>',
  );
  assert.equal(await runFixture(html), null);
});

test("ignores meta CSP inside the document body", async () => {
  const html = normalPage.replace(
    "<body>",
    '<body><meta http-equiv="Content-Security-Policy" content="script-src \'none\'">',
  );
  assert.equal(await runFixture(html), null);
});

// A head meta CSP takes effect at its parse position, not globally across the
// document. Earlier resources remain valid; subsequent assets must obey it.
test("does not retroactively block a theme script that ran before head meta CSP", async () => {
  const html = normalPage.replace(
    "</script>",
    '</script><meta http-equiv="Content-Security-Policy" content="script-src \'none\'">',
  );
  assert.equal(await runFixture(html), null);
});

test("blocks a later theme script even when a stylesheet appeared before head meta CSP", async () => {
  const html = normalPage.replace(
    '<script>sessionStorage.getItem(\'theme\')</script>\n<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'"><script>sessionStorage.getItem(\'theme\')</script>',
  );
  assert.equal(await runFixture(html), 1);
});

test("enforces head meta CSP inserted after the first stylesheet on the second stylesheet", async () => {
  const html = normalPage.replace(
    "</head>",
    '<meta http-equiv="Content-Security-Policy" content="style-src \'none\'"><link rel="stylesheet" href="/assets/second.css"></head>',
  );
  assert.equal(
    await runFixture(
      html,
      "text/html",
      200,
      "text/css",
      "body {}",
      200,
      "https://offline.invalid/assets/app.css",
      {
        "https://offline.invalid/assets/app.css": { status: 200, body: "body { color: blue; }" },
        "https://offline.invalid/assets/second.css": { status: 200, body: "h1 { color: red; }" },
      },
    ),
    1,
  );
});

// Script and style raw text cannot terminate the real HTML head. A deceptive
// closing-head/opening-body token must not hide later enforced head meta CSP.
for (const [label, decoy] of [
  ["a closing head token in a JS string", "</head>"],
  ["an opening body token in a JS string", "<body class=decoy>"],
]) {
  test("enforces meta CSP after " + label, async () => {
    const html = normalPage
      .replace(
        "sessionStorage.getItem('theme')",
        `const marker = ${JSON.stringify(decoy)}; sessionStorage.getItem('theme')`,
      )
      .replace(
        '<link rel="stylesheet"',
        '<meta http-equiv="Content-Security-Policy" content="style-src \u0027none\u0027"><link rel="stylesheet"',
      );
    assert.equal(await runFixture(html), 1);
  });
}

test("enforces head meta CSP after fake closing head token in style text", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet"',
    '<style>body::after { content: "</head>"; }</style><meta http-equiv="Content-Security-Policy" content="style-src \u0027none\u0027"><link rel="stylesheet"',
  );
  assert.equal(await runFixture(html), 1);
});


// A quoted '>' is attribute data, not the end of an HTML opening tag.
// The old matcher truncated the tag before "disabled" and could certify
// disabled CSS as a production-ready active stylesheet.
test("rejects disabled CSS after a quoted angle bracket attribute", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" href="/assets/app.css" data-note=">" disabled>',
  );
  assert.equal(await runFixture(html), 1);
});

test("rejects disabled single-quoted CSS after a quoted angle bracket", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    `<link rel='stylesheet' href='/assets/app.css' data-note='>' disabled>`,
  );
  assert.equal(await runFixture(html), 1);
});

test("retains a working stylesheet href after a quoted angle bracket", async () => {
  const html = normalPage.replace(
    '<link rel="stylesheet" href="/assets/app.css">',
    '<link rel="stylesheet" data-note=">" href="/assets/app.css">',
  );
  assert.equal(await runFixture(html), null);
});
