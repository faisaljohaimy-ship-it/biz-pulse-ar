/** Shared classification for safe chat feedback and the existing configured backup route. */
export type ProviderFailureKind =
  | "denied"
  | "credit"
  | "invalid_request"
  | "rate_limit"
  | "model_unavailable"
  | "transient"
  | "timeout"
  | "cancelled"
  | "unknown";
export type ProviderFailure = {
  kind: ProviderFailureKind;
  status: number | null;
  backupEligible: boolean;
};
const terminalStatuses = new Set([400, 401, 402, 403]);
const transientStatuses = new Set([500, 502, 503, 504]);

function field(value: object, key: string): unknown {
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}
function httpStatus(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 400 && parsed <= 599 ? parsed : null;
}

/** SDK APICallError keeps statusCode outside message; RetryError keeps lastError.
 * Follow only bounded causal links, never response bodies, request data or headers. */
export function classifyProviderFailure(error: unknown): ProviderFailure {
  const queue: unknown[] = [error];
  const seen = new Set<object>();
  const statuses: number[] = [];
  const messages: string[] = [];
  let cancelled = false;
  let timedOut = false;
  for (let index = 0; index < queue.length && index < 8; index += 1) {
    const item = queue[index];
    if (typeof item === "string") {
      messages.push(item.slice(0, 8192));
      continue;
    }
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    const name = field(item, "name");
    if (name === "AbortError") cancelled = true;
    if (name === "TimeoutError") timedOut = true;
    const message = field(item, "message");
    if (typeof message === "string") messages.push(message.slice(0, 8192));
    const status = httpStatus(field(item, "statusCode")) ?? httpStatus(field(item, "status"));
    if (status !== null) statuses.push(status);
    const lastError = field(item, "lastError");
    const cause = field(item, "cause");
    if (lastError) queue.push(lastError);
    if (cause) queue.push(cause);
  }
  const text = messages.join("\n").toLowerCase();
  // A structured denial anywhere in the causal chain stays terminal. Otherwise
  // the outer structured status is authoritative over incidental message digits.
  const structured = statuses.find((status) => terminalStatuses.has(status)) ?? statuses[0];
  const textStatuses = [...text.matchAll(/\b(4\d\d|5\d\d)\b/g)].map((match) => Number(match[1]));
  const status =
    structured ??
    textStatuses.find((value) => terminalStatuses.has(value)) ??
    textStatuses[0] ??
    null;
  const result = (kind: ProviderFailureKind, backupEligible = false): ProviderFailure => ({
    kind,
    status,
    backupEligible,
  });
  // Stop must never spend on a backup, including wrapped overload failures.
  if (cancelled || /\baborterror\b|\b(?:request|operation) (?:was )?aborted\b/.test(text))
    return result("cancelled");
  if (status === 400) return result("invalid_request");
  if (status === 401 || status === 403) return result("denied");
  if (status === 402) return result("credit");
  if (status === 429) return result("rate_limit", true);
  if (status !== null && transientStatuses.has(status)) return result("transient", true);
  const missingModel = /model[^\n]{0,60}?not (found|supported)/.test(text);
  if (status === 404) return result("model_unavailable", missingModel);
  if (timedOut || /\btimeout\b|\btimed out\b/.test(text)) return result("timeout");
  // An explicit unrelated status is not permission to route a second paid call.
  if (status !== null) return result("unknown");
  if (text.includes("authenticat")) return result("denied");
  if (text.includes("quota") || text.includes("resource_exhausted")) return result("credit", true);
  if (text.includes("credit")) return result("credit");
  if (text.includes("rate limit")) return result("rate_limit", true);
  if (/high demand|overloaded|unavailable|temporarily busy/.test(text))
    return result("transient", true);
  if (missingModel || text.includes("not found") || text.includes("no such model"))
    return result("model_unavailable", missingModel);
  return result("unknown");
}

/** Fixed Arabic messages only; no upstream body, model name or message reaches users. */
export function providerErrorMessage(
  error: unknown,
  requestId: string,
  { toolExecutionStarted = false }: { toolExecutionStarted?: boolean } = {},
): string {
  if (toolExecutionStarted)
    return `تعذّر تأكيد نتيجة الطلب بعد بدء تنفيذ أداة. راجع سجل التنفيذ قبل تكرار الطلب. المعرّف: ${requestId}`;
  const { kind, status } = classifyProviderFailure(error);
  switch (kind) {
    case "denied":
      return "محرّك التحليل غير متاح لهذه الجلسة. يمكنني فتح الشاشات وشرح مؤشّراتها ريثما يعود.";
    case "credit":
      return "بلغت الجلسة حدّ التحليل المتاح الآن — أعد المحاولة بعد قليل.";
    case "rate_limit":
      return "الطلبات كثيرة الآن — أعد المحاولة بعد لحظات.";
    case "model_unavailable":
      return "محرّك التحليل غير متاح لهذه الجلسة — أعد المحاولة بعد قليل.";
    case "invalid_request":
      return "تعذّر تنفيذ الطلب بصيغته الحالية — اختصر السؤال أو أعد المحاولة.";
    case "transient":
      return `محرّك التحليل مشغول مؤقتًا — أعد المحاولة بعد لحظات. المعرّف: ${requestId}`;
    case "timeout":
      return "استغرق سَدِيد وقتًا طويلًا — أعد المحاولة بعد قليل.";
    case "cancelled":
      return "توقّف الطلب قبل اكتمال الرد — أعد المحاولة عندما تكون جاهزًا.";
    default:
      return `تعذّر إكمال الرد${status ? ` (رمز ${status})` : ""} — أعد المحاولة. المعرّف: ${requestId}`;
  }
}
