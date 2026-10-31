/**
 * حارس `notify-owner-call.mjs` — يُشغَّل بـ: node --test scripts/notify-owner-call.regression.test.mjs
 * (خارج vitest كسائر اختبارات `scripts/`). كل قيمة تشبه سرًّا أو رقمًا تُبنى وقت التشغيل فلا يلتقطها
 * فاحص الأسرار ولا فحص الأرقام المكتوبة. المسارات نسبية لهذا الملف فيعمل من أي مجلّد.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildRequest,
  buildTwiml,
  main,
  MAX_ESCAPED_CHARS,
  MAX_MESSAGE_CHARS,
  needsEnvProxyFlag,
  placeCall,
  RATE_LIMIT,
  rateDecision,
  readConfig,
  validateMessage,
} from "./notify-owner-call.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SCRIPT = join(HERE, "notify-owner-call.mjs");

const SID = "AC".concat("1a".repeat(16));
const TOKEN = "t".concat("0k3n".repeat(7));
const FROM = "+1".concat("5550001111");
const OWNER = "+9665".concat("00000000");
const BASIC = Buffer.from(`${SID}:${TOKEN}`).toString("base64");
const CALL = "CA".concat("9".repeat(32));
const SECRETS = [SID, TOKEN, FROM, OWNER, BASIC, "Basic "];

/** بيئة جديدة لكل اختبار، بملف حدٍّ محلي مستقلّ فلا يتسرّب الحدّ بين الاختبارات. */
function freshEnv(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "owner-call-test-"));
  return {
    TWILIO_ACCOUNT_SID: SID,
    TWILIO_AUTH_TOKEN: TOKEN,
    TWILIO_FROM_NUMBER: FROM,
    SADEED_OWNER_PHONE: OWNER,
    SADEED_OWNER_CALL_STATE: join(dir, "stamps.json"),
    ...extra,
  };
}

const noFetch = () => {
  throw new Error("لا يجوز نداء الشبكة هنا");
};
const created = (over = {}) => ({
  ok: true,
  status: 201,
  json: async () => ({ sid: CALL, status: "queued", ...over }),
});

function noSecrets(text, label = "") {
  for (const s of SECRETS)
    assert.equal(text.includes(s), false, `${label}: تسرّب ${s.slice(0, 4)}…`);
}

function capture(fn) {
  const out = [];
  const err = [];
  const log = console.log;
  const error = console.error;
  console.log = (...a) => out.push(a.join(" "));
  console.error = (...a) => err.push(a.join(" "));
  return fn()
    .then((code) => ({ code, text: [...out, ...err].join("\n") }))
    .finally(() => {
      console.log = log;
      console.error = error;
    });
}

test("الرسالة: تُطوى الفراغات وتُقبل العربية", () => {
  const r = validateMessage("  انتهى   العمل \n ونُشر التغيير.  ");
  assert.equal(r.ok, true);
  assert.equal(r.text, "انتهى العمل ونُشر التغيير.");
});

test("الرسالة: الفارغة والطويلة وما يتضخّم بعد الهروب تُرفض", () => {
  assert.equal(validateMessage("   ").ok, false);
  assert.equal(validateMessage(undefined).ok, false);
  assert.equal(validateMessage("ا".repeat(MAX_MESSAGE_CHARS + 1)).ok, false);
  assert.equal(validateMessage("ا".repeat(MAX_MESSAGE_CHARS)).ok, true);
  const bloat = validateMessage("'".repeat(MAX_ESCAPED_CHARS / 6 + 1));
  assert.equal(bloat.ok, false);
  assert.match(bloat.reason, /تتضخّم/);
  assert.equal(validateMessage("'".repeat(MAX_ESCAPED_CHARS / 6)).ok, true);
});

test("الرسالة: كل ما يشبه سرًّا يُرفض (انتهاكات مزروعة، المادة ٣٠)", () => {
  const planted = [
    "المفتاح " + "sk" + "-" + "a".repeat(24),
    "الرمز " + "eyJ" + "b".repeat(30),
    "Bearer " + "c".repeat(20),
    "السرّ " + "GOCSPX" + "-" + "d".repeat(20),
    "الحساب " + SID,
    "مفتاح تويليو " + "SK" + "7f".repeat(16),
    "مفتاح غوغل " + "AIza" + "Sy".repeat(17) + "S",
    "هاش " + "e".repeat(40),
    "token: " + "f".repeat(12),
    "كلمة المرور = " + "g".repeat(10),
    "قاعدة " + "h".repeat(48),
  ];
  for (const text of planted) assert.equal(validateMessage(text).ok, false, text.slice(0, 14));
});

