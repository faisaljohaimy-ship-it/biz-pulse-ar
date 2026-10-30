/**
 * contract-checks: حرّاس ساكنة على JSON المسارات المولَّدة. كل دالة تعيد مصفوفة مشاكل (فارغة
 * = سليم). يستعملها `n8n-workflows.contract.test.ts` على المسارات الحقيقية، وتُجرَّب نفسها على
 * انتهاكات مزروعة عمدًا (المادة ٣٠: لا حارس بلا إثبات أنه يحمرّ).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkEveryPathResponds,
  collectExpressions,
  credentialRefs,
  innerExpressions,
  ALLOWED_EXPRESSION,
  typeName,
} from "./graph.js";

export const ALLOWED_NODE_TYPES = new Set([
  "webhook",
  "code",
  "httpRequest",
  "if",
  "switch",
  "merge",
  "set",
  "respondToWebhook",
  "scheduleTrigger",
  "errorTrigger",
  "noOp",
  "manualTrigger",
  "telegram",
  "emailSend",
]);

/** أنواع ممنوعة صراحةً (حتى لو أُضيفت يومًا إلى القائمة المسموحة بالخطأ). */
export const FORBIDDEN_TYPE_PATTERN =
  /git|vercel|supabase|postgres|executeCommand|ssh|mysql|mongo|redis|ftp|executeWorkflow|n8n$/i;

export const CONTRACT_PATHS = {
  "sadeed-web-research": "sadeed-research-v1",
  "fnn-dev-research": "fnn-research-v1",
  "fnn-automation-runner": "fnn-runner-v1",
};

export const CATALOG_CONTRACT = [
  "engineering_digest",
  "dependency_advisory_scan",
  "research_cache_purge",
  "canary_run_now",
  "owner_notify_test",
];

export const CREDENTIAL_NAMES = new Set([
  "Nx Google Search Key",
  "Nx Brave Search Key",
  "Nx Tavily Key",
  "Nx GitHub Read Token",
  "Nx Telegram Alert Bot",
  "Nx Telegram Owner Bot",
  "Nx SMTP Alert",
]);

/** ثوابت اختبار عامة (متجهات ذهبية حُسبت بـopenssl) يجوز ظهورها حرفيًّا في مسار الفحص الذاتي. */
export const PUBLIC_TEST_VECTORS = new Set([
  "00112233445566778899aabbccddeeff",
  "cd86c695120c61381321c00931d287e01d9c558f5559949c3cf88476a8a5b253",
  "cd5eb20be2c70ebfd4aa6fbc13188d97400ca8b6d181bf48b3949675dc6ba6d2",
  "0123456789abcdef0123456789abcdef",
]);

const SCRAPING_URL =
  /(?:^|[^A-Za-z0-9-])(?:[a-z0-9-]+\.)*(?:google|bing|duckduckgo|yahoo|baidu|yandex)\.[a-z.]+\/(?:search|url|html|\?q=|\?p=)/i;

const SECRET_SHAPES = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bsk_[a-f0-9]{40,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\bghp_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}/,
  /\btvly-[A-Za-z0-9_-]{10,}/,
  /\bBSA[A-Za-z0-9_-]{20,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{24}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
];

function stringsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsOf(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => stringsOf(v, out));
  return out;
}

export function checkForbiddenTypes(workflow) {
  const problems = [];
  for (const node of workflow.nodes) {
    const t = typeName(node);
    if (FORBIDDEN_TYPE_PATTERN.test(t))
      problems.push("نوع عقدة ممنوع: " + node.type + " («" + node.name + "»)");
    if (!ALLOWED_NODE_TYPES.has(t)) problems.push("نوع عقدة خارج القائمة المسموحة: " + node.type);
  }
  return problems;
}

export function checkSecrets(workflow, text) {
  const problems = [];
  for (const re of SECRET_SHAPES) if (re.test(text)) problems.push("شكل سرّ حرفي: " + re);
  for (const m of text.matchAll(/[0-9a-f]{32,}/gi)) {
    if (!PUBLIC_TEST_VECTORS.has(m[0].toLowerCase()))
      problems.push("سلسلة سداسية طويلة غير مسموحة: " + m[0].slice(0, 12) + "…");
  }
  for (const node of workflow.nodes) {
    const walk = (value, key) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const k of Object.keys(value)) walk(value[k], k);
      } else if (Array.isArray(value)) value.forEach((v) => walk(v, key));
      else if (
        typeof value === "string" &&
        /^(api[_-]?key|token|secret|password|authorization|x-subscription-token)$/i.test(key || "")
      ) {
        if (value.length > 0 && !value.startsWith("="))
          problems.push("قيمة حرفية في حقل حسّاس «" + key + "» في «" + node.name + "»");
      }
    };
    walk(node.parameters, "");
  }
  return problems;
}

