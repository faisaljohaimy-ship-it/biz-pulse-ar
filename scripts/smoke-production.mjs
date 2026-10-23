/**
 * فحص دخان الإنتاج لمسار سَدِيد (VIBE 5.1) — يُشغَّل من شبكة GitHub لا من جلسة
 * التطوير (المحجوبة عن النطاق المنشور).
 *
 * ما يُقاس فعلًا على الموقع الحيّ:
 *   H1 `/api/public/health`  — القاعدة ومخزن حدّ المعدّل والقاطع (البناء الجديد يُسمّي
 *                              `rate_limit_storage`؛ غيابه = بناءٌ منشور أقدم من 91e2544).
 *   H2 `/api/chat/health`    — المزوّد مهيّأ.
 *   A1 مصادقة لا تُتجاوز     — Bearer تالف ⇐ 401 قبل أيّ نموذج.
 *   C1 سؤال عربي (زائر)      — 200، نصّ عربي، لا رمز خام، لا اسم مورّد، ترويستا
 *                              X-SADEED-Gate / X-SADEED-Reply-Source، وزمن أوّل بايت.
 *                              model-error أو خطأ داخل البثّ = fail ولو كان HTTP 200.
 *                              الردّ المحلي = warn، لا إثبات إجابة من نموذج.
 *   C2 التكرار الجاري        — طلبان متطابقان معًا ⇐ أحدهما 429 `duplicate_request`
 *                              مع Retry-After (غير حاسم إن أُنهي الأوّل قبل وصول الثاني).
 *   C3 (EXHAUSTIVE=1)        — سبعة طلبات متتابعة من المصدر نفسه: مع مخزنٍ معطّل
 *                              (gate=degraded) يُتوقَّع 429 `rate_limited` بالسابع.
 *
 * الخروج: 1 عند أيّ «fail». قاعدةٌ معطّلة تُكتب «degraded (infra)» لا «fail» — إلا
 * مع STRICT=1 — لأنها ليست عيبَ شيفرة، وهذا الفحص لا يكذب في الاتجاهين.
 *
 *   B1 معرّف البناء          — أيّ commit يخدمه الموقع (`/api/public/health` أو
 *                              `/build-info.json`)؛ مع `EXPECTED_SHA` يصير حكمًا.
 *
 *   PRODUCTION_URL=https://example.com node scripts/smoke-production.mjs
 *   EXHAUSTIVE=1 STRICT=1 PRODUCTION_URL=… node scripts/smoke-production.mjs
 *   EXPECTED_SHA=<sha> PRODUCTION_URL=… node scripts/smoke-production.mjs
 */
import { writeFileSync } from "node:fs";

const BASE = (process.env.PRODUCTION_URL || "").replace(/\/$/, "");
const EXHAUSTIVE = /^(1|true)$/i.test(process.env.EXHAUSTIVE ?? "");
const STRICT = /^(1|true)$/i.test(process.env.STRICT ?? "");
if (!BASE) {
  console.error("PRODUCTION_URL غير محدَّد — لا شيء يُفحص.");
  process.exit(1);
}

const UA = "sadeed-smoke/1.0 (+production-smoke.yml)";
const HAS_ARABIC = /[؀-ۿ]/;
const VENDOR = /gemini|google|openai|anthropic|lovable/i;
const results = [];
const note = (id, status, detail) => {
  results.push({ id, status, detail });
  const mark = { pass: "✓", fail: "✗", warn: "△", info: "·" }[status] ?? "?";
  console.log(`${mark} ${id}: ${detail}`);
};

async function getJson(path, timeoutMs = 15_000) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, {
      headers: { "user-agent": UA, "cache-control": "no-cache" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ليس JSON */
    }
    return { ok: true, status: res.status, json, text, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      ms: Math.round(performance.now() - t0),
    };
  }
}

function chatBody(text, threadId) {
  return JSON.stringify({
    messages: [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] }],
    threadId,
  });
}

