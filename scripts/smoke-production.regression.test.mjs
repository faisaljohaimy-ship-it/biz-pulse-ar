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
      env: {
        PRODUCTION_URL: "https://offline.invalid",
        STRICT: options.strict ? "1" : "0",
        EXPECT_N8N: options.expectN8n ? "1" : "",
      },
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
        const body = {
          build: { sha: "a".repeat(40), ref: "fixture" },
          subsystems: {
            db: { status: options.db ?? "ok" },
            rate_limit_storage: { status: options.storage ?? "ok" },
          },
        };
        // الكتلة غائبة افتراضًا (بناءٌ أقدم)؛ وتُحقَن صراحةً، ويمكن أن تكون null.
        if ("n8n" in options) body.n8n = options.n8n;
        return json(body, options.healthStatus ?? 200);
      }
      if (url.pathname === "/api/chat/health") {
        const body = { ok: true, key_present: true, provider: "fixture", gate: "verified" };
        if ("web" in options) body.web_research = options.web;
        return json(body, options.chatHealthStatus ?? 200);
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

// ── قناة n8n: كتلتا الصحّة (استشاريّتان) ──────────────────────────────────────────
// لا n8n حقيقي ولا شبكة: الجسمان من نقطتَي الصحّة المزيَّفتين أعلاه.
const PUB_COLD = { configured: false, mode: "off", breaker: "closed" };
const WEB_COLD = {
  mode: "off",
  kill_switch: false,
  configured: { sadeed: false, fnn: false },
  armed: false,
  breaker: { sadeed: "closed", fnn: "closed" },
  last_ok_at: null,
  p95_ms: null,
  samples: 0,
};
const PUB_ON = { configured: true, mode: "all", breaker: "closed" };
const WEB_ON = {
  ...WEB_COLD,
  mode: "all",
  configured: { sadeed: true, fnn: true },
  armed: true,
};

test("n8n: الكتلتان غائبتان (بناءٌ أقدم) ⇒ warn لا fail، والخروج 0", async () => {
  const r = await runFixture();
  assert.equal(r.result("N1 n8n public/health").status, "warn");
  assert.equal(r.result("N2 n8n chat/health").status, "warn");
  assert.equal(r.result("N3 n8n advisory").status, "info");
  assert.equal(r.exitCode, 0);
});
test("n8n: غائبتان مع STRICT ⇒ fail", async () => {
  const r = await runFixture({ strict: true });
  assert.equal(r.result("N1 n8n public/health").status, "fail");
  assert.equal(r.result("N2 n8n chat/health").status, "fail");
  assert.equal(r.exitCode, 1);
});
test("n8n: سليمتان وغير مهيّأتين ⇒ pass للشكل، وinfo استشاريّ، والخروج 0", async () => {
  const r = await runFixture({ n8n: PUB_COLD, web: WEB_COLD });
  assert.equal(r.result("N1 n8n public/health").status, "pass");
  assert.equal(r.result("N2 n8n chat/health").status, "pass");
  const advisory = r.result("N3 n8n advisory");
  assert.equal(advisory.status, "info");
  assert.match(advisory.detail, /غير مهيّأ/);
  assert.match(advisory.detail, /لم يُقَس/);
  assert.equal(r.exitCode, 0);
});
test("n8n: سليمتان ومهيّأتان ⇒ pass، والاستشاريّ لا يسقط", async () => {
  const r = await runFixture({ n8n: PUB_ON, web: WEB_ON });
  assert.equal(r.result("N1 n8n public/health").status, "pass");
  assert.equal(r.result("N2 n8n chat/health").status, "pass");
  assert.equal(r.result("N3 n8n advisory").status, "info");
  assert.equal(r.exitCode, 0);
});
test("n8n: الراية مرفوعة ولا قناة مهيّأة ⇒ warn (لا fail)", async () => {
  const r = await runFixture({
    n8n: { ...PUB_COLD, mode: "members" },
    web: { ...WEB_COLD, mode: "members" },
  });
  assert.equal(r.result("N3 n8n advisory").status, "warn");
  assert.equal(r.exitCode, 0);
});
test("n8n: قاطعٌ مفتوح ⇒ warn لا fail", async () => {
  const r = await runFixture({
    n8n: { ...PUB_ON, breaker: "open" },
    web: { ...WEB_ON, breaker: { sadeed: "open", fnn: "closed" } },
  });
  assert.equal(r.result("N3 n8n advisory").status, "warn");
  assert.equal(r.exitCode, 0);
});
test("n8n: EXPECT_N8N وغير مهيّأ ⇒ fail", async () => {
  const r = await runFixture({ n8n: PUB_COLD, web: WEB_COLD, expectN8n: true });
  assert.equal(r.result("N3 n8n advisory").status, "fail");
  assert.equal(r.exitCode, 1);
});
test("n8n: EXPECT_N8N ومهيّأ ⇒ pass", async () => {
  const r = await runFixture({ n8n: PUB_ON, web: WEB_ON, expectN8n: true });
  assert.equal(r.result("N3 n8n advisory").status, "pass");
  assert.equal(r.exitCode, 0);
});
test("n8n: EXPECT_N8N وسطح سَدِيد وحده غير مهيّأ ⇒ fail", async () => {
  const r = await runFixture({
    n8n: PUB_ON,
    web: { ...WEB_ON, configured: { sadeed: false, fnn: true }, armed: false },
    expectN8n: true,
  });
  assert.equal(r.result("N3 n8n advisory").status, "fail");
});
test("n8n: null (غير مقروءة) ⇒ warn لا fail", async () => {
  const r = await runFixture({ n8n: null, web: null });
  assert.equal(r.result("N1 n8n public/health").status, "warn");
  assert.equal(r.result("N2 n8n chat/health").status, "warn");
  assert.equal(r.exitCode, 0);
});

// الكاشف يعضّ: كل تشويهٍ مزروع يُدان، ويُسقط الفحص.
const MALFORMED_PUBLIC = [
  ["مفتاح زائد", { ...PUB_COLD, base: "x" }],
  ["مفتاح ناقص", { configured: false, mode: "off" }],
  ["وضع غريب", { ...PUB_COLD, mode: "sometimes" }],
  ["قاطع غريب", { ...PUB_COLD, breaker: "melted" }],
  ["configured نصّ", { ...PUB_COLD, configured: "yes" }],
  ["مصفوفة", []],
  ["نصّ", "off"],
];
for (const [label, block] of MALFORMED_PUBLIC) {
  test(`n8n: كتلة عامّة مشوَّهة (${label}) ⇒ fail`, async () => {
    const r = await runFixture({ n8n: block, web: WEB_COLD });
    assert.equal(r.result("N1 n8n public/health").status, "fail");
    assert.equal(r.exitCode, 1);
  });
}
const MALFORMED_CHAT = [
  ["مفتاح زائد", { ...WEB_COLD, extra: 1 }],
  ["armed ناقص", (({ armed: _a, ...rest }) => rest)(WEB_COLD)],
  ["configured مسطّح", { ...WEB_COLD, configured: false }],
  ["قاطع غريب", { ...WEB_COLD, breaker: { sadeed: "melted", fnn: "closed" } }],
  ["p95 بلا عيّنات (رقم مختلَق)", { ...WEB_COLD, p95_ms: 0 }],
  ["عيّنات سالبة", { ...WEB_COLD, samples: -1 }],
  ["last_ok_at رقم", { ...WEB_COLD, last_ok_at: 5 }],
];
for (const [label, block] of MALFORMED_CHAT) {
  test(`n8n: كتلة سَدِيد مشوَّهة (${label}) ⇒ fail`, async () => {
    const r = await runFixture({ n8n: PUB_COLD, web: block });
    assert.equal(r.result("N2 n8n chat/health").status, "fail");
    assert.equal(r.exitCode, 1);
  });
}
test("n8n: p95 مع عيّنات حقيقية ⇒ سليمة", async () => {
  const r = await runFixture({
    n8n: PUB_ON,
    web: { ...WEB_ON, p95_ms: 640, samples: 7, last_ok_at: "2026-10-30T10:00:00.000Z" },
  });
  assert.equal(r.result("N2 n8n chat/health").status, "pass");
});
// تسرّب القيم: حقل `last_ok_at` نصٌّ حرّ الشكل في العقد، فلا يردّ قيمةً مسرّبة فيه إلا كاشف
// التسرّب نفسه (الحقول الأخرى مقيَّدة بقوائم مغلقة فيردّها فحص الشكل). القيم تُبنى وقت التشغيل
// (لا مفتاحًا حرفيًّا في الملف). والنصّ السليم (تاريخ ISO) يمرّ في الاختبار السابق.
const LEAKY = [
  ["عنوان", "https://" + "n8n.example.com"],
  ["سرّ سداسي طويل", "ab12cd34".repeat(5)],
  ["اسم متغيّر", "SADEED_" + "N8N_SECRET"],
  ["مسار ويبهوك", "/web" + "hook/x"],
];
for (const [label, value] of LEAKY) {
  test(`n8n: تسرّب (${label}) داخل حقل نصّي حرّ الشكل ⇒ fail`, async () => {
    const r = await runFixture({ n8n: PUB_COLD, web: { ...WEB_COLD, last_ok_at: value } });
    assert.equal(r.result("N2 n8n chat/health").status, "fail");
    assert.match(r.result("N2 n8n chat/health").detail, /عنوانًا أو سرًّا/);
    assert.equal(r.exitCode, 1);
  });
}
test("n8n: الخلاصة تحمل صفوف N1/N2/N3", async () => {
  const r = await runFixture({ n8n: PUB_COLD, web: WEB_COLD });
  for (const id of ["N1 n8n public/health", "N2 n8n chat/health", "N3 n8n advisory"]) {
    assert.ok(r.markdown.includes(id), id);
  }
});