export function checkCredentialsByName(workflow) {
  const problems = [];
  for (const { node, type, ref } of credentialRefs(workflow)) {
    const keys = Object.keys(ref).sort().join(",");
    if (keys !== "id,name")
      problems.push("مرجع اعتماد بمفاتيح غير (id,name) في «" + node + "»: " + keys);
    if (ref.id !== null)
      problems.push("id الاعتماد يجب أن يكون null (بالاسم فقط) في «" + node + "»");
    if (!CREDENTIAL_NAMES.has(ref.name)) problems.push("اسم اعتماد غير مسجَّل: " + ref.name);
    if (!/^[A-Za-z]+$/.test(type)) problems.push("نوع اعتماد غريب: " + type);
  }
  return problems;
}

export function checkNoScraping(workflow, text) {
  const problems = [];
  if (SCRAPING_URL.test(text)) problems.push("رابط كشط صفحات بحث");
  for (const node of workflow.nodes) {
    if (typeName(node) !== "httpRequest") continue;
    const url = String(node.parameters.url || "");
    if (/(^|\/\/|\.)(google|bing|duckduckgo)\.com(\/|$)/i.test(url))
      problems.push("HTTP إلى محرّك بحث غير رسمي: " + url);
  }
  return problems;
}

export function checkExpressions(workflow) {
  const problems = [];
  for (const { node, value } of collectExpressions(workflow)) {
    const inners = innerExpressions(value);
    if (inners.length === 0) problems.push("تعبير بلا {{ }} في «" + node + "»: " + value);
    for (const inner of inners) {
      if (!ALLOWED_EXPRESSION.some((re) => re.test(inner)))
        problems.push("تعبير خارج القواعد البسيطة في «" + node + "»: " + inner);
    }
  }
  return problems;
}

/** حقل المتن في ناتج HTTP كما يضعه n8n لردّ نصّي كامل (outputPropertyName). الشيفرة تقرأ هذا الاسم. */
export const BODY_FIELD = "data";
/** مهلة عقد البحث تسلّمها البوّابة (ما تبقّى من الموعد الداخلي): تعبير لا رقم ثابت. */
export const DYNAMIC_TIMEOUT_EXPR = "={{ $json.timeoutMs }}";
/** قيمة expectedTimeout لمسارات البحث: كل عقدة HTTP فيها بمهلة البوّابة لا بمهلة ثابتة. */
export const DYNAMIC_TIMEOUT = "dynamic";

const JSON_STRINGIFY_EXPR = /^=\{\{ JSON\.stringify\(\$json(?:\.[A-Za-z_][A-Za-z0-9_]*)+\) \}\}$/;

/**
 * jsonQuery وjsonHeaders: عقدة HTTP تستدعي JSON.parse على القيمة دائمًا (HttpRequestV3.node.ts).
 * تعبير مفرد يعيد كائنًا خامًا فيفشل («not valid JSON»)، لذلك يلزم نصّ JSON حرفي أو
 * ={{ JSON.stringify($json.a.b) }}. jsonBody وحده يقبل الكائن فلا يُفحص هنا.
 */
function jsonTextProblem(value, field, nodeName) {
  if (typeof value !== "string")
    return field + " ليس نصًّا في «" + nodeName + "» (JSON.parse يرمي على الكائن)";
  if (value.startsWith("=")) {
    return JSON_STRINGIFY_EXPR.test(value)
      ? null
      : field + " تعبير لا يُنتج نصّ JSON (استعمل JSON.stringify) في «" + nodeName + "»: " + value;
  }
  try {
    JSON.parse(value);
    return null;
  } catch (error) {
    return field + " نصّ ليس JSON صالحًا في «" + nodeName + "»";
  }
}