/** يرسل سؤالًا ويقرأ البثّ كاملًا؛ يعيد النصّ المعروض والترويسات والأزمنة. */
async function chat(text, threadId, { headers = {}, timeoutMs = 60_000 } = {}) {
  const t0 = performance.now();
  let ttfb = null;
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA, ...headers },
      body: chatBody(text, threadId),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const reader = res.body?.getReader();
    const dec = new TextDecoder();
    let raw = "";
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (ttfb === null) ttfb = Math.round(performance.now() - t0);
        raw += dec.decode(value, { stream: true });
      }
    }
    raw += dec.decode();
    let shown = "";
    let code = null;
    let errorText = null;
    if (res.headers.get("content-type")?.includes("application/json")) {
      try {
        const j = JSON.parse(raw);
        code = typeof j.code === "string" ? j.code : typeof j.error === "string" ? j.error : null;
        errorText =
          typeof j.message_ar === "string"
            ? j.message_ar
            : typeof j.error === "string"
              ? j.error
              : null;
      } catch {
        /* جسم غير JSON */
      }
    } else {
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "text-delta" && typeof ev.delta === "string") shown += ev.delta;
          // A partial Arabic answer followed by a stream failure is not a successful reply.
          if (ev.type === "error" || ev.type === "abort" || ev.finishReason === "error") {
            code = "stream_error";
            errorText = "فشل البثّ أو أُوقف قبل اكتمال الردّ";
          }
        } catch {
          /* سطر غير JSON ([DONE]) */
        }
      }
    }
    return {
      ok: true,
      status: res.status,
      ttfbMs: ttfb,
      totalMs: Math.round(performance.now() - t0),
      gate: res.headers.get("x-sadeed-gate"),
      auth: res.headers.get("x-sadeed-auth"),
      source: res.headers.get("x-sadeed-reply-source"),
      requestId: res.headers.get("x-sadeed-request-id"),
      retryAfter: res.headers.get("retry-after"),
      code,
      errorText,
      shown,
      rawHead: raw.slice(0, 160),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      totalMs: Math.round(performance.now() - t0),
    };
  }
}

const QUESTION = "ما إجراءات السلامة الواجبة قبل تصريح عمل ساخن في محطة تحويل؟";

// ── H1 ─────────────────────────────────────────────────────────────────────────
const h1 = await getJson("/api/public/health");
let dbStatus = "unknown";
let storageStatus = "unknown";
if (!h1.ok) {
  note("H1 public/health", "fail", `لم يردّ خلال المهلة: ${h1.error} (${h1.ms} مللي ثانية)`);
} else if (!h1.json?.subsystems) {
  note(
    "H1 public/health",
    "fail",
    `جسمٌ غير متوقَّع (http ${h1.status}): ${h1.text.slice(0, 120)}`,
  );
} else {
  const s = h1.json.subsystems;
  dbStatus = s.db?.status ?? "unknown";
  storageStatus = s.rate_limit_storage?.status ?? "absent";
  if (!s.rate_limit_storage) {
    note(
      "H1 public/health",
      "fail",
      `لا حقل rate_limit_storage — البناء المنشور أقدم من VIBE 5.1 (http ${h1.status}, ${h1.ms} مللي ثانية)`,
    );
  } else {
    const healthy = h1.status === 200 && dbStatus === "ok" && storageStatus === "ok";
    note(
      "H1 public/health",
      healthy ? "pass" : STRICT ? "fail" : "warn",
      `http ${h1.status} في ${h1.ms} مللي ثانية — db=${dbStatus}${s.db?.detail ? ` (${s.db.detail})` : ""} · rate_limit_storage=${storageStatus} (${s.rate_limit_storage.detail ?? ""}) · gemini=${s.gemini?.status}`,
    );
  }
}

