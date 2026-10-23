/** Offline source-level regressions. No browser, network, credentials or paid services. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("src/components/home/HomeBrandRow.tsx", "utf8");
const assets = readFileSync("src/components/home/brand-film-assets.ts", "utf8");
const ast = ts.createSourceFile(
  "HomeBrandRow.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
assert.equal(ast.parseDiagnostics.length, 0, "HomeBrandRow must remain syntactically valid");
const sound = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "bindFilmSound",
);
assert.ok(sound, "Test the actual exported implementation, not a second copy");
const compile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;

function fixture() {
  const state = { held: false, wanted: true, offscreen: false, blocked: 0 };
  const watchers = new Set();
  const plays = [];
  const video = new EventTarget();
  video.muted = true;
  video.play = () => {
    const pending = Promise.withResolvers();
    plays.push(pending);
    return pending.promise;
  };
  const context = vm.createContext({
    exports: {},
    DOMException,
    Element: class Element {},
    document: new EventTarget(),
    window: { setTimeout, clearTimeout },
    GESTURES: ["pointerdown", "click"],
    GESTURE_GRACE_MS: 250,
    isBlocked: (error) => error instanceof DOMException && error.name === "NotAllowedError",
    filmAudioHeld: () => state.held,
    watchFilmAudioHold(callback) {
      watchers.add(callback);
      return () => watchers.delete(callback);
    },
  });
  vm.runInContext(compile(sound.getText(ast)), context);
  const bound = context.exports.bindFilmSound(video, {
    wanted: () => state.wanted,
    offscreen: () => state.offscreen,
    onBlocked: () => state.blocked++,
  });
  return { state, video, plays, bound, watchers, notify: () => watchers.forEach((fn) => fn()) };
}

for (const reason of ["held", "wanted", "offscreen"]) {
  test(`pending audio probe immediately respects ${reason}`, async () => {
    const f = fixture();
    f.bound.begin();
    assert.equal(f.video.muted, false);
    f.state[reason] = reason !== "wanted";
    f.notify();
    assert.equal(f.video.muted, true, "a pending play promise cannot postpone muting");
    f.state[reason] = reason === "wanted";
    f.notify();
    assert.equal(f.video.muted, true, "do not unmute an unresolved playback probe");
    f.plays[0].resolve();
    await Promise.resolve();
    assert.equal(f.video.muted, true, "muted playback is not audible-playback permission");
    f.bound.kick();
    assert.equal(f.video.muted, false, "an explicit gesture can restore sound");
    f.bound.release();
  });
}

test("ordinary playback events do not silence a permitted initial probe", async () => {
  const f = fixture();
  f.bound.begin();
  for (const name of ["play", "playing", "seeked"]) f.video.dispatchEvent(new Event(name));
  assert.equal(f.video.muted, false);
  f.plays[0].resolve();
  await Promise.resolve();
  f.state.held = true;
  f.notify();
  assert.equal(f.video.muted, true);
  f.state.held = false;
  f.notify();
  assert.equal(f.video.muted, false);
  f.bound.release();
});

test("autoplay denial retries muted and only reports a second denial", async () => {
  const f = fixture();
  f.bound.begin();
  f.plays[0].reject(new DOMException("blocked", "NotAllowedError"));
  await Promise.resolve();
  assert.equal(f.video.muted, true);
  assert.equal(f.plays.length, 2);
  assert.equal(f.state.blocked, 0);
  f.plays[1].reject(new DOMException("blocked", "NotAllowedError"));
  await Promise.resolve();
  assert.equal(f.state.blocked, 1);
  f.bound.release();
});

test("release remains muted after a late playback resolution", async () => {
  const f = fixture();
  f.bound.begin();
  f.bound.release();
  f.plays[0].resolve();
  await Promise.resolve();
  assert.equal(f.video.muted, true);
  assert.equal(f.watchers.size, 0);
  f.bound.kick();
  assert.equal(f.video.muted, true);
});

const assetContext = vm.createContext({ exports: {} });
vm.runInContext(compile(assets), assetContext);
const { brandFilmSource, BRAND_FILM_REVISIONS } = assetContext.exports;

test("both video formats use distinct content-versioned URLs", () => {
  assert.equal(Object.keys(BRAND_FILM_REVISIONS).length, 4);
  for (const [path, sha] of Object.entries(BRAND_FILM_REVISIONS)) {
    const url = new URL(brandFilmSource(path), "https://offline.invalid");
    assert.equal(url.pathname, path);
    assert.equal(url.searchParams.get("v"), sha);
    assert.match(sha, /^[0-9a-f]{40}$/);
    assert.notEqual(url.pathname + url.search, path);
  }
  assert.ok(source.includes('<source src={brandFilmSource(src)} type="video/mp4" />'));
  assert.ok(
    source.includes(
      '<source src={brandFilmSource(src.replace(/\\.mp4$/, ".webm"))} type="video/webm" />',
    ),
  );
});

test("unrelated paths and inherited property names stay unchanged", () => {
  for (const path of ["/media/twin/other.mp4", "toString", "__proto__"]) {
    assert.equal(brandFilmSource(path), path);
  }
});