test("الإعداد: النواقص والأشكال الفاسدة والرقمان المتطابقان", () => {
  assert.equal(readConfig({}).ok, false);
  assert.match(readConfig({}).reason, /TWILIO_ACCOUNT_SID/);
  assert.equal(readConfig({ ...freshEnv(), TWILIO_ACCOUNT_SID: "AC123" }).ok, false);
  assert.equal(
    readConfig({ ...freshEnv(), TWILIO_FROM_NUMBER: "05".concat("12345678") }).ok,
    false,
  );
  assert.equal(
    readConfig({ ...freshEnv(), SADEED_OWNER_PHONE: "966".concat("500000000") }).ok,
    false,
  );
  assert.equal(readConfig({ ...freshEnv(), SADEED_OWNER_PHONE: FROM }).ok, false);
  assert.equal(readConfig(freshEnv()).ok, true);
});

test("الإعداد: رسائل الخطأ لا تحمل قيمًا", () => {
  const r = readConfig({ ...freshEnv(), TWILIO_FROM_NUMBER: "bad" });
  noSecrets(r.reason, "readConfig");
  assert.equal(r.reason.includes("bad"), false);
});

test("TwiML: صوت عربي، الرسالة مرّتان، وكل محرف XML يُهرَّب", () => {
  const xml = buildTwiml(`نجح <b>الفحص</b> & "تمّ" 'اليوم'`);
  assert.equal(xml.match(/<Say /g).length, 2);
  assert.match(xml, /voice="Polly\.Zeina" language="arb"/);
  assert.equal(xml.includes("<b>"), false);
  assert.match(xml, /&lt;b&gt;/);
  assert.match(xml, /&amp;/);
  assert.match(xml, /&quot;/);
  assert.match(xml, /&apos;/);
});

test("TwiML: أسوأ رسالة مقبولة تبقى تحت ٤٠٠٠ حرف", () => {
  const worst = validateMessage("'".repeat(MAX_ESCAPED_CHARS / 6));
  assert.equal(worst.ok, true);
  assert.ok(buildTwiml(worst.text).length < 4000);
});

test("الطلب: العنوان والمصادقة والحقول الأربعة فقط، ولا يتبع إعادة التوجيه", () => {
  const cfg = readConfig(freshEnv());
  const { url, init } = buildRequest(cfg, "مرحبًا");
  assert.equal(url, `https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json`);
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "error");
  assert.equal(
    Buffer.from(init.headers.Authorization.replace(/^Basic /, ""), "base64").toString(),
    `${SID}:${TOKEN}`,
  );
  const form = new URLSearchParams(init.body);
  assert.deepEqual([...form.keys()].sort(), ["From", "Timeout", "To", "Twiml"]);
  assert.equal(form.get("To"), OWNER);
  assert.equal(form.get("From"), FROM);
});

test("placeCall: النجاح 201 بمعرّف سليم وحدهما، والحالة من قائمة بيضاء", async () => {
  const cfg = readConfig(freshEnv());
  const ok = await placeCall(cfg, "x", async () => created());
  assert.deepEqual([ok.ok, ok.sid, ok.status], [true, CALL, "queued"]);
  const odd = await placeCall(cfg, "x", async () => created({ status: OWNER }));
  assert.equal(odd.status, "queued");
  const ringing = await placeCall(cfg, "x", async () => created({ status: "ringing" }));
  assert.equal(ringing.status, "ringing");
});

test("placeCall: لا نجاحَ كاذب: 200 بلا معرّف، معرّف مشوَّه، 3xx، جسم غير JSON", async () => {
  const cfg = readConfig(freshEnv());
  const cases = [
    { ok: true, status: 200, json: async () => ({ status: "queued" }) },
    { ok: true, status: 200, json: async () => ({ sid: CALL, status: "queued" }) },
    { ok: true, status: 201, json: async () => ({ sid: "CA123" }) },
    { ok: true, status: 201, json: async () => ({ sid: OWNER }) },
    { ok: false, status: 307, json: async () => ({ sid: CALL }) },
    {
      ok: true,
      status: 201,
      json: async () => {
        throw new SyntaxError("not json");
      },
    },
  ];
  for (const [i, res] of cases.entries()) {
    const r = await placeCall(cfg, "x", async () => res);
    assert.equal(r.ok, false, `الحالة ${i}`);
    noSecrets(r.reason, `الحالة ${i}`);
  }
});