// ── B1 معرّف البناء ─────────────────────────────────────────────────────────
// يشهد أيَّ commit يخدمه الموقع: من `/api/public/health` (مدمجٌ وقت البناء) أو من
// الملفّ الثابت `/build-info.json`. `EXPECTED_SHA` (اختياري) يحوّل الشهادة إلى
// حكم: مطابق ⇐ pass، مختلف ⇐ fail. غيابه كلّه ⇐ warn: المنشئ لم يشغّل `prebuild`
// أو البناء أقدم — لا رقم يُخمَّن.
{
  const expected = (process.env.EXPECTED_SHA || "").trim().toLowerCase();
  let build =
    h1.ok && h1.json?.build && typeof h1.json.build.sha === "string" ? h1.json.build : null;
  let origin = "health";
  if (!build) {
    const bi = await getJson("/build-info.json", 10_000);
    if (bi.ok && bi.status === 200 && typeof bi.json?.sha === "string") {
      build = bi.json;
      origin = "static";
    }
  }
  if (!build || build.sha === "unknown") {
    note(
      "B1 build-id",
      expected ? "fail" : "warn",
      build
        ? `معرّف البناء «unknown» — المنشئ لم يجد git ولا متغيّر SHA (source=${build.source ?? "—"})`
        : "لا معرّف بناء — المنشئ لم يشغّل prebuild أو البناء المنشور أقدم من هذه الدفعة",
    );
  } else if (expected) {
    const sha = String(build.sha).toLowerCase();
    const match = sha.startsWith(expected) || expected.startsWith(sha);
    note(
      "B1 build-id",
      match ? "pass" : "fail",
      match
        ? `الموقع يخدم ${sha.slice(0, 9)} (${build.ref ?? "—"}, ${build.builtAt ?? build.built_at ?? "—"}) = المتوقَّع`
        : `الموقع يخدم ${sha.slice(0, 9)} والمتوقَّع ${expected.slice(0, 9)} — نشرٌ لم يقع أو سبقته دفعة`,
    );
  } else {
    note(
      "B1 build-id",
      "info",
      `الموقع يخدم ${String(build.sha).slice(0, 9)} (${build.ref ?? "—"}, ${build.builtAt ?? build.built_at ?? "—"}, عبر ${origin})`,
    );
  }
}

// ── H2 ─────────────────────────────────────────────────────────────────────────
const h2 = await getJson("/api/chat/health");
if (h2.ok && h2.status === 200 && h2.json?.ok === true && h2.json.key_present === true) {
  // `gate` منذ R3 (DEF-11): حال البوّابة كما تراها شارة سَدِيد — وغيابه بناءٌ منشور أقدم.
  note(
    "H2 chat/health",
    "pass",
    `المزوّد مهيّأ (${h2.json.provider}) · gate=${h2.json.gate ?? "— (بناءٌ أقدم من R3)"} في ${h2.ms} مللي ثانية`,
  );
} else if (h2.ok && h2.status === 200 && h2.json?.ok === true && h2.json.mode === "zero_cost") {
  // الوضع الحتمي بلا تكلفة (٢٠٢٦/١٠/١٨) حالةٌ مقصودة لا عطل: العدّ والمرجع والمساعدة
  // والتنقّل تعمل بلا مفتاح، وما يحتاج التحليل اللغوي يُجاب بردٍّ صادق. تحذيرٌ لا سقوط.
  note(
    "H2 chat/health",
    "warn",
    `وضع بلا تكلفة — لا محرّك تحليل مهيّأ (selected=${h2.json.selected ?? "—"}) · gate=${h2.json.gate ?? "—"}؛ الطبقات الحتمية جاهزة`,
  );
} else {
  note("H2 chat/health", "fail", h2.ok ? `http ${h2.status}: ${h2.text.slice(0, 120)}` : h2.error);
}

