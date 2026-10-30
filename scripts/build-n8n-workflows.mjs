#!/usr/bin/env node
/**
 * مولّد مسارات n8n: يبني `n8n/workflows/*.json` و`n8n/README.md` من `n8n/code/*.js`.
 *
 *   node scripts/build-n8n-workflows.mjs                 يكتب ملف prod إلى n8n/workflows
 *   node scripts/build-n8n-workflows.mjs --profile=stub  يكتب إلى n8n/workflows.stub (غير متعقَّب)
 *   node scripts/build-n8n-workflows.mjs --check         يقارن المتعقَّب بالمولَّد ويفشل عند الفرق
 *
 * الملفّان:
 *   prod  عناوين المزوّدين الحقيقية + أسماء اعتماد فقط + أماكن متغيّرات البيئة. لا سرّ.
 *   stub  المضيفون كلّهم إلى خادم اختبار محلي (http://127.0.0.1:8787/stub/<host>)
 *         وبلا اعتماد، لتجربة n8n حقيقي بلا إنترنت ولا مفاتيح.
 *
 * حتمي: المفاتيح مرتَّبة، المعرّفات مشتقّة من اسم المسار واسم العقدة، لا وقت ولا عشوائية.
 * بلا اعتماديات جديدة: Node المدمج فقط. لم يُشغَّل الناتج على n8n حقيقي (لا نسخة متاحة).
 *
 * قيد n8n الذي صُمّم حوله: n8n ينفّذ فروع المخرج الواحد بالتتابع لا بالتوازي، من الأعلى
 * يسارًا (قراءة من مصدر workflow-execute.ts: ترتيب (y ثم x) لا ترتيب الاتصالات). لذلك:
 * المزوّدون بمفتاح فوق الدفعة بلا مفتاح في الإحداثيات (فيُنفَّذون أولًا)، وأول عقدة في كل
 * فرع بوّابة زمنية تحسب ما تبقّى من الموعد الداخلي وتسلّم مهلة النداء (`timeoutMs`) التي
 * يقرأها عقدة HTTP تعبيرًا، وكل مزوّد بلا مفتاح يُجمع في عقدة HTTP واحدة بدفعات متزامنة.
 * فالأسوأ محسوب من الميزانية المتبقّية، لا من افتراض التوازي.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CODE_DIR = join(ROOT, "n8n", "code");

const { FLAVORS } = require("../n8n/code/plan-queries.js");
const { CATALOG } = require("../n8n/code/runner-dispatch.js");

export const STUB_BASE = "http://127.0.0.1:8787/stub";
export const WORKFLOW_FILES = {
  "sadeed-web-research": "sadeed-web-research.json",
  "fnn-dev-research": "fnn-dev-research.json",
  "fnn-automation-runner": "fnn-automation-runner.json",
  "watchdog-canary": "watchdog-canary.json",
  "error-handler": "error-handler.json",
  "nx-self-test": "nx-self-test.json",
};

/** اعتمادات n8n بالاسم فقط. القيمة تُدخل في n8n يدويًّا ولا تدخل المستودع. */
export const CREDENTIALS = {
  google: {
    type: "httpQueryAuth",
    name: "Nx Google Search Key",
    fill: "Name = key ، Value = مفتاح Programmable Search (واجهة JSON الرسمية)",
  },
  brave: {
    type: "httpHeaderAuth",
    name: "Nx Brave Search Key",
    fill: "Name = X-Subscription-Token ، Value = مفتاح Brave Search API",
  },
  tavily: {
    type: "httpHeaderAuth",
    name: "Nx Tavily Key",
    fill: "Name = Authorization ، Value = Bearer ثم مسافة ثم مفتاح Tavily",
  },
  github: {
    type: "httpHeaderAuth",
    name: "Nx GitHub Read Token",
    fill: "Name = Authorization ، Value = Bearer ثم رمز دقيق الصلاحيات للقراءة فقط",
  },
  telegramAlert: {
    type: "telegramApi",
    name: "Nx Telegram Alert Bot",
    fill: "رمز بوت تيليجرام لتنبيهات المراقبة والأخطاء",
  },
  telegramOwner: {
    type: "telegramApi",
    name: "Nx Telegram Owner Bot",
    fill: "رمز بوت تيليجرام لقناة المالك (يمكن أن يكون البوت نفسه)",
  },
  smtp: {
    type: "smtp",
    name: "Nx SMTP Alert",
    fill: "بيانات خادم البريد الصادر للتنبيهات (اختياري)",
  },
};

/** متغيّرات بيئة n8n. كلها اختيارية للقدرة عدا ما يشترطه تشغيل n8n نفسه. */
export const ENV_DOC = [
  ["N8N_ENCRYPTION_KEY", "مفتاح تشفير الاعتمادات. يُولَّد مرة ويُحفظ خارج المستودع."],
  ["WEBHOOK_URL", "العنوان العام لـn8n بـhttps وبشرطة أخيرة. منه يُبنى عنوان الويب هوك."],
  ["NODE_FUNCTION_ALLOW_BUILTIN", "القيمة crypto. بدونها تفشل عقد التحقق والتوقيع."],
  ["N8N_BLOCK_ENV_ACCESS_IN_NODE", "القيمة false. عقد Code تقرأ الأسرار والإعدادات من البيئة."],
  ["GENERIC_TIMEZONE", "القيمة Asia/Riyadh (وكذلك TZ)."],
  ["SADEED_N8N_SECRET", "سرّ مسار البحث (32 حرفًا فأكثر). هو نفسه في تطبيق سَدِيد."],
  ["FINN_N8N_SECRET", "سرّ مساري المطوّر والمشغّل (32 حرفًا فأكثر). سرّ مستقل عن السابق."],
  ["SADEED_APP_URL", "أصل التطبيق بـhttps وبلا شرطة أخيرة، لفحوص المراقب."],
  ["NX_GOOGLE_CX", "معرّف محرّك Programmable Search (ليس سرًّا). غيابه يعني تخطّي جوجل."],
  ["NX_ALERT_CHAT_ID", "معرّف محادثة تيليجرام للتنبيهات."],
  ["NX_OWNER_CHAT_ID", "معرّف محادثة تيليجرام للمالك (اختبار الإشعار)."],
  ["NX_ALERT_EMAIL_FROM", "مرسل بريد التنبيه (اختياري)."],
  ["NX_ALERT_EMAIL_TO", "مستلم بريد التنبيه (اختياري)."],
  ["NX_DEADMAN_URL", "عنوان نبض خدمة مراقبة خارجية. يُستدعى كل دقيقة من المراقب."],
  [
    "N8N_PAYLOAD_SIZE_MAX",
    "أقصى حجم لجسم الطلب بالميغابايت. الافتراضي 16 كما أعرفه من توثيق n8n ولم أتحقق على نسخة بعينها. أجسام التطبيق صغيرة (كلمات ورموز لا الجملة) فاجعله 1. التوقيع يغطي الجسم، فمن لا يملك السرّ يستطيع إجبار n8n على فكّ الجسم وحساب بصمته قبل الرفض. قيس خارج n8n (Node 22.22.0): نحو 220 مللي ثانية لجسم 16 ميغابايت و0.12 لجسم صغير. على n8n حقيقي: لم يُقَس.",
  ],
];

// ---------------------------------------------------------------------------
// أدوات بناء عامة
// ---------------------------------------------------------------------------

