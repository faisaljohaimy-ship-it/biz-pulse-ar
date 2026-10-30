/**
 * canary-evaluate: يقرّر هل يُرسل المراقب تنبيهًا، من ردود فحوص الصحة.
 *
 * نقية: الحالة والوقت يُمرَّران ويُعادان. القاعدة: تنبيه عند تغيّر الحالة فقط،
 * وتذكير كل 6 ساعات ما دامت الحالة غير سليمة، وإشعار تعافٍ واحد.
 *
 * التثبيت: تغيّر الحالة لا يُعتمد إلا بعد رصدين متتاليين (confirmations=2)
 * حتى لا يُنتج فحص واحد فاشل تنبيهًا وتعافيًا في دقيقتين. الرصد الأول بعد
 * التشغيل يُعتمد فورًا، وتنبيهه فقط إن لم يكن سليمًا.
 *
 * الفحوص الثلاثة:
 *   app      من /api/public/health : status = ok | degraded | down
 *   chat     من /api/chat/health   : gate = verified | degraded | closed
 *   provider نداء بحث بلا مفتاح يثبت أن n8n يصل إلى الويب (يخفّض إلى degraded فقط)
 *
 * يضم الملف أيضًا تنسيق رسالة الخطأ المنقّحة لـerror-handler: اسم المسار
 * والعقدة وأول 200 حرف من الرسالة بعد حذف الأسرار، ولا شيء من بيانات المدخلات.
 *
 * ردود الفحوص بشكل ناتج عقدة HTTP في n8n الحقيقي (ردّ نصّي كامل): {statusCode, headers, data}
 * والمتن في data (outputPropertyName)، لا في body.
 *
 * التسليم: رسالة تيليجرام تُرسل بوضع HTML بعد تهريب & و< و> (toTelegramHtml)، لأن الوضع
 * الافتراضي Markdown القديم يرفض الرسالة عند شرطة سفلية مفردة (gate_closed) فيضيع التنبيه.
 * deliveryOutcome يقرّر هل وصل التنبيه، وplanDeliveryFailure يعيد الحالة إلى ما قبل التقييم
 * (تنبيه لم يصل كأنه لم يقع) ويقرّر هل يُرفع خطأ ظاهر (مرة كل 30 دقيقة كحدّ أقصى).
 */
const REMINDER_MS = 6 * 3600 * 1000;
const CONFIRMATIONS = 2;
const RANK = { ok: 0, degraded: 1, down: 2 };
const LABELS = { app: "الصحة العامة", chat: "الدردشة", provider: "مزوّد الويب" };
const STATUS_AR = { ok: "سليمة", degraded: "متدهورة", down: "متوقفة" };
const DELIVERY_RAISE_EVERY_MS = 30 * 60 * 1000;

function parseBody(body) {
  if (body && typeof body === "object") return body;
  if (typeof body !== "string" || body.length === 0 || body.length > 262144) return null;
  try {
    const value = JSON.parse(body);
    return value && typeof value === "object" ? value : null;
  } catch (error) {
    return null;
  }
}

function reached(res) {
  return res && typeof res === "object" && typeof res.statusCode === "number";
}

function checkApp(res) {
  if (!reached(res)) return { name: "app", status: "down", detail: "unreachable" };
  const body = parseBody(res.data);
  if (!body) return { name: "app", status: "down", detail: "bad_body" };
  const bad = [];
  const subsystems = body.subsystems && typeof body.subsystems === "object" ? body.subsystems : {};
  for (const key of Object.keys(subsystems)) {
    const s = subsystems[key] && subsystems[key].status;
    if (s === "down" || s === "degraded") bad.push(key);
  }
  const detail = bad.slice(0, 5).join(",");
  if (body.status === "ok") return { name: "app", status: "ok", detail: "" };
  if (body.status === "degraded") return { name: "app", status: "degraded", detail };
  return { name: "app", status: "down", detail: detail || "status_" + String(body.status) };
}

function checkChat(res) {
  if (!reached(res) || res.statusCode !== 200) {
    return { name: "chat", status: "down", detail: "unreachable" };
  }
  const body = parseBody(res.data);
  if (!body || body.ok !== true) return { name: "chat", status: "down", detail: "bad_body" };
  if (body.gate === "closed") return { name: "chat", status: "degraded", detail: "gate_closed" };
  if (body.gate === "degraded")
    return { name: "chat", status: "degraded", detail: "gate_degraded" };
  if (body.key_present === false) return { name: "chat", status: "degraded", detail: "no_key" };
  return { name: "chat", status: "ok", detail: "" };
}

function checkProvider(res) {
  if (!reached(res) || res.statusCode !== 200) {
    return { name: "provider", status: "degraded", detail: "unreachable" };
  }
  const body = parseBody(res.data);
  if (!body) return { name: "provider", status: "degraded", detail: "bad_body" };
  return { name: "provider", status: "ok", detail: "" };
}

function worst(checks) {
  let status = "ok";
  for (const check of checks) if (RANK[check.status] > RANK[status]) status = check.status;
  return status;
}

function hoursText(ms) {
  const hours = Math.max(1, Math.round(ms / 3600000));
  return hours === 1 ? "نحو ساعة" : "نحو " + hours + " ساعات";
}

/** رسالة تنبيه عربية قصيرة. لا أسرار ولا بيانات مدخلات. */
function formatAlert(input) {
  const lines = [];
  const status = STATUS_AR[input.status] || "غير معروفة";
  if (input.type === "recovery") {
    lines.push("تعافى سَدِيد. كل الفحوص سليمة الآن.");
  } else if (input.type === "reminder") {
    lines.push("تذكير: الحالة ما زالت " + status + " منذ " + hoursText(input.sinceMs || 0) + ".");
  } else {
    lines.push("تنبيه: حالة سَدِيد الآن " + status + ".");
  }
  if (input.type !== "recovery") {
    for (const check of input.checks) {
      if (check.status === "ok") continue;
      lines.push(
        "- " +
          LABELS[check.name] +
          ": " +
          STATUS_AR[check.status] +
          (check.detail ? " (" + check.detail + ")" : ""),
      );
    }
  }
  return lines.join("\n");
}