// ── A1 المصادقة لا تُتجاوز ───────────────────────────────────────────────────
const a1 = await chat(QUESTION, crypto.randomUUID(), {
  headers: { authorization: "Bearer invalid.smoke.token.long.enough.for.the.guard" },
  timeoutMs: 30_000,
});
if (a1.ok && a1.status === 401) {
  note("A1 auth", "pass", `Bearer تالف ⇐ 401 خلال ${a1.totalMs} مللي ثانية (قبل أيّ نموذج)`);
} else if (a1.ok && a1.status === 200 && a1.auth === "unverified") {
  note(
    "A1 auth",
    "warn",
    `خدمة المصادقة لا تجيب خلال المهلة — خُدم زائرًا (X-SADEED-Auth=unverified) في ${a1.totalMs} مللي ثانية؛ لا صلاحية جلسةٍ مُنحت`,
  );
} else if (a1.ok && a1.status === 200 && a1.source === "local-guaranteed") {
  note("A1 auth", "warn", "لا مفتاح مزوّد على الخادم — الردّ المحلّي يسبق فحص الجلسة");
} else if (a1.ok && a1.status === 200 && a1.source === "local-quota-unverified") {
  // الخلفية موقوفة: المخزن لا يجيب فالبوّابة مغلقة وردٌّ محلّي بلا نموذج. حالة بنية
  // تحتية لا عيب شيفرة — ولا صلاحية مُنحت (X-SADEED-Auth لا تكون verified هنا).
  note(
    "A1 auth",
    a1.auth === "verified" ? "fail" : "warn",
    `البوّابة مغلقة (gate=${a1.gate ?? "—"}, auth=${a1.auth ?? "—"}) — ردٌّ محلّي بلا نموذج خلال ${a1.totalMs} مللي ثانية؛ degraded (infra): المخزن معطّل، ولا صلاحية جلسةٍ مُنحت`,
  );
} else {
  note(
    "A1 auth",
    "fail",
    a1.ok ? `http ${a1.status} (${a1.source ?? a1.code ?? a1.rawHead})` : a1.error,
  );
}

// ── C1 سؤال عربي ───────────────────────────────────────────────────────────────
const c1 = await chat(QUESTION, crypto.randomUUID());
let gateMode = null;
if (!c1.ok) {
  note("C1 chat", "fail", `لم يُجَب: ${c1.error}`);
} else {
  gateMode = c1.gate;
  const problems = [];
  if (c1.status !== 200) problems.push(`http ${c1.status} (${c1.code ?? c1.rawHead})`);
  if (!c1.gate) problems.push("لا ترويسة X-SADEED-Gate (بناءٌ أقدم من VIBE 5.1؟)");
  if (!c1.source) problems.push("لا ترويسة X-SADEED-Reply-Source");
  if (c1.source === "model-error") problems.push("فشل النموذج (model-error)، لا إجابة ناجحة");
  if (c1.code || c1.errorText) problems.push("الاستجابة تحتوي خطأً أو بثًّا غير مكتمل");
  if (!HAS_ARABIC.test(c1.shown)) problems.push("النصّ المعروض ليس عربيًّا");
  if (/rate_limit_unavailable|quota_unavailable/.test(c1.shown)) problems.push("رمزٌ خام في النصّ");
  if (VENDOR.test(c1.shown)) problems.push("اسم مورّد في النصّ المعروض");
  if (problems.length) {
    note("C1 chat", "fail", problems.join(" · "));
  } else if (c1.source !== "model") {
    note("C1 chat", "warn", `ردّ بديل (source=${c1.source}) — لا يثبت نجاح استجابة النموذج`);
  } else {
    note(
      "C1 chat",
      "pass",
      `200 · gate=${c1.gate} · source=${c1.source} · TTFB ${c1.ttfbMs} مللي ثانية · الكلّي ${c1.totalMs} · «${c1.shown.slice(0, 70)}…»`,
    );
  }
}