export function checkHttpNodes(workflow, expectedTimeout) {
  const problems = [];
  for (const node of workflow.nodes) {
    if (typeName(node) !== "httpRequest") continue;
    const p = node.parameters;
    if (node.onError !== "continueRegularOutput" && node.onError !== "continueErrorOutput") {
      problems.push("عقدة HTTP بلا onError متابعة: " + node.name);
    }
    const timeout = p.options && p.options.timeout;
    if (expectedTimeout === DYNAMIC_TIMEOUT) {
      if (timeout !== DYNAMIC_TIMEOUT_EXPR)
        problems.push("مهلة HTTP ليست مهلة البوّابة " + DYNAMIC_TIMEOUT_EXPR + ": " + node.name);
    } else {
      if (!Number.isInteger(timeout) || timeout < 500 || timeout > 20000)
        problems.push("مهلة HTTP غائبة أو خارج الحدود: " + node.name);
      if (expectedTimeout && timeout !== expectedTimeout)
        problems.push("مهلة " + node.name + " ليست " + expectedTimeout);
    }
    const response = p.options && p.options.response && p.options.response.response;
    if (!response || response.neverError !== true || response.fullResponse !== true) {
      problems.push("خيارات الاستجابة غير مضبوطة (neverError/fullResponse): " + node.name);
    } else {
      // الشيفرة تقرأ json.data نصًّا. responseFormat آخر يضع المتن في body محلَّلًا فتفشل القراءة.
      if (response.responseFormat !== "text")
        problems.push(
          "responseFormat ليس text (الشيفرة تقرأ " + BODY_FIELD + " نصًّا): " + node.name,
        );
      if (response.outputPropertyName !== BODY_FIELD)
        problems.push(
          "outputPropertyName ليس صريحًا " +
            BODY_FIELD +
            " (n8n يضع المتن هناك لا في body): " +
            node.name,
        );
    }
    if (p.sendQuery && p.specifyQuery === "json") {
      const issue = jsonTextProblem(p.jsonQuery, "jsonQuery", node.name);
      if (issue) problems.push(issue);
    }
    if (p.sendHeaders && p.specifyHeaders === "json") {
      const issue = jsonTextProblem(p.jsonHeaders, "jsonHeaders", node.name);
      if (issue) problems.push(issue);
    }
    // عقدة تحمل اعتمادًا لا تتبع التحويلات: الإصدار 4.2 يرسل الاعتماد افتراضيًّا إلى أصل آخر.
    const credentialed =
      Boolean(node.credentials) || (p.authentication !== undefined && p.authentication !== "none");
    if (credentialed) {
      const redirect = p.options && p.options.redirect && p.options.redirect.redirect;
      if (!redirect || redirect.followRedirects !== false)
        problems.push("عقدة بها اعتماد تتبع التحويلات (followRedirects ليس false): " + node.name);
    }
  }
  return problems;
}

export function checkWebhookContract(workflow) {
  const problems = [];
  const expected = CONTRACT_PATHS[workflow.name];
  const hooks = workflow.nodes.filter((n) => typeName(n) === "webhook");
  if (expected) {
    if (hooks.length !== 1) problems.push("يجب webhook واحد بالضبط");
    else if (hooks[0].parameters.path !== expected)
      problems.push("مسار الويب هوك " + hooks[0].parameters.path + " ≠ " + expected);
  } else if (hooks.length > 0) problems.push("ويب هوك غير متوقع في " + workflow.name);
  return problems;
}

export function checkCatalog(workflow) {
  const problems = [];
  const sw = workflow.nodes.find((n) => typeName(n) === "switch");
  if (!sw) return ["لا Switch"];
  const ids = sw.parameters.rules.values.map((r) => r.conditions.conditions[0].rightValue);
  if (JSON.stringify(ids) !== JSON.stringify(CATALOG_CONTRACT))
    problems.push("قواعد Switch لا تساوي الكتالوج: " + JSON.stringify(ids));
  if (!sw.parameters.options || sw.parameters.options.fallbackOutput !== "extra")
    problems.push("لا مخرج احتياطي في Switch");
  if (!sw.parameters.options || sw.parameters.options.renameFallbackOutput !== "unknown_workflow")
    problems.push("المخرج الاحتياطي ليس unknown_workflow");
  const out = workflow.connections[sw.name] ? workflow.connections[sw.name].main : [];
  if (out.length !== CATALOG_CONTRACT.length + 1 || out.some((o) => !o || o.length === 0))
    problems.push("مخارج Switch غير موصولة كلها");
  return problems;
}

export function checkProfile(workflow, profile, text) {
  const problems = [];
  const stub = /127\.0\.0\.1|localhost/.test(text);
  if (profile === "prod" && stub) problems.push("ملف prod فيه عنوان محلي/stub");
  if (profile === "stub") {
    for (const node of workflow.nodes) {
      if (node.credentials) problems.push("ملف stub يحمل اعتمادًا: " + node.name);
      if (typeName(node) === "httpRequest") {
        const url = String(node.parameters.url || "");
        if (url.startsWith("https://") && !url.includes("{{"))
          problems.push("ملف stub فيه مضيف حقيقي: " + url);
        if (node.parameters.authentication !== "none")
          problems.push("ملف stub بمصادقة: " + node.name);
      }
    }
  }
  if (profile === "prod") {
    for (const node of workflow.nodes) {
      if (typeName(node) !== "httpRequest") continue;
      const url = String(node.parameters.url || "");
      if (!(url.startsWith("https://") || url.startsWith("={{")))
        problems.push("HTTP بعنوان غير https وغير تعبير: " + url);
    }
  }
  return problems;
}

export function checkSettings(workflow) {
  const problems = [];
  if (workflow.active !== false) problems.push("المسار يجب أن يُستورد غير مفعّل");
  const s = workflow.settings || {};
  if (s.executionOrder !== "v1") problems.push("executionOrder ليس v1");
  if (s.saveDataSuccessExecution !== "none") problems.push("حفظ بيانات النجاح مفعّل");
  if (!Number.isInteger(s.executionTimeout) || s.executionTimeout <= 0)
    problems.push("لا executionTimeout");
  return problems;
}

