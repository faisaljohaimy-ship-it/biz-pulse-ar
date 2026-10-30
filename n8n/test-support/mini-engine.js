/**
 * mini-engine: محرّك رسم بياني مصغّر ينفّذ JSON مسارات n8n المولَّدة. لاختبارات vitest فقط،
 * لا يُشحن ولا يُستورد من التطبيق.
 *
 * ┌─ حدود لازمة القراءة ────────────────────────────────────────────────────────────┐
 * │ هذا **ليس n8n**. يثبت أمرين فقط: (1) ربط العقد والاتصالات (من يصل إلى من، أين        │
 * │ تنتهي مسارات الخطأ، ردّ واحد بالضبط)، (2) منطق شيفرة عقد Code كما هي حرفيًّا.        │
 * │ لا يثبت أي شيء عن سلوك n8n الحقيقي. ما لا يحاكيه:                                  │
 * │  - لغة تعابير n8n: أربعة أشكال فقط ({{ $json.a.b }} و{{ $env.NAME }} و               │
 * │    {{ Date.now() }} و{{ JSON.stringify($json.a.b) }})، وأي شكل آخر يرمي خطأً صريحًا   │
 * │    (هذا مقصود لتبقى التعابير بسيطة).                                               │
 * │  - تحقّق معاملات العقد وفروق typeVersion وقيمها الافتراضية.                          │
 * │  - صندوق رمل Code الحقيقي وقيوده (هنا: require للوحدة crypto فقط، وprocess وfetch      │
 * │    مخفيان)، وعزل المشغّلات الخارجية، وأنماط تخزين الملفات الثنائية (rawBody).          │
 * │  - الشبكة: النقل مُحقَن، لا تفاصيل HTTP (تحويلات، TLS، ضغط، وكيل).                   │
 * │  - التزامن: الفروع تُنفَّذ بالتتابع بترتيب الإحداثيات (y ثم x) كما في مصدر n8n v1،      │
 * │    ودفعة عقدة HTTP متزامنة في ساعة افتراضية (كلفة الدفعة = أطول عضو). الكمون المحسوب  │
 * │    افتراضي، لا مقيس.                                                               │
 * │  - اعتمادات n8n (فك التشفير، الأنواع)، والحالة المشتركة بين التنفيذات المتزامنة،       │
 * │    وحفظ static data (هنا: تسلسل JSON في نهاية التشغيل فقط).                          │
 * │  - تنفيذ الطابور والتجميع وحدود الذاكرة والمهلات العامة للتنفيذ.                      │
 * └──────────────────────────────────────────────────────────────────────────────────┘
 *
 * ما يطابق مصدر n8n عن قصد (قُرئ من HttpRequestV3.node.ts وworkflow-execute.ts، لا من
 * التذكّر): شكل ناتج HTTP (متن النصّ الكامل في json.data لا body)، وأن jsonQuery وjsonHeaders
 * يمرّان على JSON.parse (النصّ فقط؛ الكائن الخام يفشل) بينما jsonBody يقبل الكائن، وترتيب
 * تنفيذ فروع المخرج الواحد بالإحداثيات.
 *
 * ما يحاكيه عن قصد: صيغة onError (continueRegularOutput / continueErrorOutput، مع نقل عناصر
 * json.error إلى مخرج الخطأ كما يفعل n8n)، انتظار Merge لكل مداخله، عدم تنفيذ عقدة بلا
 * عناصر، `$('اسم')` ترمي لعقدة لم تُنفَّذ، قاعدة الردّ الواحد، والتحقق الصارم من النوع في IF.
 */
