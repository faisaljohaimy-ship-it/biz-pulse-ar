/**
 * قاطع الدارة لقناة n8n — نقيٌّ بساعةٍ قابلة للحقن، **بدلالات قاطع `hcisState` نفسها**.
 *
 * المرجع: `hcisBreakerSkip` · `hcisNoteFailure` · `hcisNoteSuccess` في
 * `src/lib/sadeed/rag/lexical-arms.server.ts` (ذراع HCIS الحيّة). أُخذت الدلالات حرفًا بحرف كي
 * يكون سلوك القناتين متوقَّعًا، ويثبّت التطابقَ اختبارٌ تفاضلي
 * (`breaker.parity.test.ts`) يشغّل التسلسلات نفسها على القاطعين ويقارن:
 *
 * 1. **الفتح:** خمسة إخفاقاتٍ متتالية **بلا فجوة تتجاوز 60 ث بين إخفاقين** (لا «خمسة خلال
 *    60 ث»). فجوةٌ أطول من النافذة تصفّر العدّ إلى واحد.
 * 2. **مفتوح 60 ث:** كل نداءٍ يُرفض بلا شبكة.
 * 3. **فحصٌ واحد:** بعد 60 ث يمرّ نداءٌ واحد (نصف مفتوح) والباقون يُرفضون حتى يُحسم.
 * 4. **فشل الفحص يعيد الفتح نافذةً كاملة** مهما بلغت الفجوة، ولا يُصفَّر العدّ بالفجوة. (هذا
 *    الإصلاح موثّق في ترويسة الذراع: كانت نافذة الفشل تساوي نافذة الفتح فيأتي الفحص بعد فجوة
 *    أطول ويُصفَّر العدّ ولا يُعاد الفتح.)
 * 5. **نجاحٌ واحد يغلق** ويصفّر كل شيء.
 *
 * ## ما يُحتسب إخفاقًا (القرار في العميل لا هنا)
 *
 * إخفاق القناة نفسها: مهلة · شبكة · توقيع ردٍّ فاسد · غلاف مشوَّه · جسم متضخّم · خطأ n8n. أمّا
 * ردٌّ موقَّع سليم يحمل رفضًا تطبيقيًّا (`auth_failed` · `budget_exhausted`) فيثبت أن القناة حيّة،
 * فلا يُحتسب إخفاقًا.
 *
 * ## نسختان منفصلتان
 *
 * لكل سطح قاطعه (سَدِيد وFNN): تعطّل بحث سَدِيد لا يُغلق FNN ولا العكس. الحالة هنا في الكائن لا
 * في الوحدة، فالاختبار ينشئ قاطعًا جديدًا بساعة مزيّفة.
 */

export const N8N_BREAKER_FAILURE_THRESHOLD = 5;
/** أطول فجوة بين إخفاقين تبقي السلسلة «متتالية». */
export const N8N_BREAKER_FAILURE_WINDOW_MS = 60_000;
export const N8N_BREAKER_OPEN_MS = 60_000;

export type BreakerState = "closed" | "open" | "half-open";

export interface BreakerSnapshot {
  readonly state: BreakerState;
  readonly consecutiveFailures: number;
  readonly openedAt: number | null;
  readonly lastFailureAt: number | null;
}

export interface BreakerOptions {
  /** ساعة بالمللي ثانية. الافتراضي `Date.now`. */
  readonly now?: () => number;
  readonly threshold?: number;
  readonly windowMs?: number;
  readonly openMs?: number;
}

export class CircuitBreaker {
  private readonly now: () => number;
  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly openMs: number;
  private consecutiveFailures = 0;
  private lastFailureAt: number | null = null;
  private openedAt: number | null = null;
  private probing = false;

  constructor(opts: BreakerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.threshold = opts.threshold ?? N8N_BREAKER_FAILURE_THRESHOLD;
    this.windowMs = opts.windowMs ?? N8N_BREAKER_FAILURE_WINDOW_MS;
    this.openMs = opts.openMs ?? N8N_BREAKER_OPEN_MS;
  }

  /**
   * هل يمرّ النداء الآن؟ مغلق ⇐ نعم. مفتوح ⇐ لا. بعد انقضاء الفتح ⇐ نعم لنداءٍ واحد فقط
   * (الفحص) ولا لمن يليه حتى يُحسم. **من حصل على `true` يجب أن يستدعي لاحقًا `recordSuccess`
   * أو `recordFailure` على كل مسارٍ يخرج منه** وإلا بقي الفحص معلّقًا (العميل يضمن ذلك).
   */
  tryAcquire(): boolean {
    if (this.openedAt === null) return true;
    if (this.now() - this.openedAt < this.openMs) return false;
    if (this.probing) return false;
    this.probing = true;
    return true;
  }

  recordFailure(): void {
    const now = this.now();
    // إخفاقٌ والقاطع مفتوح أو نصف مفتوح = فشل الفحص: يُعاد الفتح نافذةً كاملة ولا يُصفَّر العدّ بالفجوة.
    const probeFailed = this.openedAt !== null;
    if (!probeFailed && this.lastFailureAt !== null && now - this.lastFailureAt > this.windowMs) {
      this.consecutiveFailures = 0;
    }
    this.consecutiveFailures += 1;
    this.lastFailureAt = now;
    this.probing = false;
    if (probeFailed || this.consecutiveFailures >= this.threshold) this.openedAt = now;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.probing = false;
  }

  state(): BreakerState {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt < this.openMs ? "open" : "half-open";
  }

  snapshot(): BreakerSnapshot {
    return {
      state: this.state(),
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
      lastFailureAt: this.lastFailureAt,
    };
  }
}
