#!/usr/bin/env node
/**
 * مكالمة هاتفية صوتية للمالك وحده بملخّص العمل (أمر المالك ٢٠٢٦/١٠/٣٠).
 *
 *   node scripts/notify-owner-call.mjs "انتهى العمل: نُشر التغيير وفحص الإنتاج أخضر."
 *   node scripts/notify-owner-call.mjs --dry-run "نصّ تجريبي"
 *
 * خارج التطبيق: لا يُبنى في الحزمة ولا يخدمه الموقع. يقرأ أربعة متغيّرات بيئة (أسماؤها فقط
 * في المستودع، **قيمها في إعدادات البيئة السحابية لا في git ولا في المحادثة**):
 *   TWILIO_ACCOUNT_SID   معرّف حساب Twilio (AC…)
 *   TWILIO_AUTH_TOKEN    رمز المصادقة
 *   TWILIO_FROM_NUMBER   رقم Twilio القادر على الصوت (E.164)
 *   SADEED_OWNER_PHONE   رقم المالك (E.164) — **المتّصَل به الوحيد**
 *
 * ثوابت الأمان (يحرسها `notify-owner-call.regression.test.mjs`):
 * ١) لا وسيط يغيّر المتّصَل به: الرقم من البيئة وحدها، فلا يصلح السكربت لمكالمة غير المالك.
 * ٢) نصّ الرسالة يُرفض إن بدا فيه سرٌّ (مفتاح/رمز/سلسلة طويلة)، فلا يُنطق سرٌّ في مكالمة.
 * ٣) الرسالة محدودة الطول (قبل الهروب وبعده)، وتُنطق مرّتين (يفوت أول الكلام عند الردّ).
 * ٤) لا يطبع السكربت رقمًا ولا رمزًا ولا ترويسة مصادقة. ولا يطبع من ردّ Twilio إلا: رمزَ خطأ عددًا صحيحًا،
 *    وحالةً من قائمة بيضاء، ومعرّفَ مكالمةٍ بصيغة CA+32 hex.
 * ٥) غياب أي متغيّر ⇒ يخرج 2 برسالة عربية ولا يُجري شيئًا (لا مكالمة ولا نداء شبكة).
 * ٦) **«نجحت» لا تُقال إلا عن ردّ 201 بمعرّف مكالمة سليم.** أي ردٍّ آخر (200 بلا معرّف، صفحة حجب، جسم مقطوع،
 *    إعادة توجيه) ⇒ خروج 1. وخروج 0 يعني «وُضعت في طابور Twilio» لا «سُلّمت»: لا يُدَّعى الإبلاغ بناءً عليه وحده.
 * ٧) حدّ محلي: ثلاث مكالمات كل ١٥ دقيقة، لئلّا يحرق حلقةٌ خاطئة الرصيد.
 *
 * تشغيله من بيئة الجلسة السحابية: `fetch` المدمج في Node لا يستعمل وكيل الخروج إلا مع
 * `NODE_USE_ENV_PROXY=1` (يلزم Node ≥ 22.21). فنقطة الدخول تعيد تشغيل نفسها به تلقائيًّا إن وجدت `HTTPS_PROXY`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MAX_MESSAGE_CHARS = 500;
/** سقف النصّ بعد هروب XML (&apos; = ٦ محارف): يُبقي الـTwiml كاملًا (رسالتان) دون ٤٠٠٠ حرف. */
export const MAX_ESCAPED_CHARS = 1500;
export const RATE_LIMIT = { calls: 3, windowMs: 15 * 60 * 1000 };
const E164 = /^\+[1-9]\d{7,14}$/;
const TWILIO_SID = /^AC[0-9a-fA-F]{32}$/;
const CALL_SID = /^CA[0-9a-fA-F]{32}$/;
const CALL_STATUSES = new Set([
  "queued",
  "ringing",
  "in-progress",
  "completed",
  "busy",
  "failed",
  "no-answer",
  "canceled",
]);
/** أنماط تدلّ على سرٍّ لا يجوز نطقه في مكالمة. */
const SECRET_SHAPES = [
  /\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{16,}/i,
  /\beyJ[A-Za-z0-9_-]{16,}/,
  /\bBearer\s+\S{8,}/i,
  /\bGOCSPX-[A-Za-z0-9_-]{8,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\b(?:AC|SK)[0-9a-fA-F]{32}\b/,
  /\b[0-9a-fA-F]{32,}\b/,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}(?![A-Za-z0-9])/,
  /(?:token|secret|password|passwd|api[_-]?key|كلمة\s*المرور|السرّ|السر)\s*[:=]\s*\S{6,}/i,
];