function stableId(seed) {
  const h = createHash("sha1").update(seed).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    "a" + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

export function stringify(value) {
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

const MODULE_VAR = {
  "verify-request": "VerifyRequest",
  "sign-response": "SignResponse",
  "plan-queries": "PlanQueries",
  "merge-rank": "MergeRank",
  "build-envelope": "BuildEnvelope",
  budget: "Budget",
  "canary-evaluate": "CanaryEvaluate",
  "runner-dispatch": "RunnerDispatch",
};

function moduleSource(name) {
  return readFileSync(join(CODE_DIR, name + ".js"), "utf8").trimEnd();
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}

/** يضمّن الوحدات حرفيًّا داخل IIFE (فلا تتصادم الأسماء) ثم يلحق الغراء. */
function codeText(modules, glue) {
  const blocks = modules.map(
    (name) =>
      "const " +
      MODULE_VAR[name] +
      " = (function () {\n  const module = { exports: {} };\n" +
      indent(moduleSource(name), 2) +
      "\n  return module.exports;\n})();",
  );
  return blocks.join("\n\n") + "\n\n" + glue.trim() + "\n";
}

function fill(template, vars) {
  let out = template;
  for (const key of Object.keys(vars)) out = out.split("__" + key + "__").join(vars[key]);
  return out;
}

class Builder {
  constructor(name, profile) {
    this.name = name;
    this.profile = profile;
    this.nodes = [];
    this.connections = {};
  }

  url(host, path) {
    return this.profile === "stub" ? STUB_BASE + "/" + host + path : "https://" + host + path;
  }

  add(name, type, typeVersion, parameters, extra = {}) {
    const node = {
      id: stableId(this.name + "|" + name),
      name,
      type,
      typeVersion,
      position: extra.position || [0, 0],
      parameters,
    };
    for (const key of ["onError", "alwaysOutputData", "webhookId", "notes"]) {
      if (extra[key] !== undefined) node[key] = extra[key];
    }
    if (extra.credentials && this.profile !== "stub") {
      const creds = {};
      for (const [type_, credName] of Object.entries(extra.credentials)) {
        creds[type_] = { id: null, name: credName };
      }
      node.credentials = creds;
    }
    this.nodes.push(node);
    return name;
  }

  code(name, modules, glue, position, onError = "continueErrorOutput") {
    return this.add(
      name,
      "n8n-nodes-base.code",
      2,
      { language: "javaScript", mode: "runOnceForAllItems", jsCode: codeText(modules, glue) },
      { position, onError: onError || undefined },
    );
  }

  link(from, to, output = 0, input = 0) {
    const entry = (this.connections[from] = this.connections[from] || { main: [] });
    while (entry.main.length <= output) entry.main.push([]);
    entry.main[output].push({ node: to, type: "main", index: input });
  }

  workflow(settings) {
    return {
      name: this.name,
      nodes: this.nodes,
      connections: this.connections,
      active: false,
      pinData: {},
      settings: Object.assign(
        {
          executionOrder: "v1",
          timezone: "Asia/Riyadh",
          saveDataErrorExecution: "all",
          saveDataSuccessExecution: "none",
          saveExecutionProgress: false,
          saveManualExecutions: true,
        },
        settings,
      ),
    };
  }
}

function conditionBlock(seed, leftValue, operator, rightValue) {
  return {
    options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
    conditions: [{ id: stableId(seed), leftValue, rightValue, operator }],
    combinator: "and",
  };
}

const OP_TRUE = { type: "boolean", operation: "true", singleValue: true };
const OP_EQUALS = { type: "string", operation: "equals" };

function ifNode(b, name, seed, leftValue, position, operator = OP_TRUE, rightValue = "") {
  return b.add(
    name,
    "n8n-nodes-base.if",
    2.2,
    {
      conditions: conditionBlock(b.name + "|" + seed, leftValue, operator, rightValue),
      options: {},
    },
    { position },
  );
}

const LITERAL_FALLBACK_BODY =
  '{"v":1,"ok":false,"code":"internal","requestId":"","degraded":true,"fetchedAt":"1970-01-01T00:00:00.000Z","providers":[],"results":[]}';
/**
 * خيارات تيليجرام لكل رسائلنا: وضع HTML (النصّ مهرَّب بـtoTelegramHtml) وبلا تذييل n8n.
 * الافتراضي في العقدة 1.2 هو Markdown القديم مع تذييل `_..._`، فشرطة سفلية مفردة في
 * gate_closed تُسقط الرسالة كلها عند تيليجرام.
 */
export const TELEGRAM_PLAIN_FIELDS = { appendAttribution: false, parse_mode: "HTML" };
const RUNNER_FALLBACK_BODY = '{"v":1,"ok":false,"code":"internal","requestId":"","result":null}';

function respondNodes(b, x, y, literalBody) {
  b.add(
    "Respond",
    "n8n-nodes-base.respondToWebhook",
    1.1,
    {
      respondWith: "text",
      responseBody: "={{ $json.body }}",
      options: {
        responseCode: 200,
        responseHeaders: {
          entries: [
            { name: "Content-Type", value: "application/json; charset=utf-8" },
            { name: "X-Nx-Resp-Ts", value: "={{ $json.respTs }}" },
            { name: "X-Nx-Resp-Sig", value: "={{ $json.respSig }}" },
          ],
        },
      },
    },
    { position: [x, y], onError: "continueRegularOutput" },
  );
  b.add(
    "Respond Fallback",
    "n8n-nodes-base.respondToWebhook",
    1.1,
    {
      respondWith: "text",
      responseBody: literalBody,
      options: {
        responseCode: 200,
        responseHeaders: {
          entries: [{ name: "Content-Type", value: "application/json; charset=utf-8" }],
        },
      },
    },
    { position: [x, y + 200], onError: "continueRegularOutput" },
  );
}

// ردّ نصّي كامل: n8n الحقيقي يضع المتن في json[outputPropertyName] (الافتراضي data)، لا في body.
// (HttpRequestV3.node.ts، فرع responseFormat === 'text' مع fullResponse). الاسم صريح هنا فلا
// يتغيّر بتغيّر الافتراضي، والشيفرة تقرأ data، والحارس يتحقق من الاثنين.
export const HTTP_BODY_FIELD = "data";
const HTTP_RESPONSE_OPTIONS = {
  fullResponse: true,
  neverError: true,
  outputPropertyName: HTTP_BODY_FIELD,
  responseFormat: "text",
};

/**
 * @param {object} spec {method, url, query?, headers?, body?, credential?, batchSize?}
 *   query وheaders تعبيرات JSON.stringify(...) أو نصّ JSON: عقدة HTTP تستدعي JSON.parse على
 *   حقلي jsonQuery وjsonHeaders، فكائن خام من تعبير مفرد يفشل فيها (jsonBody وحده يقبل الكائن).
 * @param {number|string} timeoutMs رقم ثابت أو تعبير ={{ $json.timeoutMs }} تسلّمه البوّابة
 */
function httpParams(spec, timeoutMs, profile) {
  // ملف stub بلا اعتماد: الخادم التجريبي لا يطلب مصادقة.
  const credential = profile === "stub" ? null : spec.credential;
  const p = {
    method: spec.method,
    url: spec.url,
    authentication: credential ? "genericCredentialType" : "none",
    options: { timeout: timeoutMs, response: { response: HTTP_RESPONSE_OPTIONS } },
  };
  if (credential) {
    p.genericAuthType = credential.type;
    // في الإصدار 4.2 تُرسَل الاعتمادات افتراضيًّا مع تحويل إلى أصل آخر (sendCredentialsOnCrossOriginRedirect)،
    // فلا تُتبع التحويلات على عقدة تحمل اعتمادًا: 3xx يُصنَّف error ولا يتسرّب مفتاح.
    p.options.redirect = { redirect: { followRedirects: false } };
  }
  if (spec.query)
    Object.assign(p, { sendQuery: true, specifyQuery: "json", jsonQuery: spec.query });
  if (spec.headers) {
    Object.assign(p, { sendHeaders: true, specifyHeaders: "json", jsonHeaders: spec.headers });
  }
  if (spec.body) {
    Object.assign(p, {
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: spec.body,
    });
  }
  if (spec.batchSize) {
    p.options.batching = { batch: { batchSize: spec.batchSize, batchInterval: 0 } };
  }
  return p;
}

// ---------------------------------------------------------------------------
// غراء عقد Code (يُضاف بعد الوحدات المضمَّنة)
// ---------------------------------------------------------------------------

const VERIFY_GLUE = `
const sd = $getWorkflowStaticData("global");
const item = $input.first();
const webhook = item.json || {};
const rawB64 =
  item.binary && item.binary.data && typeof item.binary.data.data === "string"
    ? item.binary.data.data
    : undefined;
const now = Date.now();
const v = VerifyRequest.verifyRequest({
  headers: webhook.headers,
  body: webhook.body,
  rawBodyBase64: rawB64,
  path: __PATH__,
  secret: $env.__SECRET_ENV__,
  now,
  nonces: sd.nonces,
});
sd.nonces = v.nonces;
return [
  {
    json: {
      ok: v.ok,
      code: v.code,
      reason: v.reason,
      ctx: { requestId: v.claimedRequestId, nonce: v.claimedNonce, t0: now, deadlineMs: v.deadlineMs },
      body: webhook.body,
    },
  },
];
`;

const BUDGET_GLUE = `
const sd = $getWorkflowStaticData("global");
const j = $input.first().json;
const r = Budget.checkBudget({ state: sd.budget, now: Date.now() });
sd.budget = r.state;
const out = Object.assign({}, j, { budgetOk: r.allowed });
if (!r.allowed) out.code = "budget_exhausted";
return [{ json: out }];
`;

const PLAN_GLUE = `
const j = $input.first().json;
const p = PlanQueries.planQueries({
  flavor: __FLAVOR__,
  body: j.body,
  env: { googleCx: $env.NX_GOOGLE_CX },
  now: Date.now(),
  deadlineMs: j.ctx.deadlineMs,
  stubBase: __STUB_BASE__,
});
if (!p.ok) return [{ json: { ctx: j.ctx, code: "bad_request", reason: p.reason, planOk: false } }];
const ctx = Object.assign({}, j.ctx, { requestId: p.requestId });
return [{ json: { ctx, planOk: true, plan: p } }];
`;

const GATE_SINGLE_GLUE = `
const plan = $input.first().json.plan;
const now = Date.now();
const g = PlanQueries.gateProvider({ plan, id: __ID__, now });
const entry = plan.providers[__ID__];
return [{ json: { run: g.run, reason: g.reason, startedAt: now, timeoutMs: g.run ? g.timeoutMs : 0, req: entry && entry.req ? entry.req : {} } }];
`;

const GATE_KEYLESS_GLUE = `
const plan = $input.first().json.plan;
const now = Date.now();
const g = PlanQueries.gateKeyless({ plan, now });
return [{ json: { run: g.run, reason: g.reason, startedAt: now, timeoutMs: g.run ? g.timeoutMs : 0, items: plan.keyless } }];
`;

const SPLIT_KEYLESS_GLUE = `
const gate = $input.first().json;
return gate.items.map((i) => ({ json: { id: i.id, method: i.method, url: i.url, timeoutMs: gate.timeoutMs } }));
`;

const RANK_GLUE = `
const SINGLES = __SINGLES__;
const planItem = $("Plan").first().json;
const plan = planItem.plan;
const ctx = planItem.ctx;
const now = Date.now();
const read = (name) => {
  try {
    return $(name).first().json;
  } catch (e) {
    return undefined;
  }
};
const entries = [];
for (const s of SINGLES) {
  const gate = read(s.gate);
  if (!gate) continue;
  const out = gate.run ? read(s.stamp) : undefined;
  entries.push(
    MergeRank.classifyHttp({
      id: s.id,
      gate,
      startedAt: gate.startedAt,
      now: out && typeof out.endedAt === "number" ? out.endedAt : now,
      out,
      timeoutMs: plan.timeoutMs,
    }),
  );
}
const kg = read("Gate Keyless");
if (kg) {
  let outs = [];
  if (kg.run) {
    try {
      outs = $("Stamp Keyless").all().map((i) => i.json);
    } catch (e) {
      outs = [];
    }
  }
  const last = outs.reduce((m, o) => (o && typeof o.endedAt === "number" ? Math.max(m, o.endedAt) : m), 0);
  entries.push(
    ...MergeRank.classifyBatch({
      planned: kg.items,
      gate: kg,
      outs,
      startedAt: kg.startedAt,
      now: last || now,
      timeoutMs: plan.timeoutMs,
    }),
  );
}
const ranked = MergeRank.mergeRank({
  entries,
  mode: plan.mode,
  lang: plan.lang,
  maxResults: plan.maxResults,
  now,
});
return [{ json: { ctx, providers: ranked.providers, results: ranked.results } }];
`;

const ENVELOPE_GLUE = `
const j = $input.first().json || {};
let ctx = j.ctx && typeof j.ctx === "object" ? Object.assign({}, j.ctx) : {};
if (!ctx.nonce || !ctx.requestId) {
  try {
    const w = BuildEnvelope.contextFromWebhook($("Webhook").first().json);
    if (!ctx.nonce) ctx.nonce = w.nonce;
    if (!ctx.requestId) ctx.requestId = w.requestId;
  } catch (e) {}
}
const code = j.error !== undefined ? "internal" : j.code;
const built = BuildEnvelope.buildEnvelope({
  requestId: ctx.requestId,
  code,
  providers: j.providers,
  results: j.results,
  now: Date.now(),
});
return [{ json: { ctx: { nonce: ctx.nonce || "" }, body: built.body } }];
`;

const SIGN_GLUE = `
const j = $input.first().json;
const s = SignResponse.signResponse({
  secret: $env.__SECRET_ENV__,
  body: j.body,
  nonce: j.ctx && j.ctx.nonce ? j.ctx.nonce : "",
  now: Date.now(),
});
return [{ json: { body: j.body, respTs: s.respTs, respSig: s.respSig, signed: s.signed } }];
`;

const DISPATCH_GLUE = `
const sd = $getWorkflowStaticData("global");
const j = $input.first().json;
let idemKey = "";
try {
  const headers = $("Webhook").first().json.headers || {};
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === "idempotency-key") idemKey = String(headers[k]);
  }
} catch (e) {}
const now = Date.now();
const d = RunnerDispatch.dispatch({ body: j.body, idemKey, now, store: sd.idem });
sd.idem = d.store;
const ctx = Object.assign({}, j.ctx, { requestId: d.requestId || j.ctx.requestId });
const out = { ctx, code: d.decision, workflow: d.workflow, params: d.params, idemKey: d.idemKey };
if (d.decision === "run") {
  out.req = RunnerDispatch.buildRequest(d.workflow, d.params, now, __STUB_BASE__) || {};
  out.code = "ok";
}
if (d.decision === "already_done") out.result = d.result;
out.decision = d.decision;
return [{ json: out }];
`;

const UNKNOWN_GLUE = `
const j = $input.first().json;
return [{ json: { ctx: j.ctx, code: "unknown_workflow" } }];
`;

const SUMMARISE_ADVISORIES_GLUE = `
const d = $("Dispatch").first().json;
const res = $input.first().json;
const result = RunnerDispatch.summariseAdvisories(d.workflow, d.params, res);
if (!result) return [{ json: { ctx: d.ctx, code: "internal" } }];
return [{ json: { ctx: d.ctx, code: "ok", workflow: d.workflow, idemKey: d.idemKey, result } }];
`;

const PURGE_GLUE = `
const sd = $getWorkflowStaticData("global");
const d = $input.first().json;
const purged = RunnerDispatch.purgeResearchCache(sd, d.params.scope, Date.now());
const result = { summary: purged.summary, items: [] };
return [{ json: { ctx: d.ctx, code: "ok", workflow: d.workflow, idemKey: d.idemKey, result } }];
`;

const SUMMARISE_CANARY_GLUE = `
const d = $("Dispatch").first().json;
const pick = (name) => {
  try {
    return $(name).first().json;
  } catch (e) {
    return null;
  }
};
const evaluation = CanaryEvaluate.canaryEvaluate({
  health: { app: pick("Canary App Health"), chat: pick("Canary Chat Health"), provider: pick("Canary Provider") },
  state: undefined,
  now: Date.now(),
});
const result = RunnerDispatch.summariseCanary(evaluation);
return [{ json: { ctx: d.ctx, code: "ok", workflow: d.workflow, idemKey: d.idemKey, result } }];
`;

const SUMMARISE_NOTIFY_GLUE = `
const d = $("Dispatch").first().json;
const result = RunnerDispatch.summariseNotify($input.first().json);
return [{ json: { ctx: d.ctx, code: "ok", workflow: d.workflow, idemKey: d.idemKey, result } }];
`;

const RECORD_GLUE = `
const sd = $getWorkflowStaticData("global");
const j = $input.first().json;
if (j.code === "ok" && j.idemKey && j.result) {
  sd.idem = RunnerDispatch.recordResult({
    store: sd.idem,
    idemKey: j.idemKey,
    workflow: j.workflow,
    result: j.result,
    now: Date.now(),
  });
}
return [{ json: j }];
`;

const RUNNER_ENVELOPE_GLUE = `
const j = $input.first().json || {};
let ctx = j.ctx && typeof j.ctx === "object" ? Object.assign({}, j.ctx) : {};
if (!ctx.nonce || !ctx.requestId) {
  try {
    const w = BuildEnvelope.contextFromWebhook($("Webhook").first().json);
    if (!ctx.nonce) ctx.nonce = w.nonce;
    if (!ctx.requestId) ctx.requestId = w.requestId;
  } catch (e) {}
}
const code = j.error !== undefined ? "internal" : j.code;
const built = BuildEnvelope.buildRunnerEnvelope({ requestId: ctx.requestId, code, result: j.result });
return [{ json: { ctx: { nonce: ctx.nonce || "" }, body: built.body } }];
`;

// ---------------------------------------------------------------------------
// مسارا البحث (سَدِيد وFNN): هيكل واحد، مزوّدون مختلفون
// ---------------------------------------------------------------------------

function singleSpecs(b) {
  return {
    google: {
      title: "Google",
      method: "GET",
      url: b.url("www.googleapis.com", "/customsearch/v1"),
      credential: CREDENTIALS.google,
      query: "={{ JSON.stringify($json.req.query) }}",
    },
    brave: {
      title: "Brave",
      method: "GET",
      url: b.url("api.search.brave.com", "/res/v1/web/search"),
      credential: CREDENTIALS.brave,
      query: "={{ JSON.stringify($json.req.query) }}",
      headers: "={{ JSON.stringify($json.req.headers) }}",
    },
    tavily: {
      title: "Tavily",
      method: "POST",
      url: b.url("api.tavily.com", "/search"),
      credential: CREDENTIALS.tavily,
      body: "={{ $json.req.body }}",
    },
    github: {
      title: "GitHub",
      method: "GET",
      url: b.url("api.github.com", "/search/code"),
      credential: CREDENTIALS.github,
      query: "={{ JSON.stringify($json.req.query) }}",
      headers: "={{ JSON.stringify($json.req.headers) }}",
    },
    osv: {
      title: "OSV",
      method: "POST",
      url: b.url("api.osv.dev", "/v1/query"),
      body: "={{ $json.req.body }}",
    },
  };
}

function stampNode(b, name, position) {
  return b.add(
    name,
    "n8n-nodes-base.set",
    3.4,
    {
      mode: "manual",
      includeOtherFields: true,
      include: "all",
      assignments: {
        assignments: [
          {
            id: stableId(b.name + "|" + name + "|endedAt"),
            name: "endedAt",
            type: "number",
            value: "={{ Date.now() }}",
          },
        ],
      },
      options: {},
    },
    { position, onError: "continueRegularOutput" },
  );
}

function researchWorkflow(profile, key) {
  const flavor = FLAVORS[key];
  const meta =
    key === "sadeed"
      ? {
          name: "sadeed-web-research",
          path: "sadeed-research-v1",
          secret: "SADEED_N8N_SECRET",
          timeout: 10,
        }
      : {
          name: "fnn-dev-research",
          path: "fnn-research-v1",
          secret: "FINN_N8N_SECRET",
          timeout: 15,
        };
  const b = new Builder(meta.name, profile);
  const stubBase = profile === "stub" ? STUB_BASE : "";
  const specs = singleSpecs(b);
  const singles = flavor.singles.map((id) => ({
    id,
    gate: "Gate " + specs[id].title,
    stamp: "Stamp " + specs[id].title,
  }));
  const vars = {
    PATH: JSON.stringify(meta.path),
    SECRET_ENV: meta.secret,
    FLAVOR: JSON.stringify(key),
    STUB_BASE: JSON.stringify(stubBase),
    SINGLES: JSON.stringify(singles),
  };

  b.add(
    "Webhook",
    "n8n-nodes-base.webhook",
    2,
    {
      httpMethod: "POST",
      path: meta.path,
      responseMode: "responseNode",
      options: { rawBody: true },
    },
    { position: [0, 300], webhookId: stableId(meta.name + "|webhook") },
  );
  b.code("Verify", ["verify-request"], fill(VERIFY_GLUE, vars), [240, 300]);
  ifNode(b, "Auth ok?", "auth-ok", "={{ $json.ok }}", [480, 300]);
  b.code("Budget", ["budget"], BUDGET_GLUE, [720, 300]);
  ifNode(b, "Budget ok?", "budget-ok", "={{ $json.budgetOk }}", [960, 300]);
  b.code("Plan", ["plan-queries"], fill(PLAN_GLUE, vars), [1200, 300]);
  ifNode(b, "Plan ok?", "plan-ok", "={{ $json.planOk }}", [1440, 300]);

  const joinInputs = 1 + singles.length;
  b.add(
    "Join",
    "n8n-nodes-base.merge",
    3,
    { mode: "append", numberInputs: joinInputs },
    { position: [2400, 300] },
  );

  // ترتيب التنفيذ في n8n v1 هو ترتيب الإحداثيات (y ثم x) لا ترتيب الاتصالات: المزوّدون بمفتاح
  // في الصفوف العليا فيُنفَّذون أولًا، والدفعة بلا مفتاح في أسفلها فتُنفَّذ أخيرًا بما تبقّى
  // من الموعد (المحجوز لها ذيل). الحارس checkBranchOrder يثبّت أن الاتصالات بالترتيب نفسه.
  const keylessY = 260 + singles.length * 200;

  // فروع المزوّدين بمفتاح أو بنداء مفرد.
  singles.forEach((s, index) => {
    const spec = specs[s.id];
    const y = 260 + index * 200;
    b.code(s.gate, ["plan-queries"], fill(GATE_SINGLE_GLUE, { ID: JSON.stringify(s.id) }), [
      1680,
      y,
    ]);
    ifNode(b, "Run " + spec.title + "?", "run-" + s.id, "={{ $json.run }}", [1900, y]);
    b.add(
      "HTTP " + spec.title,
      "n8n-nodes-base.httpRequest",
      4.2,
      httpParams(spec, "={{ $json.timeoutMs }}", profile),
      {
        position: [2120, y],
        onError: "continueRegularOutput",
        credentials: spec.credential ? { [spec.credential.type]: spec.credential.name } : undefined,
      },
    );
    stampNode(b, s.stamp, [2320, y]);
    b.link("Plan ok?", s.gate, 0);
    b.link(s.gate, "Run " + spec.title + "?");
    b.link("Run " + spec.title + "?", "HTTP " + spec.title, 0);
    b.link("HTTP " + spec.title, s.stamp);
    b.link(s.stamp, "Join", 0, index + 1);
    b.link("Run " + spec.title + "?", "Join", 1, index + 1);
  });

  // فرع المزوّدين بلا مفتاح: بوّابة ← شرط ← تقسيم ← HTTP دفعة متزامنة ← ختم زمن.
  b.code("Gate Keyless", ["plan-queries"], GATE_KEYLESS_GLUE, [1680, keylessY]);
  ifNode(b, "Run Keyless?", "run-keyless", "={{ $json.run }}", [1900, keylessY]);
  b.code("Split Keyless", [], SPLIT_KEYLESS_GLUE, [2100, keylessY - 60]);
  b.add(
    "HTTP Keyless",
    "n8n-nodes-base.httpRequest",
    4.2,
    httpParams(
      { method: "GET", url: "={{ $json.url }}", batchSize: 6 },
      "={{ $json.timeoutMs }}",
      profile,
    ),
    { position: [2300, keylessY - 60], onError: "continueRegularOutput" },
  );
  stampNode(b, "Stamp Keyless", [2500, keylessY - 60]);
  b.link("Plan ok?", "Gate Keyless", 0);
  b.link("Gate Keyless", "Run Keyless?");
  b.link("Run Keyless?", "Split Keyless", 0);
  b.link("Split Keyless", "HTTP Keyless");
  b.link("HTTP Keyless", "Stamp Keyless");
  b.link("Stamp Keyless", "Join", 0, 0);
  b.link("Run Keyless?", "Join", 1, 0);

  b.code("Rank", ["merge-rank"], fill(RANK_GLUE, vars), [2640, 300]);
  b.code("Envelope", ["build-envelope"], ENVELOPE_GLUE, [2880, 300], "continueErrorOutput");
  b.code("Sign", ["sign-response"], fill(SIGN_GLUE, vars), [3120, 300]);
  respondNodes(b, 3360, 300, LITERAL_FALLBACK_BODY);

  // الخيط الرئيس.
  b.link("Webhook", "Verify");
  b.link("Verify", "Auth ok?");
  b.link("Auth ok?", "Budget", 0);
  b.link("Auth ok?", "Envelope", 1);
  b.link("Budget", "Budget ok?");
  b.link("Budget ok?", "Plan", 0);
  b.link("Budget ok?", "Envelope", 1);
  b.link("Plan", "Plan ok?");
  b.link("Plan ok?", "Envelope", 1);
  b.link("Join", "Rank");
  b.link("Rank", "Envelope", 0);
  b.link("Envelope", "Sign", 0);
  b.link("Sign", "Respond", 0);
  // مسارات الخطأ كلّها تنتهي بردّ: مخرج الخطأ لكل عقدة Code ← Envelope (ردّ داخلي).
  for (const node of b.nodes) {
    if (node.type === "n8n-nodes-base.code" && node.onError === "continueErrorOutput") {
      const target =
        node.name === "Envelope" || node.name === "Sign" ? "Respond Fallback" : "Envelope";
      b.link(node.name, target, 1);
    }
  }
  return b.workflow({ executionTimeout: meta.timeout });
}

// ---------------------------------------------------------------------------
// مسار المشغّل
// ---------------------------------------------------------------------------

function runnerWorkflow(profile) {
  const b = new Builder("fnn-automation-runner", profile);
  const stubBase = profile === "stub" ? STUB_BASE : "";
  const vars = {
    PATH: JSON.stringify("fnn-runner-v1"),
    SECRET_ENV: "FINN_N8N_SECRET",
    STUB_BASE: JSON.stringify(stubBase),
  };
  b.add(
    "Webhook",
    "n8n-nodes-base.webhook",
    2,
    {
      httpMethod: "POST",
      path: "fnn-runner-v1",
      responseMode: "responseNode",
      options: { rawBody: true },
    },
    { position: [0, 400], webhookId: stableId("fnn-automation-runner|webhook") },
  );
  b.code("Verify", ["verify-request"], fill(VERIFY_GLUE, vars), [240, 400]);
  ifNode(b, "Auth ok?", "auth-ok", "={{ $json.ok }}", [480, 400]);
  b.code("Budget", ["budget"], BUDGET_GLUE, [720, 400]);
  ifNode(b, "Budget ok?", "budget-ok", "={{ $json.budgetOk }}", [960, 400]);
  b.code("Dispatch", ["runner-dispatch"], fill(DISPATCH_GLUE, vars), [1200, 400]);
  ifNode(b, "Run?", "run", "={{ $json.decision }}", [1440, 400], OP_EQUALS, "run");

  // Switch على الكتالوج المغلق: القواعد = CATALOG حرفيًّا، والاحتياطي = unknown_workflow.
  b.add(
    "Switch Workflow",
    "n8n-nodes-base.switch",
    3.2,
    {
      rules: {
        values: CATALOG.map((id) => ({
          conditions: conditionBlock(
            "fnn-automation-runner|rule|" + id,
            "={{ $json.workflow }}",
            OP_EQUALS,
            id,
          ),
          renameOutput: true,
          outputKey: id,
        })),
      },
      options: { fallbackOutput: "extra", renameFallbackOutput: "unknown_workflow" },
    },
    { position: [1680, 400] },
  );
  const advisoryHttp = (name, position) =>
    b.add(
      name,
      "n8n-nodes-base.httpRequest",
      4.2,
      httpParams(
        {
          method: "GET",
          url: "={{ $json.req.url }}",
          headers: "={{ JSON.stringify($json.req.headers) }}",
        },
        8000,
        profile,
      ),
      { position, onError: "continueRegularOutput" },
    );
  // 1) ملخص التنبيهات
  advisoryHttp("HTTP Digest", [1920, 0]);
  b.code("Summarise Digest", ["runner-dispatch"], SUMMARISE_ADVISORIES_GLUE, [2160, 0]);
  // 2) فحص التنبيهات على الحزم
  advisoryHttp("HTTP Scan", [1920, 200]);
  b.code("Summarise Scan", ["runner-dispatch"], SUMMARISE_ADVISORIES_GLUE, [2160, 200]);
  // 3) تنظيف ذاكرة البحث المؤقتة
  b.code("Purge Cache", ["runner-dispatch"], PURGE_GLUE, [1920, 400]);
  // 4) فحص فوري
  const appUrl = (path) =>
    profile === "stub" ? STUB_BASE + "/app" + path : "={{ $env.SADEED_APP_URL }}" + path;
  const probe = (name, url, position) =>
    b.add(
      name,
      "n8n-nodes-base.httpRequest",
      4.2,
      // ثلاثة نداءات متتابعة × 5000 = 15000 < موعد المشغّل 20000 (العقد).
      httpParams({ method: "GET", url }, 5000, profile),
      {
        position,
        onError: "continueRegularOutput",
      },
    );
  probe("Canary App Health", appUrl("/api/public/health"), [1920, 600]);
  probe("Canary Chat Health", appUrl("/api/chat/health"), [2120, 600]);
  probe(
    "Canary Provider",
    b.url(
      "en.wikipedia.org",
      "/w/api.php?action=query&list=search&srsearch=health&srlimit=1&format=json",
    ),
    [2320, 600],
  );
  b.code(
    "Summarise Canary",
    ["canary-evaluate", "runner-dispatch"],
    SUMMARISE_CANARY_GLUE,
    [2520, 600],
  );
  // 5) اختبار إشعار
  b.add(
    "Notify Test",
    "n8n-nodes-base.telegram",
    1.2,
    {
      resource: "message",
      operation: "sendMessage",
      chatId: "={{ $env.NX_OWNER_CHAT_ID }}",
      text: "اختبار إشعار من مسار الأتمتة. إن وصلتك هذه الرسالة فقناة المالك سليمة.",
      additionalFields: TELEGRAM_PLAIN_FIELDS,
    },
    {
      position: [1920, 800],
      onError: "continueRegularOutput",
      credentials: { telegramApi: CREDENTIALS.telegramOwner.name },
    },
  );
  b.code("Summarise Notify", ["runner-dispatch"], SUMMARISE_NOTIFY_GLUE, [2160, 800]);
  b.code("Unknown Workflow", [], UNKNOWN_GLUE, [1920, 1000]);
  b.code("Record", ["runner-dispatch"], RECORD_GLUE, [2760, 400]);
  b.code("Envelope", ["build-envelope"], RUNNER_ENVELOPE_GLUE, [3000, 400]);
  b.code("Sign", ["sign-response"], fill(SIGN_GLUE, vars), [3240, 400]);
  respondNodes(b, 3480, 400, RUNNER_FALLBACK_BODY);

  b.link("Webhook", "Verify");
  b.link("Verify", "Auth ok?");
  b.link("Auth ok?", "Budget", 0);
  b.link("Auth ok?", "Envelope", 1);
  b.link("Budget", "Budget ok?");
  b.link("Budget ok?", "Dispatch", 0);
  b.link("Budget ok?", "Envelope", 1);
  b.link("Dispatch", "Run?");
  b.link("Run?", "Switch Workflow", 0);
  b.link("Run?", "Envelope", 1);
  const order = CATALOG.slice();
  const heads = {
    engineering_digest: "HTTP Digest",
    dependency_advisory_scan: "HTTP Scan",
    research_cache_purge: "Purge Cache",
    canary_run_now: "Canary App Health",
    owner_notify_test: "Notify Test",
  };
  order.forEach((id, index) => b.link("Switch Workflow", heads[id], index));
  b.link("Switch Workflow", "Unknown Workflow", order.length);
  b.link("HTTP Digest", "Summarise Digest");
  b.link("HTTP Scan", "Summarise Scan");
  b.link("Canary App Health", "Canary Chat Health");
  b.link("Canary Chat Health", "Canary Provider");
  b.link("Canary Provider", "Summarise Canary");
  b.link("Notify Test", "Summarise Notify");
  for (const sink of [
    "Summarise Digest",
    "Summarise Scan",
    "Purge Cache",
    "Summarise Canary",
    "Summarise Notify",
  ]) {
    b.link(sink, "Record", 0);
  }
  b.link("Unknown Workflow", "Envelope", 0);
  b.link("Record", "Envelope", 0);
  b.link("Envelope", "Sign", 0);
  b.link("Sign", "Respond", 0);
  for (const node of b.nodes) {
    if (node.type === "n8n-nodes-base.code" && node.onError === "continueErrorOutput") {
      const target =
        node.name === "Envelope" || node.name === "Sign" ? "Respond Fallback" : "Envelope";
      b.link(node.name, target, 1);
    }
  }
  return b.workflow({ executionTimeout: 40 });
}

// ---------------------------------------------------------------------------
// المراقب ومعالج الأخطاء
// ---------------------------------------------------------------------------

const EVALUATE_GLUE = `
const sd = $getWorkflowStaticData("global");
const prevState = sd.canary ? JSON.parse(JSON.stringify(sd.canary)) : null;
const pick = (name) => {
  try {
    return $(name).first().json;
  } catch (e) {
    return null;
  }
};
const r = CanaryEvaluate.canaryEvaluate({
  health: { app: pick("App Health"), chat: pick("Chat Health"), provider: pick("Provider Canary") },
  state: sd.canary,
  now: Date.now(),
});
sd.canary = r.state;
const deadman = $env.NX_DEADMAN_URL || "";
return [
  {
    json: {
      notify: r.notify,
      type: r.type,
      status: r.status,
      message: r.message,
      telegramText: CanaryEvaluate.toTelegramHtml(r.message),
      chatId: $env.NX_ALERT_CHAT_ID || "",
      hasDeadman: deadman.length > 0,
      deadmanUrl: deadman,
      prevState,
    },
  },
];
`;

// تنبيه لم يصل: الحالة تعود إلى ما قبل التقييم (فيُعاد في الدقيقة التالية)، وخطأ ظاهر مرة كل 30 دقيقة.
const WATCHDOG_DELIVERY_GLUE = `
const sd = $getWorkflowStaticData("global");
const read = (name) => {
  try {
    return $(name).all().map((i) => i.json);
  } catch (e) {
    return [];
  }
};
const out = CanaryEvaluate.deliveryOutcome({ telegram: read("Telegram Alert"), email: read("Email Alert") });
if (out.delivered) return [{ json: { delivered: true, telegram: out.telegram, email: out.email } }];
const plan = CanaryEvaluate.planDeliveryFailure({
  prevState: $("Evaluate").first().json.prevState,
  raisedAt: sd.alertRaisedAt,
  now: Date.now(),
});
sd.canary = plan.state;
sd.alertRaisedAt = plan.raisedAt;
if (plan.raise) throw new Error("alert_delivery_failed");
return [{ json: { delivered: false, retry: true } }];
`;

// معالج الأخطاء: لا حالة لإرجاعها، فالفشل يُرفع دائمًا ليظهر في سجلّ التنفيذات.
const ERROR_DELIVERY_GLUE = `
const read = (name) => {
  try {
    return $(name).all().map((i) => i.json);
  } catch (e) {
    return [];
  }
};
const out = CanaryEvaluate.deliveryOutcome({ telegram: read("Telegram Alert"), email: read("Email Alert") });
if (!out.delivered) throw new Error("alert_delivery_failed");
return [{ json: { delivered: true, telegram: out.telegram, email: out.email } }];
`;

const ERROR_FORMAT_GLUE = `
const j = $input.first().json || {};
const execution = j.execution || {};
const error = execution.error || {};
const message = CanaryEvaluate.formatErrorAlert({
  workflow: j.workflow && j.workflow.name,
  node: execution.lastNodeExecuted,
  message: error.message,
});
return [{ json: { message, telegramText: CanaryEvaluate.toTelegramHtml(message), chatId: $env.NX_ALERT_CHAT_ID || "" } }];
`;

/**
 * قناتا التنبيه (تيليجرام وبريد) ثم دمج ثم «Delivery Check»: لا يُسكَت عن فشل التسليم.
 * القناتان بمتابعة عند الخطأ (فشل إحداهما لا يوقف الأخرى)، وفحص التسليم يقرّر النتيجة.
 */
function alertSinks(b, from, fromOutput, y, deliveryGlue) {
  b.add(
    "Telegram Alert",
    "n8n-nodes-base.telegram",
    1.2,
    {
      resource: "message",
      operation: "sendMessage",
      chatId: "={{ $json.chatId }}",
      text: "={{ $json.telegramText }}",
      additionalFields: TELEGRAM_PLAIN_FIELDS,
    },
    {
      position: [1500, y],
      onError: "continueRegularOutput",
      credentials: { telegramApi: CREDENTIALS.telegramAlert.name },
    },
  );
  b.add(
    "Email Alert",
    "n8n-nodes-base.emailSend",
    2.1,
    {
      fromEmail: "={{ $env.NX_ALERT_EMAIL_FROM }}",
      toEmail: "={{ $env.NX_ALERT_EMAIL_TO }}",
      subject: "تنبيه سَدِيد",
      emailFormat: "text",
      text: "={{ $json.message }}",
      options: {},
    },
    {
      position: [1500, y + 160],
      onError: "continueRegularOutput",
      credentials: { smtp: CREDENTIALS.smtp.name },
    },
  );
  b.add(
    "Join Alerts",
    "n8n-nodes-base.merge",
    3,
    { mode: "append", numberInputs: 2 },
    { position: [1740, y + 80] },
  );
  b.code("Delivery Check", ["canary-evaluate"], deliveryGlue, [1980, y + 80], null);
  b.link(from, "Telegram Alert", fromOutput);
  b.link(from, "Email Alert", fromOutput);
  b.link("Telegram Alert", "Join Alerts", 0, 0);
  b.link("Email Alert", "Join Alerts", 0, 1);
  b.link("Join Alerts", "Delivery Check");
}

function watchdogWorkflow(profile) {
  const b = new Builder("watchdog-canary", profile);
  const app = (path) =>
    profile === "stub" ? STUB_BASE + "/app" + path : "={{ $env.SADEED_APP_URL }}" + path;
  b.add(
    "Every Minute",
    "n8n-nodes-base.scheduleTrigger",
    1.2,
    { rule: { interval: [{ field: "minutes", minutesInterval: 1 }] } },
    { position: [0, 200] },
  );
  const probe = (name, url, position, timeout) =>
    b.add(
      name,
      "n8n-nodes-base.httpRequest",
      4.2,
      httpParams({ method: "GET", url }, timeout, profile),
      { position, onError: "continueRegularOutput" },
    );
  probe("App Health", app("/api/public/health"), [240, 200], 8000);
  probe("Chat Health", app("/api/chat/health"), [480, 200], 8000);
  probe(
    "Provider Canary",
    b.url(
      "en.wikipedia.org",
      "/w/api.php?action=query&list=search&srsearch=health&srlimit=1&format=json",
    ),
    [720, 200],
    5000,
  );
  b.code("Evaluate", ["canary-evaluate"], EVALUATE_GLUE, [960, 200], null);
  // النبض فوق فرع التنبيه في الإحداثيات فيُنفَّذ أولًا: فشل تسليم التنبيه يرفع خطأ في آخر فرع
  // التنبيه (Delivery Check)، ولا يجوز أن يُسكت النبض الخارجي بسببه.
  ifNode(b, "Dead-man Configured?", "deadman", "={{ $json.hasDeadman }}", [1200, 80]);
  b.add(
    "Dead-man Ping",
    "n8n-nodes-base.httpRequest",
    4.2,
    httpParams({ method: "GET", url: "={{ $json.deadmanUrl }}" }, 5000, profile),
    { position: [1500, 80], onError: "continueRegularOutput" },
  );
  b.add("No Ping", "n8n-nodes-base.noOp", 1, {}, { position: [1500, 220] });
  ifNode(b, "Notify?", "notify", "={{ $json.notify }}", [1200, 420]);
  alertSinks(b, "Notify?", 0, 400, WATCHDOG_DELIVERY_GLUE);
  b.add("No Alert", "n8n-nodes-base.noOp", 1, {}, { position: [1500, 720] });
  b.link("Every Minute", "App Health");
  b.link("App Health", "Chat Health");
  b.link("Chat Health", "Provider Canary");
  b.link("Provider Canary", "Evaluate");
  b.link("Evaluate", "Dead-man Configured?");
  b.link("Evaluate", "Notify?");
  b.link("Dead-man Configured?", "Dead-man Ping", 0);
  b.link("Dead-man Configured?", "No Ping", 1);
  b.link("Notify?", "No Alert", 1);
  return b.workflow({ executionTimeout: 60 });
}

function errorHandlerWorkflow(profile) {
  const b = new Builder("error-handler", profile);
  b.add("Error Trigger", "n8n-nodes-base.errorTrigger", 1, {}, { position: [0, 200] });
  b.code("Format", ["canary-evaluate"], ERROR_FORMAT_GLUE, [240, 200], null);
  alertSinks(b, "Format", 0, 120, ERROR_DELIVERY_GLUE);
  b.link("Error Trigger", "Format");
  return b.workflow({ executionTimeout: 30 });
}

// ---------------------------------------------------------------------------
// الفحص الذاتي: يدوي، بيانات جافة، بلا شبكة ولا خادم تجريبي
// ---------------------------------------------------------------------------

const SELF_HEAD = `
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const prior = (() => {
  try {
    return $input.first().json.checks || [];
  } catch (e) {
    return [];
  }
})();
`;

const SELF_TAIL = `
return [{ json: { checks: prior.concat(checks) } }];
`;

const SELF_CRYPTO_GLUE =
  SELF_HEAD +
  `
const SECRET = "0123456789abcdef0123456789abcdef";
const NONCE = "00112233445566778899aabbccddeeff";
const PATH = "sadeed-research-v1";
const GOLDEN_REQ = "v1=cd86c695120c61381321c00931d287e01d9c558f5559949c3cf88476a8a5b253";
const GOLDEN_RESP = "v1=cd5eb20be2c70ebfd4aa6fbc13188d97400ca8b6d181bf48b3949675dc6ba6d2";
const TS = 1761800000;
const body = { v: 1 };
const headers = (sig) => ({
  "x-nx-key-id": "v1",
  "x-nx-ts": String(TS),
  "x-nx-nonce": NONCE,
  "x-nx-sig": sig,
});
const signed = SignResponse.signRequest({ secret: SECRET, path: PATH, body: JSON.stringify(body), ts: TS, nonce: NONCE });
check("طلب موقَّع يطابق المتجه الذهبي", signed["X-Nx-Sig"] === GOLDEN_REQ);
const ok1 = VerifyRequest.verifyRequest({ headers: headers(GOLDEN_REQ), body, path: PATH, secret: SECRET, now: TS * 1000, nonces: {} });
check("التحقق يقبل الطلب السليم", ok1.ok === true);
const replay = VerifyRequest.verifyRequest({ headers: headers(GOLDEN_REQ), body, path: PATH, secret: SECRET, now: TS * 1000 + 1000, nonces: ok1.nonces });
check("النونس المكرَّر يُرفض", replay.ok === false && replay.reason === "replay");
const skew = VerifyRequest.verifyRequest({ headers: headers(GOLDEN_REQ), body, path: PATH, secret: SECRET, now: TS * 1000 + 31000, nonces: {} });
check("انحراف الساعة فوق 30 ثانية يُرفض", skew.ok === false && skew.reason === "skew");
const tampered = VerifyRequest.verifyRequest({ headers: headers(GOLDEN_REQ), body: { v: 2 }, path: PATH, secret: SECRET, now: TS * 1000, nonces: {} });
check("المتن المعبوث به يُرفض", tampered.ok === false);
const wrongPath = VerifyRequest.verifyRequest({ headers: headers(GOLDEN_REQ), body, path: "fnn-runner-v1", secret: SECRET, now: TS * 1000, nonces: {} });
check("التوقيع مرتبط بالمسار", wrongPath.ok === false);
const resp = SignResponse.signResponse({ secret: SECRET, body: '{"v":1,"ok":true}', nonce: NONCE, now: 1761800001000 });
check("توقيع الردّ يطابق المتجه الذهبي", resp.respSig === GOLDEN_RESP);
const noSecret = SignResponse.signResponse({ secret: "", body: "x", nonce: NONCE, now: TS * 1000 });
check("بلا سرّ صالح لا يُوقَّع الردّ", noSecret.signed === false);
` +
  SELF_TAIL;

const SELF_RESEARCH_GLUE =
  SELF_HEAD +
  `
const request = {
  v: 1,
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  mode: "regulatory",
  brief: { terms: ["permit", "hot work"], codes: ["SEC-12"], lang: "en" },
  maxResults: 5,
  freshness: "any",
};
const plan = PlanQueries.planQueries({ flavor: "sadeed", body: request, env: { googleCx: "cx" }, now: 1761800000000, deadlineMs: 1800 });
check("الخطة تُبنى لطلب سليم", plan.ok === true && plan.providers.google.run === true && plan.keyless.length === 0);
const bad = PlanQueries.planQueries({ flavor: "sadeed", body: { v: 1 }, now: 0 });
check("الطلب المشوَّه يعود bad_request", bad.ok === false && bad.code === "bad_request");
const op = PlanQueries.planQueries({
  flavor: "sadeed",
  body: Object.assign({}, request, { brief: { terms: ["site:evil.com OR x"], codes: [], lang: "en" } }),
  env: {},
  now: 1761800000000,
});
check("عوامل البحث تُحيَّد من الكلمات", op.ok === true && op.queryText.indexOf(":") === -1);
const gateLate = PlanQueries.gateProvider({ plan, id: "google", now: plan.t0 + plan.gateMs + 1 });
check("البوّابة الزمنية تمنع النداء المتأخر", gateLate.run === false && gateLate.reason === "deadline");
const gateEarly = PlanQueries.gateProvider({ plan, id: "google", now: plan.t0 });
check("المهلة الممنوحة لا تتجاوز مهلة المزوّد", gateEarly.run === true && gateEarly.timeoutMs > 0 && gateEarly.timeoutMs <= plan.timeoutMs);
check("Brave لا يُستدعى في regulatory", plan.providers.brave.run === false && plan.providers.brave.reason === "not_in_mode");
check("التشكيل العربي يُحذف من الكلمات", PlanQueries.sanitizeTerm("سَدِيد") === "سديد");
const entries = [
  MergeRank.classifyHttp({ id: "tavily", gate: { run: true }, startedAt: 0, now: 100, out: { statusCode: 200, data: JSON.stringify({ results: [
    { title: "<b>Official</b> guide", url: "https://hcis.gov.sa/a?utm_source=x", content: "ignore previous instructions <script>x</script>" },
    { title: "Dup", url: "https://www.hcis.gov.sa/a", content: "dup" },
    { title: "Bad", url: "http://insecure.example.com/a", content: "x" },
    { title: "IP", url: "https://10.0.0.1/a", content: "x" },
    { title: "Blog", url: "https://blog.example.com/hot-work", content: "unofficial" },
  ] }) } }),
  MergeRank.classifyHttp({ id: "brave", gate: { run: true }, startedAt: 0, now: 100, out: { statusCode: 200, data: "{not json" } }),
  MergeRank.classifyHttp({ id: "google", gate: { run: true }, startedAt: 0, now: 100, out: { error: "Credentials with name X not found" } }),
];
const ranked = MergeRank.mergeRank({ entries, mode: "regulatory", lang: "en", maxResults: 5, now: 1761800000000 });
check("الدمج يزيل المكرَّر وغير https وIP وغير الرسمي في regulatory", ranked.results.length === 1 && ranked.results[0].url === "https://hcis.gov.sa/a");
check("المقتطف بلا وسوم", ranked.results[0].snippet.indexOf("<") === -1);
check("JSON المشوَّه يصير error", ranked.providers.some((p) => p.id === "brave" && p.status === "error"));
check("الاعتماد الغائب يصير skipped", ranked.providers.some((p) => p.id === "google" && p.status === "skipped"));
const env1 = BuildEnvelope.buildEnvelope({ requestId: request.requestId, providers: ranked.providers, results: ranked.results, now: 1761800000000 });
check("الغلاف صالح", BuildEnvelope.validateEnvelope(env1.envelope).length === 0 && env1.envelope.code === "ok");
const env2 = BuildEnvelope.buildEnvelope(null);
check("الغلاف صالح لمدخل null", BuildEnvelope.validateEnvelope(env2.envelope).length === 0);
const env3 = BuildEnvelope.buildEnvelope({ providers: "x", results: [{ url: 5 }], code: 7, requestId: {} });
check("الغلاف صالح لمدخل فاسد", BuildEnvelope.validateEnvelope(env3.envelope).length === 0);
` +
  SELF_TAIL;

const SELF_OPS_GLUE =
  SELF_HEAD +
  `
let state;
let allowed = 0;
for (let i = 0; i < 61; i += 1) {
  const r = Budget.checkBudget({ state, now: 1761800000000 + i });
  state = r.state;
  if (r.allowed) allowed += 1;
}
check("الميزانية 60 في الدقيقة", allowed === 60);
const after = Budget.checkBudget({ state, now: 1761800000000 + 60001 });
check("النافذة تنزلق", after.allowed === true);
const health = (status) => ({ app: { statusCode: 200, data: JSON.stringify({ status }) }, chat: { statusCode: 200, data: JSON.stringify({ ok: true, gate: "verified", key_present: true }) }, provider: { statusCode: 200, data: "{}" } });
const t0 = 1761800000000;
let s = CanaryEvaluate.canaryEvaluate({ health: health("ok"), now: t0 });
check("بداية سليمة بلا تنبيه", s.notify === false);
s = CanaryEvaluate.canaryEvaluate({ health: health("down"), state: s.state, now: t0 + 60000 });
check("أول رصد سيّئ لا يُنبّه", s.notify === false);
s = CanaryEvaluate.canaryEvaluate({ health: health("down"), state: s.state, now: t0 + 120000 });
check("رصدان متتاليان يغيّران الحالة وينبّهان", s.notify === true && s.type === "change");
s = CanaryEvaluate.canaryEvaluate({ health: health("down"), state: s.state, now: t0 + 180000 });
check("لا تكرار قبل 6 ساعات", s.notify === false);
s = CanaryEvaluate.canaryEvaluate({ health: health("down"), state: s.state, now: t0 + 120000 + 6 * 3600000 });
check("تذكير بعد 6 ساعات", s.notify === true && s.type === "reminder");
const red = CanaryEvaluate.redactErrorMessage("Bearer abcdef123456 at https://x.example/a?key=SECRET123", 200);
check("حجب الأسرار من رسالة الخطأ", red.indexOf("abcdef123456") === -1 && red.indexOf("SECRET123") === -1);
const store0 = {};
const ids = RunnerDispatch.CATALOG;
check("الكتالوج خمسة معرّفات", ids.length === 5);
const d1 = RunnerDispatch.dispatch({ body: { v: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", workflow: "canary_run_now", params: {} }, idemKey: "abcdefgh12345678", now: t0, store: store0 });
check("معرّف معروف يُنفَّذ", d1.decision === "run");
const d2 = RunnerDispatch.dispatch({ body: { v: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", workflow: "deploy_prod", params: {} }, idemKey: "abcdefgh12345678", now: t0, store: store0 });
check("معرّف غير معروف يُرفض", d2.decision === "unknown_workflow");
const d3 = RunnerDispatch.dispatch({ body: { v: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", workflow: "engineering_digest", params: { days: 99 } }, idemKey: "abcdefgh12345678", now: t0, store: store0 });
check("معلمة خارج الحدود تُرفض", d3.decision === "bad_params");
const rec = RunnerDispatch.recordResult({ store: store0, idemKey: "abcdefgh12345678", workflow: "canary_run_now", result: { summary: "x", items: [] }, now: t0 });
const d4 = RunnerDispatch.dispatch({ body: { v: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", workflow: "canary_run_now", params: {} }, idemKey: "abcdefgh12345678", now: t0 + 1000, store: rec });
check("المكرَّر يعود already_done", d4.decision === "already_done");
const d5 = RunnerDispatch.dispatch({ body: { v: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", workflow: "canary_run_now", params: {} }, idemKey: "abcdefgh12345678", now: t0 + 25 * 3600000, store: rec });
check("المفتاح ينتهي بعد 24 ساعة", d5.decision === "run");
const sdLocal = { nonces: { a: 1 }, idem: { b: 1 }, budget: { hits: [1] }, researchCache: { k: { expiresAt: 5 } } };
RunnerDispatch.purgeResearchCache(sdLocal, "all", t0);
check("التنظيف يلمس الذاكرة المؤقتة وحدها", Object.keys(sdLocal.researchCache).length === 0 && sdLocal.nonces.a === 1 && sdLocal.idem.b === 1 && sdLocal.budget.hits.length === 1);
const re = BuildEnvelope.buildRunnerEnvelope({ requestId: "123e4567-e89b-42d3-a456-426614174000", code: "ok", result: { summary: "x", items: ["a"] } });
check("غلاف المشغّل صالح", re.envelope.ok === true && re.envelope.result.items.length === 1);
const re2 = BuildEnvelope.buildRunnerEnvelope(undefined);
check("غلاف المشغّل صالح لمدخل فارغ", re2.envelope.code === "internal" && re2.envelope.result === null);
` +
  SELF_TAIL;

const SELF_SUMMARY_GLUE = `
const checks = $input.first().json.checks || [];
const failed = checks.filter((c) => !c.ok).map((c) => c.name);
return [{ json: { pass: checks.length > 0 && failed.length === 0, total: checks.length, failed } }];
`;

function selfTestWorkflow(profile) {
  const b = new Builder("nx-self-test", profile);
  b.add("Manual Trigger", "n8n-nodes-base.manualTrigger", 1, {}, { position: [0, 200] });
  b.code("Test Crypto", ["verify-request", "sign-response"], SELF_CRYPTO_GLUE, [240, 200], null);
  b.code(
    "Test Research",
    ["plan-queries", "merge-rank", "build-envelope"],
    SELF_RESEARCH_GLUE,
    [480, 200],
    null,
  );
  b.code(
    "Test Ops",
    ["budget", "canary-evaluate", "runner-dispatch", "build-envelope"],
    SELF_OPS_GLUE,
    [720, 200],
    null,
  );
  b.code("Summary", [], SELF_SUMMARY_GLUE, [960, 200], null);
  b.add("Done", "n8n-nodes-base.noOp", 1, {}, { position: [1200, 200] });
  b.link("Manual Trigger", "Test Crypto");
  b.link("Test Crypto", "Test Research");
  b.link("Test Research", "Test Ops");
  b.link("Test Ops", "Summary");
  b.link("Summary", "Done");
  return b.workflow({ executionTimeout: 60 });
}

// ---------------------------------------------------------------------------
// README بالعربية (مولَّد)
// ---------------------------------------------------------------------------

function collectCredentialNames(workflows) {
  const names = new Map();
  for (const wf of workflows) {
    for (const node of wf.nodes) {
      for (const [type, ref] of Object.entries(node.credentials || {})) {
        const entry = names.get(ref.name) || { type, workflows: new Set() };
        entry.workflows.add(wf.name);
        names.set(ref.name, entry);
      }
    }
  }
  return names;
}

function renderReadme(workflows) {
  const creds = collectCredentialNames(workflows);
  const credRows = Array.from(creds.entries())
    .sort((a, c) => (a[0] < c[0] ? -1 : 1))
    .map(([name, info]) => {
      const spec = Object.values(CREDENTIALS).find((c) => c.name === name);
      return (
        "| " +
        name +
        " | " +
        info.type +
        " | " +
        Array.from(info.workflows).sort().join("، ") +
        " | " +
        (spec ? spec.fill : "") +
        " |"
      );
    })
    .join("\n");
  const envRows = ENV_DOC.map(([k, v]) => "| `" + k + "` | " + v + " |").join("\n");
  const wfRows = workflows
    .map((wf) => {
      const hook = wf.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
      return (
        "| `" +
        wf.name +
        "` | `n8n/workflows/" +
        WORKFLOW_FILES[wf.name] +
        "` | " +
        (hook ? "`" + hook.parameters.path + "`" : "بلا ويب هوك") +
        " |"
      );
    })
    .join("\n");
  return `# مسارات n8n لسَدِيد و FNN

> هذا الملف مولَّد من \`scripts/build-n8n-workflows.mjs\`. لا تعدّله يدويًّا.
> أعد توليده بالأمر \`node scripts/build-n8n-workflows.mjs\`.

## حالة هذه المسارات (اقرأها أولًا)

- **لم تُشغَّل هذه المسارات على n8n حقيقي.** لا توجد نسخة n8n في بيئة الكتابة.
- فُحصت بمحرّك رسم بياني مصغّر في \`n8n/test-support\`. هو ليس n8n. يثبت ربط العقد ومنطق Code فقط.
- أنت من يستورد المسارات ويشغّل الفحص الذاتي (الخطوة 6). لا تنشر قبل أن ينجح.
- أداء الإنتاج والكمون على n8n حقيقي: **لم يُقَس**.
- هذه المسارات لا تنشر ولا تلمس المستودع ولا قواعد البيانات. بوّابة التطبيق (\`SADEED_WEB_RESEARCH\`) مطفأة افتراضيًّا.

## المسارات

| المسار | الملف | مسار الويب هوك |
| --- | --- | --- |
${wfRows}

كل ويب هوك يقبل \`POST\` فقط، ويردّ دائمًا \`200\` بغلاف JSON موقَّع. أخطاء التطبيق تُحمل في الحقل \`code\` لا في رمز HTTP.

## 1) متطلبات n8n

- خادم n8n دائم التشغيل خلف https (ليس n8n على جهاز مؤقت).
- النسخة: لم تُقَس على نسخة بعينها. كُتبت لخط n8n 1.x الحديث (عقدة IF بنسخة 2.2، Switch بنسخة 3.2، Merge بنسخة 3).

## 2) متغيّرات بيئة n8n

| المتغيّر | الغرض |
| --- | --- |
${envRows}

- توليد سرّ: \`openssl rand -hex 32\`. استعمل سرّين مختلفين، ولا تضعهما في المستودع.
- سبب قراءة الأسرار من البيئة: عقد Code في n8n لا تستطيع قراءة قيمة اعتماد. لذلك سرّا التوقيع متغيّران في بيئة n8n، لا اعتمادان.
- إن شغّلت n8n بمشغّلات خارجية للشيفرة فاسمح بوحدة \`crypto\` وبقراءة البيئة في إعداد المشغّل أيضًا. لم أتحقق من هذه الخطوة.

## 3) الاعتمادات (بالاسم فقط)

أنشئ كل اعتماد في n8n بالاسم الحرفي أدناه. غياب اعتماد مزوّد يعني تخطّي ذلك المزوّد (حالة \`skipped\`)، وليس خطأً.

| الاسم | النوع | المسارات | ماذا تُدخل |
| --- | --- | --- | --- |
${credRows}

المزوّدون بلا مفتاح (ويكيبيديا، ويكيداتا، OpenAlex، MDN، npm، OSV، NVD) يعملون دائمًا ولا يحتاجون اعتمادًا.

## 4) الاستيراد

من الواجهة: Workflows ثم Import from file، لكل ملف في \`n8n/workflows\`.

أو من سطر الأوامر على خادم n8n:

\`\`\`bash
n8n import:workflow --separate --input=n8n/workflows/
\`\`\`

بعد الاستيراد:

1. افتح كل عقدة تحمل اعتمادًا واختر الاعتماد بالاسم إن لم يُربط تلقائيًّا.
2. في Settings لكل مسار (عدا \`error-handler\`) اختر \`error-handler\` مسار أخطاء.
3. لا تفعّل \`nx-self-test\` للجدولة: هو يدوي.

## 5) التفعيل

1. فعّل \`error-handler\` أولًا.
2. فعّل \`sadeed-web-research\` و \`fnn-dev-research\` و \`fnn-automation-runner\`.
3. فعّل \`watchdog-canary\` بعد ضبط \`SADEED_APP_URL\`.
4. عنوان الإنتاج لكل ويب هوك: \`WEBHOOK_URL\` ثم \`webhook/\` ثم المسار. مثال: \`https://n8n.example.com/webhook/sadeed-research-v1\`.
5. عنوان \`webhook-test\` لا يصلح للتطبيق: هو للتجربة اليدوية فقط.

### متغيّرات جهة التطبيق

هذه تُضبط في بيئة تطبيق سَدِيد لا في n8n. الأسماء حرفية.

| المتغيّر | الغرض |
| --- | --- |
| \`SADEED_N8N_BASE_URL\` | أصل n8n بـhttps وبلا مسار، مثل \`https://n8n.example.com\`. التطبيق يضيف إليه \`/webhook/\` ثم المسار. شرطة أخيرة تُقبل. مسار فرعي لـn8n لا يُقبل ويعني غير مهيّأ. |
| \`SADEED_N8N_SECRET\` | نفس قيمة \`SADEED_N8N_SECRET\` في n8n. |
| \`FINN_N8N_SECRET\` | نفس قيمة \`FINN_N8N_SECRET\` في n8n. يجب أن تختلف عن السابقة، وإلا يتعطّل السطحان معًا. |
| \`SADEED_WEB_RESEARCH\` | \`off\` (الافتراضي) أو \`members\` أو \`all\`. يحكم بحث سَدِيد وحده، ولا يحكم بحث FNN ولا المشغّل. |
| \`SADEED_WEB_DISABLED\` | القيمة \`1\` توقف كل نداء إلى n8n فورًا، من سَدِيد وFNN والمشغّل معًا. |

- الطرفان يقصّان الفراغات والأسطر حول السرّ قبل التوقيع.
- اجعل السرّ حروفًا وأرقامًا وشرطات فقط (مثل ناتج \`openssl rand -hex 32\`). معالج الأخطاء يحجب هذا الشكل من نصّ الخطأ، ولا يضمن حجب سرّ فيه رموز أخرى.
- مهلة التطبيق: 1800 مللي ثانية لبحث سَدِيد، و6000 لبحث FNN، و20000 للمشغّل. الموعد الداخلي في n8n لبحث سَدِيد 1500، فيبقى 300 للشبكة. كمون الشبكة الحقيقي: لم يُقَس.

## 6) الفحص الذاتي

1. افتح المسار \`nx-self-test\` وانقر Execute workflow.
2. افتح عقدة \`Summary\`. المتوقع: \`pass\` تساوي \`true\` و \`failed\` فارغة.
3. الفحص لا يستعمل الشبكة ولا الأسرار الحقيقية: بيانات جافة تمرّ على نفس شيفرة العقد.
4. إن فشل، انسخ قائمة \`failed\` كما هي وأبلغ بها المطوّر. لا تفعّل التطبيق.
5. **نجاحه لا يثبت شكل ناتج عقد HTTP** (ولا الاعتمادات ولا الشبكة): لا عقدة HTTP فيه. اجعل بند «شكل ناتج HTTP» أدناه شرطًا قبل التفعيل.

### قائمة تحقق أولى على n8n حقيقي

هذه أشياء كتبناها من معرفة بـn8n لا من تجربة. تحقق منها قبل الاعتماد على المسارات:

1. **شكل ناتج HTTP** (أهم بند): شغّل \`watchdog-canary\` يدويًّا (Execute workflow) وافتح ناتج عقدة \`App Health\`. يجب أن ترى \`statusCode\` و\`headers\` و\`data\` (المتن نصًّا)، لا \`body\`. كل شيفرة المسارات تقرأ \`data\`. إن ظهر غيره فلا تفعّل: ستُصنَّف كل المزوّدين خطأً.
2. **المتن الخام**: أرسل طلب curl سليمًا (الخطوة 7). يجب أن يعود \`ok\` لا \`auth_failed\`.
3. **قراءة البيئة**: إن عاد \`internal\` بلا توقيع فالسرّ لم يُقرأ. راجع \`N8N_BLOCK_ENV_ACCESS_IN_NODE\` و\`SADEED_N8N_SECRET\` و\`FINN_N8N_SECRET\`.
4. **ترويسات الردّ**: تأكد من وصول \`X-Nx-Resp-Ts\` و\`X-Nx-Resp-Sig\` وأن النصّ يصل كما وُقِّع (سكربت curl مع \`--send\` يتحقق).
5. **الاعتمادات بالاسم**: بعد الاستيراد يجب أن يظهر اسم الاعتماد في كل عقدة بحث. ما ظهر فارغًا اربطه يدويًّا.
6. **الكمون**: شغّل الطلب نفسه عشر مرات وسجّل الأزمنة بنفسك. لا نملك رقمًا مقيسًا.
7. **الإشعارات**: شغّل \`owner_notify_test\` من المشغّل وتأكد أن الرسالة وصلت. رسائل تيليجرام بوضع HTML وبلا تذييل n8n، والنص مهرَّب.
8. **حقلا الاستعلام والترويسات**: عقد HTTP تمرّر \`jsonQuery\` و\`jsonHeaders\` نصًّا بـ\`JSON.stringify\` لأن n8n يستدعي \`JSON.parse\` عليهما. إن رأيت «not valid JSON» في عقدة بحث فأبلغ بنصّ الخطأ.

## 7) تجربة بـ curl

سكربت التوقيع \`scripts/n8n-sign-example.mjs\` يبني طلبًا موقَّعًا. بلا اعتماديات.

\`\`\`bash
export SADEED_N8N_SECRET='<نفس سرّ n8n>'
node scripts/n8n-sign-example.mjs --path=sadeed-research-v1 --base=https://n8n.example.com
\`\`\`

يطبع أمر curl جاهزًا. أضف \`--send\` ليرسل الطلب ويتحقق من توقيع الردّ ويطبع الغلاف.

بدائل الأمثلة: \`--path=fnn-research-v1 --secret-env=FINN_N8N_SECRET --mode=docs\` للمطوّر،
و \`--path=fnn-runner-v1 --secret-env=FINN_N8N_SECRET --workflow=canary_run_now\` للمشغّل.

اختبارات سلبية يلزم أن تعود \`auth_failed\` بحالة \`200\`: أضف \`--tamper\` (متن معدَّل)، أو \`--skew=60\` (ساعة منحرفة)، أو أعد إرسال الطلب نفسه (نونس مكرَّر).

## 8) المراقبة

- \`watchdog-canary\` يعمل كل دقيقة: صحة التطبيق، صحة الدردشة، ومزوّد بلا مفتاح.
- التنبيه عند تغيّر الحالة فقط، بعد رصدين متتاليين، وتذكير كل 6 ساعات ما دامت الحالة غير سليمة، وإشعار تعافٍ واحد.
- النبض الخارجي يُنفَّذ قبل فرع التنبيه، فلا يُسكته فشل التسليم.
- تعذّر التسليم عبر تيليجرام والبريد معًا لا يمرّ صامتًا: تعود حالة المراقب إلى ما قبل التقييم فيُعاد التنبيه في الدقيقة التالية، ويُرفع خطأ ظاهر في سجلّ التنفيذات (فيعمل \`error-handler\`) مرة كل 30 دقيقة كحدّ أقصى. يكفي نجاح قناة واحدة.
- \`NX_DEADMAN_URL\` يُستدعى كل دقيقة. اجعل خدمة خارجية تنبّهك إن توقف النبض: هذا يكشف موت n8n نفسه.
- \`error-handler\` يرسل اسم المسار والعقدة وأول 200 حرف من الرسالة بعد حجب الأسرار. لا يرسل بيانات المدخلات.

## 9) التراجع

- في تطبيق سَدِيد: احذف المتغيّر \`SADEED_WEB_RESEARCH\` أو اجعله \`off\`. يتوقف **بحث سَدِيد وحده**. بحث FNN والمشغّل يبقيان ما دام سرّ FNN مضبوطًا.
- لإيقاف كل نداء إلى n8n فورًا ودون نشر: اجعل \`SADEED_WEB_DISABLED\` تساوي \`1\`. هذا يوقف سَدِيد وFNN والمشغّل معًا.
- في n8n: أوقف تفعيل المسارات. لا بيانات تحتاج استرجاعًا: الحالة الوحيدة هي static data (نونس، ميزانية، مفاتيح تكرار).

## 10) الحدود المعروفة

- **لم يُشغَّل على n8n حقيقي.** كل ما سبق مكتوب ومفحوص بمحرّك مصغّر، لا بـn8n.
- **n8n ينفّذ فروع المخرج الواحد بالتتابع** (قُرئ من مصدره: الأعلى يسارًا أولًا، بالإحداثيات لا بترتيب الاتصالات)، فلا توازي بين المزوّدين بمفتاح (لكل منهم اعتماد في عقدته). لذلك: جوجل ثم Brave ثم Tavily بالتتابع، ثم الدفعة بلا مفتاح متزامنة داخل عقدتها. كل بوّابة تحسب ما تبقّى من الموعد الداخلي (بعد حجز 350 مللي ثانية للدفعة الأخيرة) وتسلّم العقدة مهلتها، فلا يُتجاوز الموعد، ولا يبدأ نداء يقلّ ما تبقّى له عن 250. على المحرّك المصغّر بكمون موحَّد لكل مزوّد (ساعة افتراضية، ليس قياسًا على مزوّد حقيقي): تجيب المزوّدون الستة حتى 300 مللي ثانية، وجوجل وBrave وTavily عند 380، وجوجل وBrave عند 400، وجوجل وحده عند 600 و900، ولا أحد عند 1200. الكمون الحقيقي: لم يُقَس.
- **وضع \`regulatory\`** (المادة ٩): جوجل وTavily وحدهما مقيَّدان بنطاقات رسمية، ولا يُستدعى Brave ولا ويكيبيديا، وتُسقط شيفرة الدمج أي نتيجة من غير نطاق رسمي أو حكومي سعودي (\`.gov.sa\`). بلا اعتماد جوجل وTavily يعود \`all_providers_failed\` صريحًا، لا بديل غير رسمي. التطبيق يعيد الحكم من جدوله.
- **الاعتمادات لا تتبع التحويلات**: عقد البحث المعتمِدة تضبط \`followRedirects\` على false، لأن الإصدار 4.2 يرسل الاعتماد افتراضيًّا إلى أصل آخر عند التحويل. ردّ 3xx يُصنَّف خطأ المزوّد.
- **المتن الخام للتوقيع**: يقرأ المسار المتن الخام من الملف الثنائي للويب هوك إن توفّر (\`rawBody\`)، وإلا يعيد تسلسل JSON. الثاني يطابق التطبيق إن أرسل المتن بـ\`JSON.stringify\`. تحقق منه بخطوة curl أعلاه.
- **التكرار المتزامن**: حالة static data تُحفظ عند نهاية التنفيذ، فطلبان متزامنان بمفتاح تكرار واحد قد ينفّذان معًا. العمليات كلها غير ضارة. والأمر نفسه لمخزن النونس وعدّاد الميزانية: يبدأ تنفيذان متداخلان من اللقطة نفسها، فقد يمرّ طلب موقَّع واحد مرتين (قيس على المحرّك المصغّر بنسختين من اللقطة نفسها)، وقد يضيع بعض النونس والعدّ لأن آخر كاتب يفوز. يحدّه انحراف الساعة 30 ثانية وحاجة المهاجم إلى طلب موقَّع ملتقَط (سجلّ وسيط أو بيانات تنفيذ محفوظة). على n8n حقيقي: لم يُقَس.
- **static data** لا تُحفظ إلا في المسارات المفعّلة وبالتنفيذات الإنتاجية.
- **ذاكرة البحث المؤقتة** في n8n غير مبنيّة بعد: عمل \`research_cache_purge\` اليوم تنظيف مفتاح فارغ. الذاكرة المؤقتة الفعلية في التطبيق، وهو من يخبر المالك بعدد ما حذفه هو لا بملخّص n8n.
- **موعد التطبيق يحدّد المزوّدين**: يقرأ المسار الترويسة \`X-Nx-Deadline-Ms\`. موعد قصير يعني ميزانية أضيق، فيتخطّى المسار مزوّدين لا يتّسع لهم الوقت (حالتهم \`timeout\` بزمن صفر).
- **مهلة كل نداء بحث**: حتى 1100 مللي ثانية في مسار سَدِيد، وحتى 2500 في مسار المطوّر (موعد التطبيق 6000)، وتقصر بما تبقّى من الموعد الداخلي (الأقصى 1500 و5000). هذه إعدادات مكتوبة، لا قياسات.
- **الميزانية**: 60 طلبًا في الدقيقة لكل مسار (نافذة منزلقة). الطلب غير الموقَّع لا يستهلكها.
- نتائج الويب غير موثوقة. التطبيق يعيد حساب الطبقة والنطاق وينظّف النص، ولا يثق بما ينقله n8n.

## 11) للمطوّر

- إعادة التوليد: \`node scripts/build-n8n-workflows.mjs\`. الفحص: \`node scripts/build-n8n-workflows.mjs --check\`.
- ملف التجربة بلا إنترنت ولا مفاتيح: \`node scripts/build-n8n-workflows.mjs --profile=stub\` ثم \`node n8n/test-support/stub-server.mjs\`. يُكتب إلى \`n8n/workflows.stub\` ولا يُتعقَّب.
- الاختبارات: \`npx vitest run n8n\`. المحرّك المصغّر في \`n8n/test-support/mini-engine.js\` وحدوده في ترويسته.
`;
}

// ---------------------------------------------------------------------------
// التجميع والإخراج
// ---------------------------------------------------------------------------

export function buildAll(profile = "prod") {
  const workflows = [
    researchWorkflow(profile, "sadeed"),
    researchWorkflow(profile, "fnn"),
    runnerWorkflow(profile),
    watchdogWorkflow(profile),
    errorHandlerWorkflow(profile),
    selfTestWorkflow(profile),
  ];
  const files = {};
  for (const wf of workflows) files[WORKFLOW_FILES[wf.name]] = stringify(wf);
  return { workflows, files, readme: renderReadme(workflows) };
}

function main(argv) {
  const args = Object.fromEntries(
    argv.slice(2).map((a) => {
      const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
      return m ? [m[1], m[2] === undefined ? "true" : m[2]] : [a, "true"];
    }),
  );
  const profile = args.profile === "stub" ? "stub" : "prod";
  const out = resolve(
    ROOT,
    args.out || (profile === "stub" ? "n8n/workflows.stub" : "n8n/workflows"),
  );
  const built = buildAll(profile);

  if (args.check) {
    const problems = [];
    for (const [file, text] of Object.entries(built.files)) {
      const path = join(out, file);
      if (!existsSync(path) || readFileSync(path, "utf8") !== text) problems.push(path);
    }
    const readmePath = join(ROOT, "n8n", "README.md");
    if (
      profile === "prod" &&
      !args.out &&
      (!existsSync(readmePath) || readFileSync(readmePath, "utf8") !== built.readme)
    ) {
      problems.push(readmePath);
    }
    if (existsSync(out)) {
      for (const f of readdirSync(out)) {
        if (f.endsWith(".json") && !(f in built.files)) problems.push(join(out, f));
      }
    }
    if (problems.length > 0) {
      console.error(
        "n8n: الملفات المتعقَّبة تخالف المولَّد:\n" + problems.map((p) => " - " + p).join("\n"),
      );
      process.exit(1);
    }
    console.log("n8n: المتعقَّب يطابق المولَّد (" + Object.keys(built.files).length + " ملفات).");
    return;
  }

  mkdirSync(out, { recursive: true });
  for (const [file, text] of Object.entries(built.files)) writeFileSync(join(out, file), text);
  // README المولَّد يُكتب مع المخرج الافتراضي وحده (--out لتجارب جانبية لا تمسّ المستودع).
  if (profile === "prod" && !args.out) writeFileSync(join(ROOT, "n8n", "README.md"), built.readme);
  console.log(
    "n8n: كُتب " +
      Object.keys(built.files).length +
      " ملفات إلى " +
      out +
      " (ملف " +
      profile +
      ").",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv);
