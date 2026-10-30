/**
 * budget: سقف الطلبات العام (60 طلبًا في الدقيقة لكل workflow) بنافذة منزلقة.
 *
 * نقية: الحالة والوقت يُمرَّران، والحالة الجديدة تُعاد (تُحفظ في static data).
 * تُستدعى بعد التحقق من التوقيع، فطلب مجهول لا يستهلك الميزانية.
 *
 * الحالة التالفة (ليست كائنًا، أو hits ليست مصفوفة أرقام) تُصفَّر ويُسمح
 * بالطلب: عطل الحالة لا يجوز أن يحجب خدمة سليمة. الطلب المرفوض لا يُسجَّل.
 * السقف الفعلي لا يتجاوز `limit` مدخلًا في الحالة، فلا تنمو بلا حدّ.
 */
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60000;

/**
 * @param {object} input
 * @param {{hits?: number[]}} [input.state]
 * @param {number} input.now
 * @param {number} [input.limit]
 * @param {number} [input.windowMs]
 * @returns {{allowed: boolean, state: {hits: number[]}, remaining: number, retryAfterMs: number}}
 */
function checkBudget(input) {
  const now =
    input && typeof input.now === "number" && isFinite(input.now) ? input.now : Date.now();
  const limit =
    input && Number.isInteger(input.limit) && input.limit > 0 ? input.limit : DEFAULT_LIMIT;
  const windowMs =
    input && Number.isInteger(input.windowMs) && input.windowMs > 0
      ? input.windowMs
      : DEFAULT_WINDOW_MS;
  const previous = input && input.state && Array.isArray(input.state.hits) ? input.state.hits : [];
  const hits = previous
    .filter((t) => typeof t === "number" && isFinite(t) && t <= now && now - t < windowMs)
    .sort((a, b) => a - b)
    .slice(-limit);
  if (hits.length >= limit) {
    const retryAfterMs = Math.max(1, hits[0] + windowMs - now);
    return { allowed: false, state: { hits }, remaining: 0, retryAfterMs };
  }
  hits.push(now);
  return { allowed: true, state: { hits }, remaining: limit - hits.length, retryAfterMs: 0 };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkBudget, DEFAULT_LIMIT, DEFAULT_WINDOW_MS };
}