import nodeCrypto from "node:crypto";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export class VirtualClock {
  constructor(startMs) {
    this.ms = startMs;
  }
  now() {
    return this.ms;
  }
  advance(ms) {
    this.ms += Math.max(0, Math.floor(ms));
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function cloneItems(items) {
  return items.map((item) => {
    const copy = { json: clone(item.json) || {} };
    if (item.binary) copy.binary = clone(item.binary);
    return copy;
  });
}

function typeOf(node) {
  return String(node.type).replace("n8n-nodes-base.", "");
}

// ---------------------------------------------------------------------------
// التعابير: ثلاثة أشكال فقط
// ---------------------------------------------------------------------------

const EXPR_GLOBAL = /\{\{\s*([\s\S]+?)\s*\}\}/g;

function evalInner(expr, scope) {
  let m = /^\$json((?:\.[A-Za-z_][A-Za-z0-9_]*)+)$/.exec(expr);
  if (m) {
    let current = scope.json;
    for (const key of m[1].slice(1).split(".")) {
      if (current === null || current === undefined || typeof current !== "object")
        return undefined;
      current = current[key];
    }
    return current;
  }
  // JSON.stringify($json.a.b): الشكل الوحيد لتمرير كائن إلى حقل JSON نصّي (jsonQuery/jsonHeaders).
  m = /^JSON\.stringify\(\$json((?:\.[A-Za-z_][A-Za-z0-9_]*)+)\)$/.exec(expr);
  if (m) {
    let current = scope.json;
    for (const key of m[1].slice(1).split(".")) {
      if (current === null || current === undefined || typeof current !== "object")
        return undefined;
      current = current[key];
    }
    return JSON.stringify(current);
  }
  m = /^\$env\.([A-Z][A-Z0-9_]*)$/.exec(expr);
  if (m) return scope.env[m[1]];
  if (expr === "Date.now()") return scope.clock.now();
  throw new Error("mini-engine: تعبير غير مدعوم {{ " + expr + " }}");
}

export function evalValue(value, scope) {
  if (typeof value === "string") {
    if (!value.startsWith("=")) return value;
    const text = value.slice(1);
    const whole = /^\{\{\s*([\s\S]+?)\s*\}\}$/.exec(text);
    if (whole && !/\}\}[\s\S]*\{\{/.test(text)) return evalInner(whole[1], scope);
    return text.replace(EXPR_GLOBAL, (all, expr) => {
      const v = evalInner(expr, scope);
      if (v === undefined || v === null) return "";
      return typeof v === "object" ? JSON.stringify(v) : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => evalValue(v, scope));
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = evalValue(value[key], scope);
    return out;
  }
  return value;
}

function evalConditions(block, scope) {
  const results = block.conditions.map((cond) => {
    const left = evalValue(cond.leftValue, scope);
    const right = evalValue(cond.rightValue, scope);
    const op = cond.operator;
    const key = op.type + ":" + op.operation;
    if (key === "boolean:true" || key === "boolean:false") {
      if (typeof left !== "boolean") {
        throw new Error(
          "Wrong type: '" + left + "' is " + typeof left + " but was expecting a boolean",
        );
      }
      return key === "boolean:true" ? left === true : left === false;
    }
    if (key === "string:equals" || key === "string:notEquals") {
      if (typeof left !== "string") {
        throw new Error(
          "Wrong type: '" + left + "' is " + typeof left + " but was expecting a string",
        );
      }
      return key === "string:equals" ? left === right : left !== right;
    }
    throw new Error("mini-engine: عامل شرط غير مدعوم " + key);
  });
  return block.combinator === "or" ? results.some(Boolean) : results.every(Boolean);
}

// ---------------------------------------------------------------------------
// عقدة HTTP
// ---------------------------------------------------------------------------

/**
 * jsonQuery وjsonHeaders: HttpRequestV3 يستدعي JSON.parse(القيمة) دائمًا، والقيمة الآتية من
 * تعبير مفرد كائنٌ خام (getParameterValue بـreturnObjectAsString=false)، فيرمي الكائن
 * «The value in the "..." field is not valid JSON». لذلك لا يُقبل هنا إلا النصّ.
 */
function parseJsonParameter(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('The value in the "' + label + '" field is not valid JSON');
  }
}

/** jsonBody وحده يقبل الكائن مباشرة (فرع خاص في HttpRequestV3). */
function bodyObject(value) {
  if (value !== null && typeof value === "object") return value;
  return parseJsonParameter(value, "JSON Body");
}

async function callOne(node, item, ctx) {
  const scope = { json: item.json, env: ctx.env, clock: ctx.clock };
  const p = evalValue(node.parameters, scope);
  const timeoutMs = p.options && p.options.timeout ? p.options.timeout : 300000;
  // typeVersion >= 4 يتبع التحويلات افتراضيًّا ما لم يُضبط options.redirect صراحةً.
  const redirectOpt = p.options && p.options.redirect && p.options.redirect.redirect;
  const record = {
    node: node.name,
    method: p.method,
    url: p.url,
    timeoutMs,
    followRedirects: redirectOpt === undefined ? true : Boolean(redirectOpt.followRedirects),
    credentials: Object.values(node.credentials || {}).map((c) => c.name),
    outcome: "",
    latencyMs: 0,
  };
  ctx.httpCalls.push(record);
  try {
    for (const [type, ref] of Object.entries(node.credentials || {})) {
      if (!ctx.credentials.has(ref.name)) {
        throw new Error(
          'Credentials with name "' + ref.name + '" for type "' + type + '" not found',
        );
      }
    }
    if (typeof p.url !== "string" || !/^https?:\/\/[^/\s]+/.test(p.url)) {
      throw new Error("Invalid URL: " + String(p.url));
    }
    const query = p.sendQuery ? parseJsonParameter(p.jsonQuery, "JSON Query Parameters") : {};
    const headers = p.sendHeaders ? parseJsonParameter(p.jsonHeaders, "JSON Headers") : {};
    const body = p.sendBody ? bodyObject(p.jsonBody) : undefined;
    const qs = Object.keys(query)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(String(query[k])))
      .join("&");
    const url = p.url + (qs ? (p.url.includes("?") ? "&" : "?") + qs : "");
    const req = {
      node: node.name,
      method: p.method || "GET",
      url,
      headers,
      body,
      timeoutMs,
      credentials: Object.values(node.credentials || {}).map((c) => c.name),
    };
    let resp;
    try {
      resp = await ctx.transport(req);
    } catch (error) {
      const latency = Math.min(timeoutMs, Number(error && error.latencyMs) || 0);
      record.outcome = "transport_error";
      record.latencyMs = latency;
      const failure = new Error(error && error.message ? error.message : String(error));
      failure.cost = latency;
      throw failure;
    }
    const latency = Number(resp.latencyMs) || 0;
    if (latency > timeoutMs) {
      record.outcome = "timeout";
      record.latencyMs = timeoutMs;
      const failure = new Error("timeout of " + timeoutMs + "ms exceeded");
      failure.cost = timeoutMs;
      throw failure;
    }
    record.latencyMs = latency;
    const status = resp.status === undefined ? 200 : resp.status;
    const response = (p.options && p.options.response && p.options.response.response) || {};
    if (status >= 400 && !response.neverError) {
      record.outcome = "http_" + status;
      const failure = new Error("Request failed with status code " + status);
      failure.cost = latency;
      throw failure;
    }
    record.outcome = "http_" + status;
    let text = resp.body;
    if (text !== undefined && typeof text !== "string") text = JSON.stringify(text);
    if (text === undefined) text = "";
    // شكل الناتج كما في HttpRequestV3: النصّ في json[outputPropertyName] (الافتراضي data)،
    // والكامل (fullResponse) يضيف statusCode وstatusMessage وheaders؛ وJSON المحلَّل في body.
    const format = response.responseFormat;
    if (format !== "text" && format !== "json") {
      throw new Error("mini-engine: responseFormat غير مدعوم: " + String(format));
    }
    const outputProperty = response.outputPropertyName || "data";
    let json;
    if (format === "json") {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        const failure = new Error("Invalid JSON in response body");
        failure.cost = latency;
        throw failure;
      }
      json = response.fullResponse
        ? { statusCode: status, statusMessage: "", headers: resp.headers || {}, body: parsed }
        : parsed;
    } else {
      json = response.fullResponse
        ? {
            statusCode: status,
            statusMessage: "",
            headers: resp.headers || {},
            [outputProperty]: text,
          }
        : { [outputProperty]: text };
    }
    return { item: { json }, cost: latency };
  } catch (error) {
    if (record.outcome === "") record.outcome = "error";
    return { error, cost: Number(error && error.cost) || 0 };
  }
}

