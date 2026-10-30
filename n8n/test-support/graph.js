/**
 * graph: تحليل ساكن لـJSON مسارات n8n (للحارس العقدي فقط، ليس جزءًا مما يُشحن).
 *
 * يجيب: كم مخرجًا لكل عقدة؟ هل يصل كل مسار (نجاحًا وخطأً) إلى عقدة Respond؟ هل في أي
 * عقدة مخرج معلَّق؟ ما التعابير المستعملة؟ ما الاعتمادات؟ كلها على الرسم المولَّد.
 */

export function typeName(node) {
  return String(node.type).replace("n8n-nodes-base.", "");
}

/** عدد مخارج العقدة كما سيعرّفها n8n من معاملاتها. */
export function outputCount(node) {
  const t = typeName(node);
  if (t === "if") return 2;
  if (t === "switch") {
    const rules = node.parameters.rules.values.length;
    return (
      rules +
      (node.parameters.options && node.parameters.options.fallbackOutput === "extra" ? 1 : 0)
    );
  }
  if (node.onError === "continueErrorOutput") return 2;
  if (t === "respondToWebhook") return 0;
  return 1;
}

export function successors(workflow, name, output) {
  const entry = workflow.connections[name];
  if (!entry || !entry.main[output]) return [];
  return entry.main[output].map((c) => c.node);
}

export function allSuccessors(workflow, name) {
  const entry = workflow.connections[name];
  if (!entry) return [];
  return entry.main.flat().map((c) => c.node);
}

const CAN_FAIL = new Set([
  "code",
  "httpRequest",
  "set",
  "telegram",
  "emailSend",
  "respondToWebhook",
]);

/**
 * يفحص أن كل مسار من الويب هوك ينتهي بردّ.
 * @returns {string[]} المشاكل (فارغة = سليم)
 */
export function checkEveryPathResponds(workflow) {
  const problems = [];
  const byName = new Map(workflow.nodes.map((n) => [n.name, n]));
  const hook = workflow.nodes.find((n) => typeName(n) === "webhook");
  if (!hook) return ["لا عقدة webhook"];
  if (hook.parameters.responseMode !== "responseNode")
    problems.push("responseMode ليس responseNode");
  if (hook.parameters.httpMethod !== "POST") problems.push("httpMethod ليس POST");

  const reachable = new Set();
  const queue = [hook.name];
  while (queue.length) {
    const name = queue.pop();
    if (reachable.has(name)) continue;
    reachable.add(name);
    for (const next of allSuccessors(workflow, name)) queue.push(next);
  }

  // كل مخرج لكل عقدة قابلة للبلوغ يجب أن يتصل (عدا Respond).
  for (const name of reachable) {
    const node = byName.get(name);
    const t = typeName(node);
    if (t === "respondToWebhook") continue;
    const count = outputCount(node);
    for (let o = 0; o < count; o += 1) {
      if (successors(workflow, name, o).length === 0) {
        problems.push("المخرج " + o + " للعقدة «" + name + "» معلَّق بلا اتصال");
      }
    }
    if (
      CAN_FAIL.has(t) &&
      node.onError !== "continueRegularOutput" &&
      node.onError !== "continueErrorOutput"
    ) {
      problems.push("العقدة «" + name + "» قد تفشل بلا onError فتنتهي بلا ردّ");
    }
  }

  // كل عقدة قابلة للبلوغ تبلغ Respond (DFS مع ذاكرة).
  const memo = new Map();
  const reaches = (name, trail) => {
    if (memo.has(name)) return memo.get(name);
    if (trail.has(name)) return false;
    const node = byName.get(name);
    if (typeName(node) === "respondToWebhook") return true;
    trail.add(name);
    const ok = allSuccessors(workflow, name).some((next) => reaches(next, trail));
    trail.delete(name);
    memo.set(name, ok);
    return ok;
  };
  for (const name of reachable) {
    if (!reaches(name, new Set())) problems.push("العقدة «" + name + "» لا تبلغ أي Respond");
  }
  // مسار الخطأ بالذات: كل عقدة بمخرج خطأ يصل مخرجها 1 إلى Respond.
  for (const name of reachable) {
    const node = byName.get(name);
    if (node.onError === "continueErrorOutput" && typeName(node) !== "respondToWebhook") {
      const ok = successors(workflow, name, 1).some((next) => reaches(next, new Set()));
      if (!ok) problems.push("مخرج الخطأ للعقدة «" + name + "» لا يبلغ Respond");
    }
  }
  if (!workflow.nodes.some((n) => typeName(n) === "respondToWebhook"))
    problems.push("لا عقدة Respond");
  return problems;
}

/** كل سلسلة تعبير (تبدأ بـ=) في معاملات المسار، مع اسم العقدة. jsCode مستثنى. */
export function collectExpressions(workflow) {
  const found = [];
  const walk = (value, node, key) => {
    if (typeof value === "string") {
      if (key !== "jsCode" && value.startsWith("=")) found.push({ node: node.name, value });
    } else if (Array.isArray(value)) value.forEach((v) => walk(v, node, key));
    else if (value && typeof value === "object") {
      for (const k of Object.keys(value)) walk(value[k], node, k);
    }
  };
  for (const node of workflow.nodes) walk(node.parameters, node, "");
  return found;
}

/** الأجزاء داخل {{ }} من تعبير. */
export function innerExpressions(value) {
  const out = [];
  const re = /\{\{\s*([\s\S]+?)\s*\}\}/g;
  let m;
  while ((m = re.exec(value)) !== null) out.push(m[1]);
  return out;
}

export const ALLOWED_EXPRESSION = [
  /^\$json(\.[A-Za-z_][A-Za-z0-9_]*)+$/,
  // نصّ JSON لحقلي jsonQuery وjsonHeaders (عقدة HTTP تستدعي JSON.parse، فالكائن الخام يفشل).
  /^JSON\.stringify\(\$json(\.[A-Za-z_][A-Za-z0-9_]*)+\)$/,
  /^\$env\.[A-Z][A-Z0-9_]*$/,
  /^Date\.now\(\)$/,
];

export function credentialRefs(workflow) {
  const refs = [];
  for (const node of workflow.nodes) {
    for (const [type, ref] of Object.entries(node.credentials || {})) {
      refs.push({ node: node.name, type, ref });
    }
  }
  return refs;
}