const xmlEscape = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** نصّ آمن للنطق أو سبب الرفض. لا يعدّل المعنى: يطوي الفراغات فقط. */
export function validateMessage(raw) {
  if (typeof raw !== "string") return { ok: false, reason: "الرسالة ليست نصًّا." };
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "الرسالة فارغة." };
  if ([...text].length > MAX_MESSAGE_CHARS) {
    return { ok: false, reason: `الرسالة أطول من ${MAX_MESSAGE_CHARS} حرفًا.` };
  }
  if (SECRET_SHAPES.some((re) => re.test(text))) {
    return { ok: false, reason: "الرسالة تحوي ما يشبه سرًّا أو رمزًا؛ لا يُنطق في مكالمة." };
  }
  if (xmlEscape(text).length > MAX_ESCAPED_CHARS) {
    return { ok: false, reason: "الرسالة تتضخّم بعد الهروب؛ اختصرها أو خفّف الرموز." };
  }
  return { ok: true, text };
}

/** قراءة البيئة والتحقق من شكلها. لا تُعيد قيمًا في رسائل الخطأ. */
export function readConfig(env = process.env) {
  const missing = [];
  const need = (name) => {
    const v = (env[name] ?? "").trim();
    if (!v) missing.push(name);
    return v;
  };
  const sid = need("TWILIO_ACCOUNT_SID");
  const token = need("TWILIO_AUTH_TOKEN");
  const from = need("TWILIO_FROM_NUMBER");
  const owner = need("SADEED_OWNER_PHONE");
  if (missing.length) return { ok: false, reason: `متغيّرات ناقصة: ${missing.join("، ")}.` };
  if (!TWILIO_SID.test(sid)) return { ok: false, reason: "TWILIO_ACCOUNT_SID بشكلٍ غير صالح." };
  if (!E164.test(from)) return { ok: false, reason: "TWILIO_FROM_NUMBER ليس بصيغة E.164." };
  if (!E164.test(owner)) return { ok: false, reason: "SADEED_OWNER_PHONE ليس بصيغة E.164." };
  if (from === owner) return { ok: false, reason: "رقم المرسِل والمتّصَل به متطابقان." };
  return { ok: true, sid, token, from, owner };
}

/** TwiML بصوت عربي (Polly.Zeina)، الرسالة مرّتين بينهما وقفة. */
export function buildTwiml(text) {
  const say = `<Say voice="Polly.Zeina" language="arb">${xmlEscape(text)}</Say>`;
  return `<Response>${say}<Pause length="2"/>${say}</Response>`;
}

/** الطلب إلى Twilio كما سيُرسل — دالّة صرفة للاختبار. */
export function buildRequest(config, text) {
  const body = new URLSearchParams({
    To: config.owner,
    From: config.from,
    Twiml: buildTwiml(text),
    Timeout: "40",
  });
  return {
    url: `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Calls.json`,
    init: {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.sid}:${config.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
  };
}

/** يضع الاتصال ويعيد ملخّصًا بلا أرقام ولا أسرار. النجاح = 201 + معرّف مكالمة سليم فقط. */
export async function placeCall(config, text, fetchImpl = fetch) {
  const { url, init } = buildRequest(config, text);
  let res;
  try {
    res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    const name =
      typeof err?.name === "string" && /^[A-Za-z]{3,40}$/.test(err.name) ? err.name : "خطأ شبكة";
    return { ok: false, ambiguous: true, reason: `تعذّر تأكيد الوصول إلى Twilio (${name}).` };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.status !== 201) {
    const code = Number.isInteger(json?.code) ? ` رمز ${json.code}` : "";
    const status = Number.isInteger(res.status) ? res.status : "؟";
    return { ok: false, reason: `ردّ Twilio غير المتوقَّع (HTTP ${status}${code}).` };
  }
  if (typeof json?.sid !== "string" || !CALL_SID.test(json.sid)) {
    return {
      ok: false,
      ambiguous: true,
      reason: "ردّ Twilio بلا معرّف مكالمة سليم؛ لم يُؤكَّد الطلب.",
    };
  }
  const status = CALL_STATUSES.has(json.status) ? json.status : "queued";
  return { ok: true, sid: json.sid, status };
}

/** حدّ محلي: يقرأ طوابع الأوقات ويقرّر السماح. دالّة صرفة قدر الإمكان. */
export function rateDecision(stamps, now = Date.now(), limit = RATE_LIMIT) {
  const recent = (Array.isArray(stamps) ? stamps : []).filter(
    (t) => Number.isFinite(t) && now - t < limit.windowMs && t <= now,
  );
  return { allowed: recent.length < limit.calls, recent };
}

function loadStamps(path) {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  } catch {
    return [];
  }
}

