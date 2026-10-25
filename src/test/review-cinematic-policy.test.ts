// @vitest-environment node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "vitest";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const css = read("src/styles/home/home-ticker-focus.css");
const component = read("src/components/home/HomeTicker.tsx");
const manifest = JSON.parse(read(".lovable/mcp/manifest.json"));
const focus = ".nx-ticker:has(.nx-ticker-view:focus-visible)";

test("keyboard override loads after the original cinematic stylesheet", () => {
  assert.ok(component.indexOf("home-ticker-focus.css") > component.indexOf("home-ticker.css"));
  assert.ok(component.includes('import "@/styles/home/home-ticker-focus.css";'));
});

test("the keyboard hold reaches descendants and their pseudo-elements", () => {
  for (const suffix of ["", "::before", "::after", " *", " *::before", " *::after"]) {
    assert.ok(css.includes(`${focus}${suffix}`), suffix);
  }
  assert.match(css, /animation-play-state:\s*paused\s*!important/);
});

test("animated images are replaced with still imagery during keyboard reading", () => {
  assert.match(css, /background-image:\s*var\(--tk-still\)\s*!important/);
  assert.match(css, /:is\(\.nx-tk-img-anim, \.nx-tk-count\)\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /\.nx-tk-img-still\s*\{\s*display:\s*block\s*!important/);
});

test("the real number and readable text cannot remain mid-reveal on focus", () => {
  assert.match(css, /:is\([^)]*\.nx-tk-word[^)]*\.nx-tk-real\)\s*\{\s*animation-name:\s*none/);
});

test("the hold does not add hover pauses, controls or JavaScript animation loops", () => {
  assert.ok(!css.includes(":hover"));
  assert.ok(!css.includes(":focus-within"));
  assert.ok(!component.includes("nx-ticker-toggle"));
  assert.ok(!css.includes("animation-duration:"));
});

for (const name of ["ask_sadeed", "hcis_status", "ptw_active_permits"]) {
  test(`${name} declares the reviewed closed input schema`, () => {
    const tool = manifest.mcp.tools.find((value: { name: string }) => value.name === name);
    assert.ok(tool, name);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
  });
}

test("question and permit bounds remain enforced in the declared schemas", () => {
  const question = manifest.mcp.tools.find(
    (value: { name: string }) => value.name === "ask_sadeed",
  );
  const permits = manifest.mcp.tools.find(
    (value: { name: string }) => value.name === "ptw_active_permits",
  );
  assert.ok(question);
  assert.ok(permits);
  assert.deepEqual(question.inputSchema.required, ["question"]);
  assert.equal(question.inputSchema.properties.question.maxLength, 2000);
  assert.equal(permits.inputSchema.properties.limit.minimum, 1);
  assert.equal(permits.inputSchema.properties.limit.maximum, 50);
});

test("MCP keeps OAuth and authenticated audience, with no new tool", () => {
  assert.equal(manifest.auth.type, "oauth");
  assert.deepEqual(manifest.auth.accepted_audiences, ["authenticated"]);
  assert.deepEqual(
    manifest.mcp.tools.map((value: { name: string }) => value.name).sort(),
    ["ask_sadeed", "hcis_status", "ping", "ptw_active_permits"],
  );
});