// ---------------------------------------------------------------------------
// المحرّك
// ---------------------------------------------------------------------------

/**
 * @param {object} workflow JSON المسار (كما يولّده المولّد)
 * @param {object} [opts]
 * @param {object} opts.trigger {type:'webhook', method, path, headers, body, rawBody, withRawBinary}
 *   أو {type:'manual'|'schedule'} أو {type:'error', workflowName, node, message}
 * @param {object} [opts.env]
 * @param {string[]|'*'} [opts.credentials] أسماء الاعتمادات المتاحة ('*' = كلها)
 * @param {function} [opts.transport] async (req) => {status, headers, body, latencyMs}
 * @param {function} [opts.notifier] async ({type,node,params}) => object
 * @param {object} [opts.staticData] يُعدَّل بالمكان ويُسلسَل JSON في النهاية
 * @param {number} [opts.nowMs]
 * @param {string[]} [opts.allowBuiltin]
 */
export async function runWorkflow(workflow, opts = {}) {
  const clock = new VirtualClock(opts.nowMs === undefined ? 1793330000000 : opts.nowMs);
  const startMs = clock.now();
  const nodes = new Map();
  for (const node of workflow.nodes) {
    if (nodes.has(node.name)) throw new Error("اسم عقدة مكرَّر: " + node.name);
    nodes.set(node.name, node);
  }
  const incoming = new Map();
  for (const [from, entry] of Object.entries(workflow.connections)) {
    if (!nodes.has(from)) throw new Error("اتصال من عقدة غير موجودة: " + from);
    entry.main.forEach((list) => {
      for (const c of list) {
        if (!nodes.has(c.node)) throw new Error("اتصال إلى عقدة غير موجودة: " + c.node);
        if (!incoming.has(c.node)) incoming.set(c.node, new Set());
        incoming.get(c.node).add(c.index);
      }
    });
  }

  const allCredentialNames = new Set();
  for (const node of workflow.nodes) {
    for (const ref of Object.values(node.credentials || {})) allCredentialNames.add(ref.name);
  }
  const credentials =
    opts.credentials === undefined || opts.credentials === "*"
      ? allCredentialNames
      : new Set(opts.credentials);
  const allowBuiltin = opts.allowBuiltin || ["crypto"];
  const VDate = class extends Date {
    constructor(...args) {
      if (args.length === 0) super(clock.now());
      else super(...args);
    }
    static now() {
      return clock.now();
    }
  };
  const staticRoot = opts.staticData || {};
  const ctx = {
    clock,
    env: opts.env || {},
    credentials,
    transport:
      opts.transport ||
      (async () => {
        throw new Error("لا نقل HTTP محقون");
      }),
    notifier:
      opts.notifier ||
      (async () => {
        throw new Error("لا مُرسِل إشعارات محقون");
      }),
    httpCalls: [],
    nodeOutputs: new Map(),
    require: (name) => {
      const bare = String(name).replace(/^node:/, "");
      if (allowBuiltin.includes(bare) && bare === "crypto") return nodeCrypto;
      throw new Error("Cannot find module '" + name + "' (مسموح: " + allowBuiltin.join(",") + ")");
    },
    getStatic: (type) => {
      const key = type || "global";
      staticRoot[key] = staticRoot[key] || {};
      return staticRoot[key];
    },
    VDate,
  };

  const result = {
    responses: [],
    violations: [],
    failedNodes: [],
    trace: [],
    stalled: [],
    httpCalls: ctx.httpCalls,
    notifications: [],
    startMs,
    endMs: startMs,
    elapsedMs: 0,
    executed: false,
    failed: false,
  };
  const trigger = opts.trigger || { type: "manual" };
  const stack = [];
  const waiting = new Map();

  // ---- نقطة الدخول
  let entryNode;
  let entryItems;
  if (trigger.type === "webhook") {
    entryNode = workflow.nodes.find((n) => typeOf(n) === "webhook");
    if (!entryNode) throw new Error("لا عقدة webhook");
    const method = (trigger.method || "POST").toUpperCase();
    if (
      method !== String(entryNode.parameters.httpMethod || "GET").toUpperCase() ||
      trigger.path !== entryNode.parameters.path
    ) {
      return Object.assign(result, { reason: "webhook_not_matched" });
    }
    if (entryNode.parameters.responseMode !== "responseNode") {
      throw new Error("mini-engine: يدعم responseMode=responseNode فقط");
    }
    const rawText =
      trigger.rawBody !== undefined
        ? trigger.rawBody
        : typeof trigger.body === "string"
          ? trigger.body
          : JSON.stringify(trigger.body);
    let parsed = trigger.body;
    if (parsed === undefined || typeof parsed === "string") {
      try {
        parsed = JSON.parse(rawText);
      } catch (error) {
        parsed = {};
      }
    }
    const headers = {};
    for (const key of Object.keys(trigger.headers || {}))
      headers[key.toLowerCase()] = trigger.headers[key];
    const item = { json: { headers, params: {}, query: {}, body: clone(parsed) } };
    const wantsRaw = entryNode.parameters.options && entryNode.parameters.options.rawBody === true;
    if (wantsRaw && trigger.withRawBinary !== false && typeof rawText === "string") {
      item.binary = {
        data: {
          data: Buffer.from(rawText, "utf8").toString("base64"),
          mimeType: "application/json",
        },
      };
    }
    entryItems = [item];
  } else if (trigger.type === "error") {
    entryNode = workflow.nodes.find((n) => typeOf(n) === "errorTrigger");
    entryItems = [
      {
        json: {
          execution: {
            id: "1",
            error: { message: trigger.message, stack: trigger.stack || "stack" },
            lastNodeExecuted: trigger.node,
            mode: "trigger",
          },
          workflow: { id: "w1", name: trigger.workflowName },
        },
      },
    ];
  } else {
    entryNode = workflow.nodes.find((n) =>
      ["manualTrigger", "scheduleTrigger"].includes(typeOf(n)),
    );
    entryItems = [{ json: { timestamp: new Date(clock.now()).toISOString() } }];
  }
  if (!entryNode) throw new Error("لا عقدة بدء مناسبة للمشغّل " + trigger.type);
  result.executed = true;

  // ---- جدولة
  function deliver(target, inputIndex, items) {
    const node = nodes.get(target);
    if (typeOf(node) === "merge") {
      const slot = waiting.get(target) || { inputs: [] };
      slot.inputs[inputIndex] = (slot.inputs[inputIndex] || []).concat(cloneItems(items));
      waiting.set(target, slot);
      const need = Array.from(incoming.get(target) || []);
      if (need.every((i) => slot.inputs[i] && slot.inputs[i].length > 0)) {
        waiting.delete(target);
        stack.push({ name: target, inputs: slot.inputs });
      }
      return;
    }
    stack.push({ name: target, inputs: [cloneItems(items)] });
  }

  // ترتيب فروع العقدة الواحدة كما في n8n v1 (workflow-execute.ts): الأقرب إلى أعلى اليسار أولًا،
  // أي y تصاعديًّا ثم x تصاعديًّا، لا ترتيب الاتصالات في JSON. الفرز ثابت: التعادل يحفظ الترتيب.
  function dispatchOutputs(from, outputs) {
    const lists = (workflow.connections[from] && workflow.connections[from].main) || [];
    const entries = [];
    outputs.forEach((items, outIndex) => {
      if (!items || items.length === 0) return;
      for (const c of lists[outIndex] || []) {
        const position = (nodes.get(c.node) && nodes.get(c.node).position) || [0, 0];
        entries.push({ target: c.node, input: c.index, items, position });
      }
    });
    entries.sort((a, b) => a.position[1] - b.position[1] || a.position[0] - b.position[0]);
    for (const entry of entries.reverse()) deliver(entry.target, entry.input, entry.items);
  }

  // ---- تنفيذ عقدة واحدة. يعيد مصفوفة مخارج.
  async function execute(node, inputs) {
    const type = typeOf(node);
    const items = inputs[0] || [];
    const scopeOf = (item) => ({ json: item.json, env: ctx.env, clock });
    switch (type) {
      case "webhook":
      case "manualTrigger":
      case "scheduleTrigger":
      case "errorTrigger":
        return [items];
      case "noOp":
        return [items];
      case "set": {
        const p = node.parameters;
        return [
          items.map((item) => {
            const assigned = {};
            for (const a of p.assignments.assignments) {
              let value = evalValue(a.value, scopeOf(item));
              if (a.type === "number") value = Number(value);
              if (a.type === "boolean") value = Boolean(value);
              if (a.type === "string")
                value = value === undefined || value === null ? "" : String(value);
              assigned[a.name] = value;
            }
            return {
              json: p.includeOtherFields ? Object.assign({}, item.json, assigned) : assigned,
            };
          }),
        ];
      }
      case "if": {
        const yes = [];
        const no = [];
        for (const item of items) {
          (evalConditions(node.parameters.conditions, scopeOf(item)) ? yes : no).push(item);
        }
        return [yes, no];
      }
      case "switch": {
        const rules = node.parameters.rules.values;
        const fallback =
          node.parameters.options && node.parameters.options.fallbackOutput === "extra";
        const outs = Array.from({ length: rules.length + (fallback ? 1 : 0) }, () => []);
        for (const item of items) {
          let routed = false;
          for (let i = 0; i < rules.length && !routed; i += 1) {
            if (evalConditions(rules[i].conditions, scopeOf(item))) {
              outs[i].push(item);
              routed = true;
            }
          }
          if (!routed && fallback) outs[rules.length].push(item);
        }
        return outs;
      }
      case "merge": {
        const n = node.parameters.numberInputs || 2;
        let all = [];
        for (let i = 0; i < n; i += 1) all = all.concat(inputs[i] || []);
        return [all];
      }
      case "code": {
        const staticCalls = ctx.getStatic;
        const $input = {
          first: () => items[0],
          last: () => items[items.length - 1],
          all: () => items,
          item: items[0],
        };
        const $ = (name) => {
          const run = ctx.nodeOutputs.get(name);
          if (!run) throw new Error("Node '" + name + "' hasn't been executed");
          return {
            first: () => run[0],
            last: () => run[run.length - 1],
            all: () => run,
            item: run[0],
          };
        };
        const quiet = { log() {}, warn() {}, error() {}, info() {} };
        const fn = new AsyncFunction(
          "$input",
          "$json",
          "$",
          "$env",
          "$getWorkflowStaticData",
          "require",
          "Date",
          "process",
          "fetch",
          "console",
          node.parameters.jsCode,
        );
        const returned = await fn(
          $input,
          items[0] && items[0].json,
          $,
          ctx.env,
          staticCalls,
          ctx.require,
          VDate,
          undefined,
          undefined,
          quiet,
        );
        if (
          !Array.isArray(returned) ||
          returned.some((r) => !r || typeof r !== "object" || !r.json || typeof r.json !== "object")
        ) {
          throw new Error("Code doesn't return items properly");
        }
        return [cloneItems(returned)];
      }
      case "httpRequest": {
        const batchSize =
          (node.parameters.options.batching && node.parameters.options.batching.batch.batchSize) ||
          1;
        const out = [];
        const errors = [];
        for (let start = 0; start < items.length; start += batchSize) {
          const chunk = items.slice(start, start + batchSize);
          const results = await Promise.all(chunk.map((item) => callOne(node, item, ctx)));
          clock.advance(Math.max(0, ...results.map((r) => r.cost)));
          for (const r of results) {
            if (r.error) {
              if (
                node.onError === "continueRegularOutput" ||
                node.onError === "continueErrorOutput"
              ) {
                const errItem = { json: { error: String(r.error.message) } };
                if (node.onError === "continueRegularOutput") out.push(errItem);
                else errors.push(errItem);
              } else {
                throw r.error;
              }
            } else {
              out.push(r.item);
            }
          }
        }
        return node.onError === "continueErrorOutput" ? [out, errors] : [out];
      }
      case "telegram":
      case "emailSend": {
        const out = [];
        for (const item of items) {
          const params = evalValue(node.parameters, scopeOf(item));
          for (const [t, ref] of Object.entries(node.credentials || {})) {
            if (!ctx.credentials.has(ref.name)) {
              const failure = new Error(
                'Credentials with name "' + ref.name + '" for type "' + t + '" not found',
              );
              if (node.onError === "continueRegularOutput") {
                out.push({ json: { error: failure.message } });
                continue;
              }
              throw failure;
            }
          }
          try {
            const sent = await ctx.notifier({ type, node: node.name, params });
            result.notifications.push({ type, node: node.name, params });
            out.push({ json: sent || { ok: true } });
          } catch (error) {
            if (node.onError === "continueRegularOutput")
              out.push({ json: { error: String(error.message) } });
            else throw error;
          }
        }
        return [out];
      }
      case "respondToWebhook": {
        const item = items[0] || { json: {} };
        const p = evalValue(node.parameters, scopeOf(item));
        if (p.respondWith !== "text") throw new Error("mini-engine: respondWith=text فقط");
        const headers = {};
        const entries =
          (p.options && p.options.responseHeaders && p.options.responseHeaders.entries) || [];
        for (const e of entries) headers[String(e.name).toLowerCase()] = String(e.value);
        if (result.responses.length > 0) {
          result.violations.push("multiple_responses:" + node.name);
          return [items];
        }
        result.responses.push({
          node: node.name,
          statusCode: (p.options && p.options.responseCode) || 200,
          headers,
          body: String(p.responseBody),
          atMs: clock.now(),
        });
        return [items];
      }
      default:
        throw new Error("mini-engine: نوع عقدة غير مدعوم " + node.type);
    }
  }

  function splitErrorItems(outputs) {
    const ok = outputs[0].filter((i) => i.json.error === undefined);
    const bad = outputs[0].filter((i) => i.json.error !== undefined);
    return [ok, bad].concat(outputs.slice(2));
  }

  // ---- الحلقة
  stack.push({ name: entryNode.name, inputs: [entryItems] });
  let steps = 0;
  while (stack.length > 0) {
    steps += 1;
    if (steps > 5000) {
      result.violations.push("step_limit");
      break;
    }
    const { name, inputs } = stack.pop();
    const node = nodes.get(name);
    result.trace.push(name);
    let outputs;
    try {
      outputs = await execute(node, inputs);
      if (node.onError === "continueErrorOutput" && typeOf(node) !== "httpRequest") {
        outputs = splitErrorItems(outputs);
      }
    } catch (error) {
      if (node.onError === "continueErrorOutput") {
        outputs = [[], [{ json: { error: String(error.message) } }]];
      } else if (node.onError === "continueRegularOutput") {
        outputs = [[{ json: { error: String(error.message) } }]];
      } else {
        result.failedNodes.push({ node: name, error: String(error.message) });
        result.failed = true;
        break;
      }
    }
    ctx.nodeOutputs.set(name, outputs[0] || []);
    dispatchOutputs(name, outputs);
  }

  result.stalled = Array.from(waiting.keys());
  if (trigger.type === "webhook") {
    if (result.responses.length === 0) result.violations.push("no_response");
  }
  result.endMs = clock.now();
  result.elapsedMs = result.endMs - startMs;
  // static data يجب أن يكون JSON قابلًا للتسلسل: نحاكي حفظ n8n له في النهاية.
  for (const key of Object.keys(staticRoot))
    staticRoot[key] = JSON.parse(JSON.stringify(staticRoot[key]));
  result.staticData = staticRoot;
  result.outputs = Object.fromEntries(ctx.nodeOutputs);
  return result;
}