/** كل الحرّاس على مسار واحد. */
export function checkWorkflow(workflow, text, profile = "prod") {
  const expectedTimeout =
    workflow.name === "sadeed-web-research" || workflow.name === "fnn-dev-research"
      ? DYNAMIC_TIMEOUT
      : 0;
  const problems = [
    ...checkForbiddenTypes(workflow),
    ...checkSecrets(workflow, text),
    ...checkCredentialsByName(workflow),
    ...checkNoScraping(workflow, text),
    ...checkExpressions(workflow),
    ...checkHttpNodes(workflow, expectedTimeout),
    ...checkWebhookContract(workflow),
    ...checkProfile(workflow, profile, text),
    ...checkSettings(workflow),
    ...checkHttpHosts(workflow, profile),
    ...checkInvisible(workflow.name, text),
    ...checkEmbeddedModules(workflow),
    ...checkDomainSeparation(workflow),
    ...checkEnvAccess(workflow),
    ...checkCodeNodes(workflow),
    ...checkRespondNodes(workflow),
    ...checkBranchOrder(workflow),
    ...checkKeyedBeforeKeyless(workflow),
    ...checkHeartbeatFirst(workflow),
    ...checkVisibleText(workflow.name, text),
  ];
  if (CONTRACT_PATHS[workflow.name]) problems.push(...checkEveryPathResponds(workflow));
  if (workflow.name === "fnn-automation-runner") problems.push(...checkCatalog(workflow));
  return problems;
}

export { stringsOf };

// ---------------------------------------------------------------------------
// حرّاس إضافية
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE_DIR = resolve(HERE, "..", "code");

/**
 * مضيفو HTTP المعتمدون، مكتوبون هنا حرفيًّا ومستقلّين عن الوحدة قيد الفحص (المادة ٣٠: لا يُشتقّ
 * التوقّع من الشيفرة المفحوصة). إضافة مضيف تعني تعديل هذه القائمة وتعديل ALLOWED_HOSTS في
 * plan-queries.js معًا في المراجعة نفسها؛ checkAllowedHostsPinned يحمرّ عند أي اختلاف بينهما.
 */
export const PINNED_HTTP_HOSTS = [
  "api.github.com",
  "api.openalex.org",
  "api.osv.dev",
  "api.search.brave.com",
  "api.tavily.com",
  "ar.wikipedia.org",
  "developer.mozilla.org",
  "en.wikipedia.org",
  "registry.npmjs.org",
  "services.nvd.nist.gov",
  "www.googleapis.com",
  "www.wikidata.org",
];
export const HTTP_HOSTS = new Set(PINNED_HTTP_HOSTS);

/** ALLOWED_HOSTS في plan-queries.js يطابق القائمة المثبَّتة هنا تمامًا (لا زيادة ولا نقص). */
export function checkAllowedHostsPinned(allowedHosts) {
  const problems = [];
  const list = Array.isArray(allowedHosts) ? allowedHosts : [];
  for (const host of list)
    if (!HTTP_HOSTS.has(host)) problems.push("مضيف في ALLOWED_HOSTS غير مثبَّت في الحارس: " + host);
  for (const host of PINNED_HTTP_HOSTS)
    if (!list.includes(host)) problems.push("مضيف مثبَّت غائب من ALLOWED_HOSTS: " + host);
  if (new Set(list).size !== list.length) problems.push("ALLOWED_HOSTS فيها تكرار");
  return problems;
}

/**
 * عناوين HTTP الديناميكية الوحيدة المسموحة، بالتطابق التام لا بالبادئة، وبحسب اسم العقدة:
 *  - HTTP Keyless: عنوان من الخطة (يُبنى من ثوابت plan-queries ومضيفيها المعتمدين).
 *  - HTTP Digest/Scan: عنوان من RunnerDispatch.buildRequest (api.github.com فقط).
 *  - Dead-man Ping: عنوان نبض يعيّنه المالك في البيئة.
 *  - فحوص التطبيق: أصل التطبيق من البيئة + مسار صحة ثابت (لا لاحقة تغيّر المضيف).
 * أي تعبير آخر (ومنه أي حقل من جسم الطلب) مرفوض. المضيفون الفعليون تُفحص في وقت التشغيل
 * (egressProblems في helpers.js) على كل سيناريو.
 */
const DYNAMIC_URLS = {
  "HTTP Keyless": ["={{ $json.url }}"],
  "HTTP Digest": ["={{ $json.req.url }}"],
  "HTTP Scan": ["={{ $json.req.url }}"],
  "Dead-man Ping": ["={{ $json.deadmanUrl }}"],
};
const APP_PROBE_NODES = new Set([
  "App Health",
  "Chat Health",
  "Canary App Health",
  "Canary Chat Health",
]);
const APP_PROBE_URL = /^=\{\{ \$env\.SADEED_APP_URL \}\}\/api\/(?:public|chat)\/health$/;