// ── C2 التكرار الجاري ──────────────────────────────────────────────────────────
{
  const thread = crypto.randomUUID();
  const q = `${QUESTION} (تكرار)`;
  const [p, s] = await Promise.all([chat(q, thread), chat(q, thread)]);
  const statuses = [p, s].map((r) => (r.ok ? r.status : "ERR")).sort();
  const dup = [p, s].find((r) => r.ok && r.status === 429 && r.code === "duplicate_request");
  if (dup) {
    note(
      "C2 duplicate",
      "pass",
      `أحد الطلبين 429 duplicate_request · Retry-After=${dup.retryAfter ?? "—"} · الآخر ${statuses.find((x) => x !== 429)}`,
    );
  } else if (statuses.every((x) => x === 200)) {
    note("C2 duplicate", "warn", "كلاهما 200 — الأوّل أُنهي قبل وصول الثاني (غير حاسم، لا عيب)");
  } else {
    note(
      "C2 duplicate",
      "fail",
      `حالات غير متوقَّعة: ${statuses.join(",")} · ${[p, s].map((r) => r.code ?? r.error ?? "").join(" / ")}`,
    );
  }
}

// ── C3 سقف المعدّل (اختياري، يُنفق نداءات نموذج) ───────────────────────────────
if (EXHAUSTIVE) {
  const thread = crypto.randomUUID();
  let limited = null;
  for (let i = 1; i <= 7; i++) {
    const r = await chat(`${QUESTION} رقم ${i}`, thread, { timeoutMs: 45_000 });
    if (r.ok && r.status === 429 && r.code === "rate_limited") {
      limited = { i, retryAfter: r.retryAfter };
      break;
    }
  }
  if (gateMode === "degraded") {
    if (limited)
      note(
        "C3 rate-limit",
        "pass",
        `المخزن معطّل: 429 rate_limited عند الطلب ${limited.i} · Retry-After=${limited.retryAfter ?? "—"}`,
      );
    else
      note(
        "C3 rate-limit",
        "fail",
        "المخزن معطّل ولم يظهر 429 خلال سبعة طلبات — الحدّ في الذاكرة لا يعمل",
      );
  } else {
    note(
      "C3 rate-limit",
      limited ? "warn" : "info",
      limited
        ? `429 عند الطلب ${limited.i} رغم مخزنٍ سليم (حدّ 12/300 ث للزائر)`
        : "مخزنٌ سليم: لا 429 متوقَّع تحت 12 طلبًا — لم يُختبر السقف الحقيقي",
    );
  }
} else {
  note("C3 rate-limit", "info", "متخطّى (EXHAUSTIVE غير مفعَّل) — يُنفق حتى 7 نداءات نموذج");
}

// ── القاعدة: الخلاصة ──────────────────────────────────────────────────────────
if (
  h1.ok &&
  h1.status === 200 &&
  dbStatus === "ok" &&
  storageStatus === "ok" &&
  gateMode === "verified"
) {
  note("DB", "pass", "القاعدة تجيب ومخزن الحدّ متحقَّق (gate=verified)");
} else {
  const detail = `db=${dbStatus} · rate_limit_storage=${storageStatus} · gate=${gateMode ?? "—"} — لم تثبت سلامة جميع مكونات الخلفية في هذا الفحص`;
  note("DB", STRICT ? "fail" : "warn", `degraded (infra): ${detail}`);
}

// ── الخلاصة والملفّات ─────────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === "fail");
const lines = [
  `### فحص دخان سَدِيد — ${BASE}`,
  "",
  "| الفحص | الحالة | التفصيل |",
  "| --- | --- | --- |",
  ...results.map((r) => `| ${r.id} | ${r.status} | ${r.detail.replace(/\|/g, "\\|")} |`),
  "",
  failed.length
    ? `**✗ ${failed.length} فحص ساقط.**`
    : "**✓ لم يرصد هذا الفحص فشلًا؛ راجع التحذيرات والمتخطّى — ليس اعتمادًا شاملًا.**",
];
writeFileSync("smoke-summary.md", lines.join("\n") + "\n");
writeFileSync(
  "smoke-result.json",
  JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2),
);
console.log(
  `\n${failed.length ? "FAIL" : "OK"} — ${results.length} checks, ${failed.length} failed`,
);
process.exit(failed.length ? 1 : 0);