test("placeCall: فشل HTTP يطبع رمزًا عددًا فقط، وفشل الشبكة بلا أسرار ولا ترويسة", async () => {
  const cfg = readConfig(freshEnv());
  const denied = await placeCall(cfg, "x", async () => ({
    ok: false,
    status: 403,
    json: async () => ({ code: 21215, message: `Account ${SID} token ${TOKEN}` }),
  }));
  assert.match(denied.reason, /403/);
  assert.match(denied.reason, /21215/);
  noSecrets(denied.reason, "403");

  const echo = await placeCall(cfg, "x", async () => ({
    ok: false,
    status: 400,
    json: async () => ({ code: OWNER }),
  }));
  noSecrets(echo.reason, "صدى الرمز");

  const down = await placeCall(cfg, "x", async (_url, init) => {
    throw Object.assign(new Error(`boom ${TOKEN} ${init.headers.Authorization}`), {
      name: "TimeoutError",
    });
  });
  assert.equal(down.ok, false);
  noSecrets(down.reason, "شبكة");
  const weird = await placeCall(cfg, "x", async () => {
    throw Object.assign(new Error("x"), { name: OWNER });
  });
  noSecrets(weird.reason, "اسم خطأ غريب");
});

test("main: التجربة لا تنادي الشبكة ولا تطبع رقمًا ولا رمزًا", async () => {
  const r = await capture(() => main(["--dry-run", "اختبار"], freshEnv(), noFetch));
  assert.equal(r.code, 0);
  noSecrets(r.text, "dry-run");
});

test("main: بيئة ناقصة أو رسالة سرّية ⇒ 2 بلا نداء شبكة", async () => {
  assert.equal((await capture(() => main(["مرحبًا"], {}, noFetch))).code, 2);
  assert.equal(
    (await capture(() => main(["Bearer " + "z".repeat(20)], freshEnv(), noFetch))).code,
    2,
  );
  assert.equal((await capture(() => main([], freshEnv(), noFetch))).code, 2);
});

test("main: الوسائط لا تغيّر المتّصَل به (يُنطق نصًّا ولا يُطلب)", async () => {
  let seen = null;
  const stub = async (_url, init) => {
    seen = new URLSearchParams(init.body);
    return created();
  };
  const other = "+1".concat("5551234567");
  const r = await capture(() => main(["--to", other, "مرحبًا"], freshEnv(), stub));
  assert.equal(r.code, 0);
  assert.equal(seen.get("To"), OWNER);
});

test("main: 201 ⇒ 0 بنصٍّ لا يدّعي التسليم، وغير ذلك ⇒ 1، وبلا أسرار", async () => {
  const g = await capture(() => main(["تمّ"], freshEnv(), async () => created()));
  const b = await capture(() =>
    main(["تمّ"], freshEnv(), async () => ({
      ok: false,
      status: 400,
      json: async () => ({ code: 21211 }),
    })),
  );
  const fake = await capture(() =>
    main(["تمّ"], freshEnv(), async () => ({ ok: true, status: 200, json: async () => ({}) })),
  );
  assert.equal(g.code, 0);
  assert.match(g.text, /لا يعني هذا أنها سُلّمت/);
  assert.equal(b.code, 1);
  assert.equal(fake.code, 1);
  for (const r of [g, b, fake]) noSecrets(r.text, "main");
});

test("الحدّ المحلي: ثلاث مكالمات ثم الرابعة 3 بلا نداء شبكة، وتتحرّر بعد النافذة", async () => {
  const env = freshEnv();
  for (let i = 0; i < RATE_LIMIT.calls; i += 1) {
    assert.equal((await capture(() => main(["تمّ"], env, async () => created()))).code, 0);
  }
  const fourth = await capture(() => main(["تمّ"], env, noFetch));
  assert.equal(fourth.code, 3);
  const now = 1_000_000_000;
  assert.equal(rateDecision([now - 1000, now - 2000, now - 3000], now).allowed, false);
  assert.equal(rateDecision([now - RATE_LIMIT.windowMs - 1, now - 2000], now).allowed, true);
  assert.equal(rateDecision("ليس مصفوفة", now).allowed, true);
  assert.equal(rateDecision([NaN, now + 5000, "x"], now).allowed, true);
});

test("وكيل الخروج: يُعاد التشغيل بـNODE_USE_ENV_PROXY عند وجود الوكيل فقط", () => {
  assert.equal(needsEnvProxyFlag({}), false);
  assert.equal(needsEnvProxyFlag({ HTTPS_PROXY: "http://127.0.0.1:9" }), true);
  assert.equal(needsEnvProxyFlag({ https_proxy: "http://127.0.0.1:9" }), true);
  assert.equal(
    needsEnvProxyFlag({ HTTPS_PROXY: "http://127.0.0.1:9", NODE_USE_ENV_PROXY: "1" }),
    false,
  );
});

function runCli(entry, args, extraEnv = {}) {
  const env = { ...process.env, ...freshEnv() };
  delete env.HTTPS_PROXY;
  delete env.https_proxy;
  delete env.NODE_USE_ENV_PROXY;
  Object.assign(env, extraEnv);
  return spawnSync(process.execPath, [entry, ...args], { env, encoding: "utf8", timeout: 15_000 });
}