export async function main(argv = process.argv.slice(2), env = process.env, fetchImpl = fetch) {
  const dryRun = argv.includes("--dry-run");
  const words = argv.filter((a) => a !== "--dry-run");
  const msg = validateMessage(words.join(" "));
  if (!msg.ok) {
    console.error(`لم تُجرَ المكالمة: ${msg.reason}`);
    return 2;
  }
  const config = readConfig(env);
  if (!config.ok) {
    console.error(`لم تُجرَ المكالمة: ${config.reason}`);
    return 2;
  }
  if (dryRun) {
    const { url } = buildRequest(config, msg.text);
    console.log(
      `تجربة بلا اتصال: الطلب سليم الشكل (${url.split("/Accounts/")[0]}/…/Calls.json)، الرسالة ${[...msg.text].length} حرفًا.`,
    );
    return 0;
  }
  const statePath = env.SADEED_OWNER_CALL_STATE || join(tmpdir(), "sadeed-owner-call-stamps.json");
  const now = Date.now();
  const decision = rateDecision(loadStamps(statePath), now);
  if (!decision.allowed) {
    console.error("لم تُجرَ المكالمة: بلغتَ حدّ ثلاث مكالمات كل ١٥ دقيقة.");
    return 3;
  }
  const result = await placeCall(config, msg.text, fetchImpl);
  // المحاولة المبهمة (مهلة، جسم مقطوع) قد تكون أنشأت مكالمة، فتُعدّ في الحدّ: لا تكرار فوريّ يضاعفها.
  if (result.ok || result.ambiguous) {
    try {
      writeFileSync(statePath, JSON.stringify([...decision.recent, now]));
    } catch {
      // الحدّ المحلي اجتهاد؛ فشل كتابته لا يُلغي مكالمةً وُضعت.
    }
  }
  if (!result.ok) {
    const lead = result.ambiguous
      ? "لم يُؤكَّد إنشاء المكالمة (قد تكون أُنشئت؛ لا تُعد المحاولة فورًا)"
      : "لم تُجرَ المكالمة";
    console.error(`${lead}: ${result.reason}`);
    return 1;
  }
  console.log(
    `وُضعت المكالمة في طابور Twilio: ${result.sid} (${result.status}). لا يعني هذا أنها سُلّمت.`,
  );
  return 0;
}

/** هل نحتاج إعادة التشغيل بـNODE_USE_ENV_PROXY؟ (وكيل خروج موجود ولم يُفعَّل لـfetch). */
export function needsEnvProxyFlag(env = process.env) {
  const proxy = env.HTTPS_PROXY || env.https_proxy;
  return Boolean(proxy) && env.NODE_USE_ENV_PROXY !== "1";
}

function isDirectRun() {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return (
      pathToFileURL(realpathSync(entry)).href ===
      pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
    );
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  if (needsEnvProxyFlag()) {
    const child = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
      {
        stdio: "inherit",
        env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
      },
    );
    process.exit(child.status ?? 1);
  }
  main()
    .then((code) => process.exit(code))
    .catch(() => {
      console.error("لم تُجرَ المكالمة: خطأ غير متوقَّع.");
      process.exit(1);
    });
}