/**
 * @param {object} input
 * @param {{app: object, chat: object, provider: object}} input.health ردود HTTP كما وصلت
 * @param {object} [input.state]
 * @param {number} input.now
 */
function canaryEvaluate(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const health = (input && input.health) || {};
  const checks = [checkApp(health.app), checkChat(health.chat), checkProvider(health.provider)];
  const observed = worst(checks);
  const prev = input && input.state && typeof input.state === "object" ? input.state : {};
  const known = RANK[prev.status] !== undefined;
  const next = {
    status: known ? prev.status : observed,
    since: typeof prev.since === "number" ? prev.since : now,
    lastNotifiedAt: typeof prev.lastNotifiedAt === "number" ? prev.lastNotifiedAt : 0,
    pendingStatus: "",
    pendingCount: 0,
  };
  let notify = false;
  let type = "none";

  if (!known) {
    next.since = now;
    if (observed !== "ok") {
      notify = true;
      type = "initial";
    }
  } else if (observed === prev.status) {
    if (observed !== "ok" && now - next.lastNotifiedAt >= REMINDER_MS) {
      notify = true;
      type = "reminder";
    }
  } else {
    const count = prev.pendingStatus === observed ? (Number(prev.pendingCount) || 0) + 1 : 1;
    if (count >= CONFIRMATIONS) {
      next.status = observed;
      next.since = now;
      notify = true;
      type = observed === "ok" ? "recovery" : "change";
    } else {
      next.pendingStatus = observed;
      next.pendingCount = count;
    }
  }
  if (notify) next.lastNotifiedAt = now;

  const message = notify
    ? formatAlert({
        type,
        status: next.status,
        checks,
        sinceMs: now - next.since,
      })
    : "";
  return { observed, status: next.status, notify, type, checks, state: next, message };
}

/** تهريب نصّ لتيليجرام بوضع HTML: & و< و> وحدها. لا وسوم منسّقة في تنبيهاتنا. */
function toTelegramHtml(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * هل وصل التنبيه؟ يكفي نجاح قناة واحدة. ناتج تيليجرام الناجح يحمل ok أو result؛ والفاشل
 * يحمل error (عقدتا التنبيه بمتابعة عند الخطأ فيصل الخطأ كعنصر).
 * @param {{telegram?: object[], email?: object[]}} input عناصر json لكل قناة
 */
function deliveryOutcome(input) {
  const tg = input && Array.isArray(input.telegram) ? input.telegram : [];
  const em = input && Array.isArray(input.email) ? input.email : [];
  const telegram =
    tg.length > 0 &&
    tg.every((j) => isRecord(j) && !j.error && (j.ok === true || j.result !== undefined));
  const email = em.length > 0 && em.every((j) => isRecord(j) && !j.error);
  return { delivered: telegram || email, telegram, email };
}

/**
 * تنبيه لم يصل: يعيد حالة المراقب إلى ما قبل التقييم فيُعاد في الدقيقة التالية، ويقرّر رفع
 * خطأ ظاهر في سجلّ التنفيذات (فيعمل معالج الأخطاء) مرة كل 30 دقيقة فقط حتى لا يفيض.
 * @param {{prevState?: object, raisedAt?: number, now: number}} input
 */
function planDeliveryFailure(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const prev = input && isRecord(input.prevState) ? input.prevState : {};
  const raisedAt = input && typeof input.raisedAt === "number" ? input.raisedAt : 0;
  const raise = now - raisedAt >= DELIVERY_RAISE_EVERY_MS;
  return {
    state: JSON.parse(JSON.stringify(prev)),
    raise,
    raisedAt: raise ? now : raisedAt,
  };
}

/** يحذف الأسرار الشائعة من نص خطأ، ثم يقصّه إلى `max` حرفًا. */
function redactErrorMessage(text, max) {
  let out = typeof text === "string" ? text : "";
  out = out
    .replace(/https?:\/\/[^\s)'"]+/gi, (url) => url.split("?")[0].split("#")[0])
    .replace(/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, "$1 [محجوب]")
    .replace(
      /\b(api[_-]?key|key|token|secret|password|authorization|sig|signature)=([^&\s]+)/gi,
      "$1=[محجوب]",
    )
    .replace(/\b[A-Za-z0-9_-]{28,}\b/g, "[محجوب]")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(out);
  return chars.length > max ? chars.slice(0, max).join("") : out;
}

/** رسالة معالج الأخطاء: المسار والعقدة وأول 200 حرف منقّحة. لا مدخلات أبدًا. */
function formatErrorAlert(input) {
  const workflow = redactErrorMessage(input && input.workflow, 80) || "غير معروف";
  const node = redactErrorMessage(input && input.node, 80) || "غير معروفة";
  const message = redactErrorMessage(input && input.message, 200) || "بلا رسالة";
  return [
    "تنبيه: فشل مسار في n8n.",
    "المسار: " + workflow,
    "العقدة: " + node,
    "الرسالة: " + message,
  ].join("\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    canaryEvaluate,
    formatAlert,
    formatErrorAlert,
    redactErrorMessage,
    toTelegramHtml,
    deliveryOutcome,
    planDeliveryFailure,
    REMINDER_MS,
    CONFIRMATIONS,
    DELIVERY_RAISE_EVERY_MS,
  };
}
