/**
 * مساعدات اختبارات n8n: تحميل شيفرة العقد (مع إمكان زرع عطل فيها)، بناء المسارات في الذاكرة،
 * وتشغيل طلب موقَّع عبر المحرّك المصغّر مع تحقق الغلاف والتوقيع. ليست جزءًا مما يُشحن.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll } from "../../scripts/build-n8n-workflows.mjs";
import { runWorkflow } from "../test-support/mini-engine.js";
import { makeTransport, FIXTURES } from "../test-support/fixtures.js";
import { egressProblems, secretLeakProblems } from "../test-support/contract-checks.js";

const require = createRequire(import.meta.url);
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CODE_DIR = join(ROOT, "n8n", "code");

/** وقت افتراضي ثابت للاختبارات (2026-10-30). */
export const NOW = 1793330000000;
export const SECRET_SADEED = "sadeed-test-secret-0123456789-abcdefghij-xyz";
export const SECRET_FNN = "fnn-test-secret-9876543210-zyxwvutsrq-abc";
export const UUID = "123e4567-e89b-42d3-a456-426614174000";

/** مواعيد التطبيق من العقد: سَدِيد 1800، بحث FNN 6000، المشغّل 20000. */
export const DEFAULT_DEADLINES = {
  "sadeed-research-v1": 1800,
  "fnn-research-v1": 6000,
  "fnn-runner-v1": 20000,
};

export const ENV = {
  SADEED_N8N_SECRET: SECRET_SADEED,
  FINN_N8N_SECRET: SECRET_FNN,
  NX_GOOGLE_CX: "cx-test-123",
  SADEED_APP_URL: "https://app.example",
  NX_ALERT_CHAT_ID: "42",
  NX_OWNER_CHAT_ID: "43",
  NX_DEADMAN_URL: "https://hc.example/ping",
};

/** مضيفا البيئة المعلنان (تعيّنهما المالك): يُسمح بهما إلى جانب القائمة المثبَّتة. */
export const ENV_HOSTS = [new URL(ENV.SADEED_APP_URL).host, new URL(ENV.NX_DEADMAN_URL).host];

export const ALL_CREDENTIALS = [
  "Nx Google Search Key",
  "Nx Brave Search Key",
  "Nx Tavily Key",
  "Nx GitHub Read Token",
  "Nx Telegram Alert Bot",
  "Nx Telegram Owner Bot",
  "Nx SMTP Alert",
];

/** يحمّل وحدة من n8n/code كما هي، وبإمكانك زرع تعديل نصّي عليها (للإثبات أن الحارس يحمرّ). */
export function loadCode(name, mutation) {
  let text = readFileSync(join(CODE_DIR, name + ".js"), "utf8");
  // مصفوفة تعديلات لعطلٍ تحرسه طبقتان (لا يظهر أثره إلا بتعطيلهما معًا).
  for (const m of mutation ? [].concat(mutation) : []) {
    if (!text.includes(m.from)) {
      throw new Error("العطل المزروع لم يُطبَّق (النص غير موجود): " + m.from);
    }
    text = text.replace(m.from, m.to);
  }
  const module = { exports: {} };
  new Function("module", "exports", "require", text)(module, module.exports, require);
  return module.exports;
}

const cache = {};
export function built(profile = "prod") {
  if (!cache[profile]) cache[profile] = buildAll(profile);
  return cache[profile];
}

export function workflowByName(name, profile = "prod") {
  const wf = built(profile).workflows.find((w) => w.name === name);
  if (!wf) throw new Error("مسار غير معروف: " + name);
  return JSON.parse(JSON.stringify(wf));
}

const SIGN = loadCode("sign-response");
const ENVELOPE = loadCode("build-envelope");

export function researchBody(overrides = {}) {
  return Object.assign(
    {
      v: 1,
      requestId: UUID,
      mode: "regulatory",
      brief: { terms: ["permit", "hot work"], codes: ["SEC-12"], lang: "en" },
      maxResults: 5,
      freshness: "any",
    },
    overrides,
  );
}

export function runnerBody(workflow, params = {}) {
  return { v: 1, requestId: UUID, workflow, params };
}

let nonceCounter = 0;
export function freshNonce() {
  nonceCounter += 1;
  return nonceCounter.toString(16).padStart(32, "0");
}

/**
 * يشغّل طلبًا موقَّعًا على مسار ويب هوك ويتحقق من الردّ.
 * @param {object} workflow
 * @param {object} o {path, secret, secretEnv, bodyObj|bodyText, nonce, tsOffset, tamper, idemKey,
 *   transportPlan, credentials, env, staticData, nowMs, deadlineMs, sink, notifier}
 */