export function checkHttpHosts(workflow, profile = "prod") {
  const problems = [];
  for (const node of workflow.nodes) {
    if (typeName(node) !== "httpRequest") continue;
    const url = String(node.parameters.url || "");
    if (url.startsWith("=")) {
      const exact = DYNAMIC_URLS[node.name];
      const ok =
        (exact && exact.includes(url)) ||
        (APP_PROBE_NODES.has(node.name) && APP_PROBE_URL.test(url));
      if (!ok) problems.push("تعبير عنوان HTTP غير معتمد في «" + node.name + "»: " + url);
      continue;
    }
    if (profile === "stub") {
      const stub = /^http:\/\/127\.0\.0\.1:8787\/stub\/([^/?#]+)/.exec(url);
      if (!stub || !(HTTP_HOSTS.has(stub[1]) || stub[1] === "app")) {
        problems.push("عنوان stub غير معتمد في «" + node.name + "»: " + url);
      }
      continue;
    }
    const m = /^https:\/\/([^/?#]+)/.exec(url);
    if (!m) {
      problems.push("عنوان HTTP ليس https في «" + node.name + "»: " + url);
    } else if (!HTTP_HOSTS.has(m[1])) {
      problems.push("مضيف HTTP خارج القائمة المعتمدة: " + m[1]);
    }
  }
  return problems;
}

/** أحرف اتجاه/عرض صفري/تحكم حرفية في نصّ (هجوم الشيفرة المصدرية الخفية). */
export function findInvisible(text) {
  const found = [];
  const hidden = /\p{Cf}|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/u;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (hidden.test(ch)) {
      found.push("U+" + text.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0") + "@" + i);
    }
  }
  return found;
}

export function checkInvisible(label, text) {
  const found = findInvisible(text);
  return found.length === 0
    ? []
    : ["أحرف خفية حرفية في " + label + ": " + found.slice(0, 3).join(",")];
}

/** يستخرج الوحدات المضمَّنة (const X = (function () {...})();) من jsCode ويعيد {الاسم: النصّ}. */
export function embeddedModules(jsCode) {
  const out = {};
  const re =
    /const (\w+) = \(function \(\) \{\n {2}const module = \{ exports: \{\} \};\n([\s\S]*?)\n {2}return module\.exports;\n\}\)\(\);/g;
  let m;
  while ((m = re.exec(jsCode)) !== null) {
    out[m[1]] = m[2]
      .split("\n")
      .map((line) => (line.startsWith("  ") ? line.slice(2) : line))
      .join("\n");
  }
  return out;
}

const MODULE_FILES = {
  VerifyRequest: "verify-request",
  SignResponse: "sign-response",
  PlanQueries: "plan-queries",
  MergeRank: "merge-rank",
  BuildEnvelope: "build-envelope",
  Budget: "budget",
  CanaryEvaluate: "canary-evaluate",
  RunnerDispatch: "runner-dispatch",
};

/** كل وحدة مضمَّنة في عقدة Code تطابق ملفها في n8n/code حرفيًّا. */
export function checkEmbeddedModules(workflow) {
  const problems = [];
  let seen = 0;
  for (const node of workflow.nodes) {
    if (typeName(node) !== "code") continue;
    const mods = embeddedModules(node.parameters.jsCode);
    for (const [name, text] of Object.entries(mods)) {
      seen += 1;
      const file = MODULE_FILES[name];
      if (!file) {
        problems.push("وحدة مضمَّنة غير معروفة «" + name + "» في «" + node.name + "»");
        continue;
      }
      const source = readFileSync(join(CODE_DIR, file + ".js"), "utf8").trimEnd();
      if (text !== source)
        problems.push("الوحدة " + name + " في «" + node.name + "» تخالف n8n/code/" + file + ".js");
    }
  }
  if (
    seen === 0 &&
    workflow.nodes.some(
      (n) => typeName(n) === "code" && /RunnerDispatch|VerifyRequest/.test(n.parameters.jsCode),
    )
  ) {
    problems.push("لم تُستخرج وحدات مضمَّنة (تغيّر شكل التضمين؟)");
  }
  return problems;
}

/** كل $env.NAME في شيفرة وتعابير المسار مذكور في وثيقة البيئة. */
export function checkEnvNames(workflow, documented) {
  const problems = [];
  const names = new Set();
  const scan = (text) => {
    for (const m of text.matchAll(/\$env\.([A-Z][A-Z0-9_]*)/g)) names.add(m[1]);
  };
  for (const node of workflow.nodes) {
    if (typeName(node) === "code") scan(node.parameters.jsCode);
    for (const { value } of collectExpressions({ nodes: [node] })) scan(value);
  }
  for (const name of names)
    if (!documented.has(name)) problems.push("متغيّر بيئة غير موثَّق: " + name);
  return problems;
}

/** فصل النطاقين: مسار سَدِيد يقرأ سرّه وحده، ومسارا FNN سرّهما وحده. */
export function checkDomainSeparation(workflow) {
  const problems = [];
  const code = workflow.nodes
    .filter((n) => typeName(n) === "code")
    .map((n) => n.parameters.jsCode)
    .join("\n");
  const readsSadeed = /\$env\.SADEED_N8N_SECRET/.test(code);
  const readsFinn = /\$env\.FINN_N8N_SECRET/.test(code);
  if (workflow.name === "sadeed-web-research" && (!readsSadeed || readsFinn))
    problems.push("sadeed يجب أن يقرأ SADEED_N8N_SECRET وحده");
  if (
    (workflow.name === "fnn-dev-research" || workflow.name === "fnn-automation-runner") &&
    (!readsFinn || readsSadeed)
  ) {
    problems.push(workflow.name + " يجب أن يقرأ FINN_N8N_SECRET وحده");
  }
  return problems;
}

const RETIRED_NAMES = [
  /NEXIOS/i,
  /NEEXIOS/i,
  /\bNexus\b/i,
  /نكسيوس/,
  /\bFINN\b/,
  /فِن/,
  /آريا/,
  /\bMIRQAB\b/i,
  /مِرْقَب/,
];

/**
 * نصوص تظهر للمالك أو التطبيق (تنبيهات، ملخصات، أسماء عقد، README، مصدر الشيفرة المضمَّنة):
 * بلا شرطة طويلة وبلا اسم منتج سابق. قاعدة واحدة لكل مصدر لا للـREADME وحده.
 */
export function checkVisibleText(label, text) {
  const problems = [];
  if (text.includes("—")) problems.push("شرطة طويلة في " + label);
  for (const re of RETIRED_NAMES)
    if (re.test(text)) problems.push("اسم منتج سابق في " + label + ": " + re);
  return problems;
}

/** README العربي: أقسام لازمة، بلا شرطة طويلة، بلا اسم منتج سابق، وكل اعتماد وكل متغيّر مذكور. */
export function checkReadme(text, { credentialNames, envNames }) {
  const problems = [];
  for (const heading of [
    "## المسارات",
    "## 1) متطلبات n8n",
    "## 2) متغيّرات بيئة n8n",
    "## 3) الاعتمادات",
    "## 4) الاستيراد",
    "## 5) التفعيل",
    "## 6) الفحص الذاتي",
    "## 7) تجربة بـ curl",
    "## 9) التراجع",
  ]) {
    if (!text.includes(heading)) problems.push("قسم غائب في README: " + heading);
  }
  problems.push(...checkVisibleText("README", text));
  for (const name of credentialNames)
    if (!text.includes(name)) problems.push("اعتماد غير مذكور في README: " + name);
  for (const name of envNames)
    if (!text.includes("`" + name + "`")) problems.push("متغيّر غير مذكور في README: " + name);
  if (!text.includes("لم تُشغَّل هذه المسارات على n8n حقيقي"))
    problems.push("README بلا تصريح عدم التشغيل على n8n حقيقي");
  if (!text.includes("SADEED_WEB_RESEARCH"))
    problems.push("README بلا خطوة التراجع SADEED_WEB_RESEARCH");
  if (!text.includes("NODE_FUNCTION_ALLOW_BUILTIN"))
    problems.push("README بلا NODE_FUNCTION_ALLOW_BUILTIN");
  if ((text.match(/\p{Script=Arabic}/gu) || []).length < 500) problems.push("README ليس عربيًّا");
  return problems;
}

// ---------------------------------------------------------------------------
// عزل الأسرار والخروج الشبكي من عقد Code (حدود المكان، لا قائمة أمنيات)
// ---------------------------------------------------------------------------

export const SECRET_ENV_NAMES = ["SADEED_N8N_SECRET", "FINN_N8N_SECRET"];

/** متغيّرات البيئة المسموح قراءتها في تعابير العقد غير Code: إعدادات لا أسرار. */
const EXPRESSION_ENV_ALLOWED = new Set([
  "SADEED_APP_URL",
  "NX_DEADMAN_URL",
  "NX_ALERT_CHAT_ID",
  "NX_OWNER_CHAT_ID",
  "NX_ALERT_EMAIL_FROM",
  "NX_ALERT_EMAIL_TO",
]);

/** ما يقرأه كل عقدة Code من البيئة، بالاسم: السرّ في عقدتي التحقق والتوقيع وحدهما. */
const CODE_ENV_ALLOWED = {
  Verify: SECRET_ENV_NAMES,
  Sign: SECRET_ENV_NAMES,
  Plan: ["NX_GOOGLE_CX"],
  Evaluate: ["NX_DEADMAN_URL", "NX_ALERT_CHAT_ID"],
  Format: ["NX_ALERT_CHAT_ID"],
};

export function checkEnvAccess(workflow) {
  const problems = [];
  for (const node of workflow.nodes) {
    if (typeName(node) === "code") {
      const code = String(node.parameters.jsCode || "");
      const allowed = new Set(CODE_ENV_ALLOWED[node.name] || []);
      for (const m of code.matchAll(/\$env\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (!allowed.has(m[1]))
          problems.push("متغيّر بيئة غير مسموح في عقدة Code «" + node.name + "»: " + m[1]);
      }
      // أي وصول آخر إلى $env (أقواس، تفكيك، تمرير الكائن كله) يخفي الاسم عن الفحص.
      if (/\$env\b/.test(code.replace(/\$env\.[A-Za-z_][A-Za-z0-9_]*/g, "")))
        problems.push("وصول غير قياسي إلى $env في عقدة Code «" + node.name + "»");
    } else {
      for (const { value } of collectExpressions({ nodes: [node] })) {
        for (const m of value.matchAll(/\$env\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
          if (!EXPRESSION_ENV_ALLOWED.has(m[1]))
            problems.push("متغيّر بيئة غير مسموح في تعبير «" + node.name + "»: " + m[1]);
        }
        if (/\$env\b/.test(value.replace(/\$env\.[A-Za-z_][A-Za-z0-9_]*/g, "")))
          problems.push("وصول غير قياسي إلى $env في تعبير «" + node.name + "»");
      }
    }
  }
  return problems;
}

/** أنماط ممنوعة في نصّ Code كله (الشيفرة المضمَّنة والغراء): خروج شبكي، تنفيذ ديناميكي، نظام. */
const CODE_FORBIDDEN = [
  [/\bfetch\b/, "fetch"],
  [/\$helpers\b|\bhelpers\s*\.|\.\s*helpers\b/, "helpers"],
  [/httpRequest/i, "httpRequest"],
  [/\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/, "واجهة شبكة"],
  // الوصول إلى مُنشئ الدالة (AsyncFunction) بلا تسميته: .constructor وgetPrototypeOf وReflect و__proto__.
  [
    /\beval\b|\b(?:Async|Generator)?Function\b|\.\s*constructor\b|\bgetPrototypeOf\b|\bReflect\b|__proto__/,
    "تنفيذ ديناميكي",
  ],
  // this في عقدة Code هو سياق n8n (this.helpers.httpRequest): لا حاجة له في شيفرتنا، والوصول بالأقواس يخفي الاسم.
  [/\bthis\b/, "this"],
  [/\bimport\b/, "import"],
  [
    /\bprocess\b|\bglobalThis\b|\bchild_process\b|\bworker_threads\b|\bWebAssembly\b/,
    "نظام/عمليات",
  ],
];

export function checkCodeNodes(workflow) {
  const problems = [];
  for (const node of workflow.nodes) {
    if (typeName(node) !== "code") continue;
    const p = node.parameters;
    const code = String(p.jsCode || "");
    if (p.language !== "javaScript")
      problems.push("لغة عقدة Code ليست javaScript في «" + node.name + "»");
    for (const [re, label] of CODE_FORBIDDEN) {
      if (re.test(code))
        problems.push("نمط ممنوع (" + label + ") في عقدة Code «" + node.name + "»");
    }
    // require مسموح لوحدة crypto وحدها.
    for (const m of code.matchAll(/\brequire\b\s*(\(\s*([^)]*)\))?/g)) {
      if (!m[1] || !/^["'](?:node:)?crypto["']$/.test(m[2].trim()))
        problems.push("require غير crypto في عقدة Code «" + node.name + "»: " + m[0].trim());
    }
  }
  return problems;
}

/** ما تصدره Respond: متن من العقدة السابقة (أو ثابت JSON) + ثلاث ترويسات بقيم من حقول معروفة فقط. */
const RESPOND_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Nx-Resp-Ts": "={{ $json.respTs }}",
  "X-Nx-Resp-Sig": "={{ $json.respSig }}",
};

export function checkRespondNodes(workflow) {
  const problems = [];
  for (const node of workflow.nodes) {
    if (typeName(node) !== "respondToWebhook") continue;
    const p = node.parameters;
    if (p.respondWith !== "text") problems.push("Respond ليست text في «" + node.name + "»");
    const body = p.responseBody;
    const literalJson = typeof body === "string" && body.startsWith("{") && isJson(body);
    if (body !== "={{ $json.body }}" && !literalJson)
      problems.push("متن Respond ليس ={{ $json.body }} ولا JSON حرفيًّا في «" + node.name + "»");
    if (!p.options || p.options.responseCode !== 200)
      problems.push("رمز Respond ليس 200 في «" + node.name + "»");
    const entries =
      (p.options && p.options.responseHeaders && p.options.responseHeaders.entries) || [];
    for (const e of entries) {
      if (!Object.prototype.hasOwnProperty.call(RESPOND_HEADERS, e.name))
        problems.push("ترويسة ردّ غير معتمدة «" + e.name + "» في «" + node.name + "»");
      else if (e.value !== RESPOND_HEADERS[e.name])
        problems.push("قيمة ترويسة «" + e.name + "» غير معتمدة في «" + node.name + "»: " + e.value);
    }
  }
  return problems;
}

function isJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// ترتيب الفروع (n8n v1: الأقرب إلى أعلى اليسار أولًا، لا ترتيب الاتصالات)
// ---------------------------------------------------------------------------

const positionOf = (node) => (Array.isArray(node.position) ? node.position : [0, 0]);
/** هل a يسبق b في ترتيب التنفيذ؟ y تصاعديًّا ثم x تصاعديًّا (مصدر workflow-execute.ts). */
export function executesBefore(a, b) {
  const pa = positionOf(a);
  const pb = positionOf(b);
  return pa[1] < pb[1] || (pa[1] === pb[1] && pa[0] < pb[0]);
}

/** اتصالات كل مخرج مرتَّبة كما سيُنفَّذ: JSON يُقرأ كما يعمل، ولا يخدع المحرّك ولا القارئ. */
export function checkBranchOrder(workflow) {
  const problems = [];
  const byName = new Map(workflow.nodes.map((n) => [n.name, n]));
  for (const [from, entry] of Object.entries(workflow.connections)) {
    entry.main.forEach((list, output) => {
      for (let i = 1; i < list.length; i += 1) {
        const prev = byName.get(list[i - 1].node);
        const next = byName.get(list[i].node);
        if (prev && next && executesBefore(next, prev)) {
          problems.push(
            "ترتيب الاتصالات يخالف ترتيب التنفيذ بالإحداثيات عند «" +
              from +
              "» المخرج " +
              output +
              ": «" +
              list[i].node +
              "» يسبق «" +
              list[i - 1].node +
              "»",
          );
        }
      }
    });
  }
  return problems;
}

/**
 * مسارات البحث: المزوّدون بمفتاح (بوّابات Gate X) يُنفَّذون قبل دفعة بلا مفتاح (Gate Keyless).
 * الدفعة الأخيرة تأخذ ما تبقّى من الموعد، فإن سبقت بدأت المزوّدات بمفتاح بعد ذهاب الميزانية.
 */
export function checkKeyedBeforeKeyless(workflow) {
  const keyless = workflow.nodes.find((n) => n.name === "Gate Keyless");
  if (!keyless) return [];
  const problems = [];
  for (const n of workflow.nodes) {
    if (typeName(n) === "code" && /^Gate /.test(n.name) && n.name !== "Gate Keyless") {
      if (!executesBefore(n, keyless))
        problems.push("«" + n.name + "» لا يسبق «Gate Keyless» في ترتيب التنفيذ");
    }
  }
  return problems;
}

/** المراقب: النبض الخارجي يُنفَّذ قبل فرع التنبيه، فلا يُسكته فشل تسليم التنبيه. */
export function checkHeartbeatFirst(workflow) {
  if (workflow.name !== "watchdog-canary") return [];
  const ping = workflow.nodes.find((n) => n.name === "Dead-man Configured?");
  const alert = workflow.nodes.find((n) => n.name === "Notify?");
  if (!ping || !alert) return ["عقدة النبض أو التنبيه غائبة من المراقب"];
  return executesBefore(ping, alert) ? [] : ["فرع النبض لا يسبق فرع التنبيه في المراقب"];
}

// ---------------------------------------------------------------------------
// فحوص وقت التشغيل على ما نفّذه المحرّك (تُستعمل في كل سيناريو)
// ---------------------------------------------------------------------------

/**
 * كل نداء HTTP نُفّذ: https، مضيفه من القائمة المثبَّتة (أو مضيف بيئة المالك المعلن)، بلا userinfo،
 * بمهلة محدودة (لا الافتراضي الطويل)، وبلا تتبّع تحويلات إن حمل اعتمادًا.
 */
export function egressProblems(httpCalls, extraHosts = []) {
  const allowed = new Set([...PINNED_HTTP_HOSTS, ...extraHosts]);
  const problems = [];
  for (const call of httpCalls) {
    let u;
    try {
      u = new URL(call.url);
    } catch (error) {
      problems.push("عنوان نداء غير صالح: " + call.url);
      continue;
    }
    if (u.protocol !== "https:") problems.push("نداء غير https: " + call.url);
    if (u.username || u.password) problems.push("نداء بمعرّف مستخدم: " + call.node);
    if (!allowed.has(u.host))
      problems.push("نداء إلى مضيف خارج القائمة: " + u.host + " («" + call.node + "»)");
    if (!Number.isFinite(call.timeoutMs) || call.timeoutMs < 250 || call.timeoutMs > 20000)
      problems.push("مهلة نداء خارج الحدود (" + call.timeoutMs + ") في «" + call.node + "»");
    if (call.credentials && call.credentials.length > 0 && call.followRedirects !== false)
      problems.push("نداء بالاعتماد يتبع التحويلات في «" + call.node + "»");
  }
  return problems;
}

/** ردّ الويب هوك لا يحمل أي سرّ، لا في المتن ولا في الترويسات. */
export function secretLeakProblems(response, secrets) {
  if (!response) return [];
  const blob = JSON.stringify({ headers: response.headers, body: response.body });
  return secrets
    .filter((s) => typeof s === "string" && s.length > 0 && blob.includes(s))
    .map(() => "سرّ ظاهر في ردّ الويب هوك");
}