test("CLI: يعمل عبر رابطٍ رمزيّ (لا صمتَ بخروج 0)", () => {
  const dir = mkdtempSync(join(tmpdir(), "owner-call-link-"));
  const link = join(dir, "link.mjs");
  symlinkSync(SCRIPT, link);
  const r = runCli(link, ["--dry-run", "اختبار"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /تجربة بلا اتصال/);
  noSecrets(r.stdout + r.stderr, "CLI");
});

function bootTrace() {
  const dir = mkdtempSync(join(tmpdir(), "owner-call-boot-"));
  const preload = join(dir, "boot.mjs");
  writeFileSync(
    preload,
    'process.stderr.write("BOOT=" + (process.env.NODE_USE_ENV_PROXY ?? "unset") + "\\n");\n',
  );
  return `--import=${pathToFileURL(preload).href}`;
}

const bootLines = (r) => r.stderr.split("\n").filter((l) => l.startsWith("BOOT="));

test("CLI: مع الوكيل عمليتان بالضبط (الأب بلا المتغيّر ثم الابن =1) ولا حلقة", () => {
  const r = runCli(SCRIPT, ["--dry-run", "اختبار"], {
    HTTPS_PROXY: "http://127.0.0.1:9",
    NODE_OPTIONS: bootTrace(),
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /تجربة بلا اتصال/);
  assert.deepEqual(bootLines(r), ["BOOT=unset", "BOOT=1"]);
});

test("CLI: بلا وكيل عملية واحدة، ومع المتغيّر مضبوطًا عملية واحدة بـ=1", () => {
  const none = runCli(SCRIPT, ["--dry-run", "اختبار"], { NODE_OPTIONS: bootTrace() });
  assert.equal(none.status, 0);
  assert.deepEqual(bootLines(none), ["BOOT=unset"]);
  const preset = runCli(SCRIPT, ["--dry-run", "اختبار"], {
    HTTPS_PROXY: "http://127.0.0.1:9",
    NODE_USE_ENV_PROXY: "1",
    NODE_OPTIONS: bootTrace(),
  });
  assert.equal(preset.status, 0);
  assert.deepEqual(bootLines(preset), ["BOOT=1"]);
});

test("placeCall: المهلة مفعَّلة (init.signal من نوع AbortSignal)", async () => {
  let signal = null;
  await placeCall(readConfig(freshEnv()), "x", async (_url, init) => {
    signal = init.signal;
    return created();
  });
  assert.ok(signal instanceof AbortSignal);
});

test("الإخفاق المبهم (مهلة/جسم 201 مقطوع) يُعدّ في الحدّ ويُصاغ «لم يُؤكَّد»، والرفض الصريح لا يُعدّ", async () => {
  const env = freshEnv();
  const timeout = async () => {
    throw Object.assign(new Error("t"), { name: "TimeoutError" });
  };
  const first = await capture(() => main(["تمّ"], env, timeout));
  assert.equal(first.code, 1);
  assert.match(first.text, /لم يُؤكَّد إنشاء المكالمة/);
  const cut = await capture(() =>
    main(["تمّ"], env, async () => ({ ok: true, status: 201, json: async () => ({}) })),
  );
  assert.match(cut.text, /لم يُؤكَّد إنشاء المكالمة/);
  await capture(() => main(["تمّ"], env, timeout));
  assert.equal((await capture(() => main(["تمّ"], env, noFetch))).code, 3);

  const clean = freshEnv();
  const refused = async () => ({ ok: false, status: 401, json: async () => ({ code: 20003 }) });
  for (let i = 0; i < RATE_LIMIT.calls + 2; i += 1) {
    const r = await capture(() => main(["تمّ"], clean, refused));
    assert.equal(r.code, 1);
    assert.match(r.text, /لم تُجرَ المكالمة/);
  }
});

test("لا رقمَ هاتفيٍّ مكتوبًا في المصدر ولا الاختبار ولا الوثائق ولا .env.example", () => {
  const files = [
    "scripts/notify-owner-call.mjs",
    "scripts/notify-owner-call.regression.test.mjs",
    "docs/operations/OWNER_CALL_SETUP_AR.md",
    "docs/operations/AGENT_COORDINATION_AR.md",
    "AGENTS.md",
    ".env.example",
  ];
  const phone = /\+\d{8,}|966\d{6,}|\b05\d{8}\b/;
  for (const f of files) {
    assert.equal(phone.test(readFileSync(join(ROOT, f), "utf8")), false, `${f}: رقمٌ مكتوب`);
  }
  const claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  const start = claude.indexOf("## الإشعار الهاتفي للمالك");
  assert.ok(start >= 0, "قسم CLAUDE.md غائب");
  const end = claude.indexOf("\n## ", start + 5);
  assert.equal(phone.test(claude.slice(start, end)), false, "CLAUDE.md: رقمٌ مكتوب في القسم");
});