export async function runSigned(workflow, o) {
  const now = o.nowMs === undefined ? NOW : o.nowMs;
  const secret =
    o.secret === undefined
      ? o.path === "sadeed-research-v1"
        ? SECRET_SADEED
        : SECRET_FNN
      : o.secret;
  const bodyText = typeof o.bodyText === "string" ? o.bodyText : JSON.stringify(o.bodyObj);
  const nonce = o.nonce || freshNonce();
  const signKey = o.signSecret === undefined ? secret : o.signSecret;
  const headers = SIGN.signRequest({
    secret: signKey,
    path: o.path,
    body: bodyText,
    ts: Math.floor(now / 1000) + (o.tsOffset || 0),
    nonce,
    deadlineMs: o.deadlineMs === undefined ? DEFAULT_DEADLINES[o.path] : o.deadlineMs,
  });
  if (o.idemKey) headers["Idempotency-Key"] = o.idemKey;
  for (const key of o.dropHeaders || []) delete headers[key];
  const sentBody = o.tamper ? bodyText.replace('"v":1', '"v":9') : bodyText;
  const sink = o.sink || { calls: [] };
  const env = Object.assign({}, ENV, o.env || {});
  if (o.secret === "") {
    env.SADEED_N8N_SECRET = "";
    env.FINN_N8N_SECRET = "";
  }
  const result = await runWorkflow(workflow, {
    trigger: {
      type: "webhook",
      path: o.path,
      headers,
      rawBody: sentBody,
      withRawBinary: o.withRawBinary,
    },
    env,
    credentials: o.credentials === undefined ? ALL_CREDENTIALS : o.credentials,
    transport: makeTransport(o.transportPlan || {}, sink),
    notifier: o.notifier || (async () => FIXTURES.telegram),
    staticData: o.staticData || {},
    nowMs: now,
  });
  const response = result.responses[0];
  let parsed = null;
  let verified = { ok: false };
  if (response) {
    try {
      parsed = JSON.parse(response.body);
    } catch (error) {
      parsed = null;
    }
    verified = SIGN.verifyResponse({
      secret,
      nonce,
      body: response.body,
      respTs: response.headers["x-nx-resp-ts"],
      respSig: response.headers["x-nx-resp-sig"],
      now: now + result.elapsedMs,
    });
  }
  return { result, response, parsed, verified, nonce, sink, bodyText };
}

export const VALIDATE = ENVELOPE.validateEnvelope;
export const RUNNER_CODES = ENVELOPE.RUNNER_CODES;

/** ما يجب أن يصدق على كل تشغيل ويب هوك: ردّ واحد صالح وموقَّع بلا انتهاك. */
export function invariantProblems(run, kind, expectSigned = true) {
  const problems = [];
  if (run.result.violations.length) problems.push("انتهاكات: " + run.result.violations.join(","));
  // الخروج الشبكي: مضيفون من القائمة المثبَّتة وحدها (أو مضيفا البيئة المعلنان)، https، مهلة محدودة،
  // وبلا تتبّع تحويلات مع اعتماد. والسرّ لا يظهر في الردّ (متنًا أو ترويسة) مهما كان المسار.
  problems.push(...egressProblems(run.result.httpCalls, ENV_HOSTS));
  problems.push(...secretLeakProblems(run.response, [SECRET_SADEED, SECRET_FNN]));
  if (run.result.failedNodes.length)
    problems.push("عقد فشلت: " + JSON.stringify(run.result.failedNodes));
  if (run.result.responses.length !== 1) problems.push("عدد الردود " + run.result.responses.length);
  const r = run.response;
  if (!r) return problems.concat("لا ردّ");
  if (r.statusCode !== 200) problems.push("حالة HTTP " + r.statusCode);
  if (!/^application\/json/.test(r.headers["content-type"] || ""))
    problems.push("Content-Type ليس JSON");
  if (!run.parsed) return problems.concat("الجسم ليس JSON");
  if (Buffer.byteLength(r.body, "utf8") > 32768) problems.push("الجسم فوق 32 كيلوبايت");
  if (kind === "research") {
    const bad = VALIDATE(run.parsed);
    if (bad.length) problems.push("غلاف غير صالح: " + bad.join(","));
  } else {
    const p = run.parsed;
    const ok =
      p.v === 1 &&
      typeof p.ok === "boolean" &&
      RUNNER_CODES.includes(p.code) &&
      typeof p.requestId === "string" &&
      (p.result === null ||
        (typeof p.result.summary === "string" &&
          p.result.summary.length <= 500 &&
          Array.isArray(p.result.items) &&
          p.result.items.length <= 10));
    if (!ok) problems.push("غلاف المشغّل غير صالح");
  }
  if (expectSigned && !run.verified.ok) problems.push("توقيع الردّ غير سليم");
  if (!expectSigned && (r.headers["x-nx-resp-sig"] || "") !== "")
    problems.push("ردّ غير موقَّع كان يُتوقَّع");
  return problems;
}
