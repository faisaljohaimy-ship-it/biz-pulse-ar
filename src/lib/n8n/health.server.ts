/**
 * كتلتا صحة قناة n8n كما تعلنهما نقطتا الصحة (أمر المالك ٢٠٢٦/١٠/٣٠).
 *
 * ## ما هما
 *
 * - `/api/public/health` ⇒ المفتاح `n8n`: ثلاثة حقول لا غير (`configured` · `mode` · `breaker`).
 * - `/api/chat/health` ⇒ المفتاح `web_research`: حال ذراع بحث سَدِيد بتفصيلٍ أوفى (ثمانية حقول).
 *
 * ## قاعدتان لا تُكسران
 *
 * ١. **قراءةٌ محلية متزامنة**: المصدر الوحيد `n8nStatus` (يقرأ البيئة وحالة القاطع في هذا المعزول).
 *    لا شبكة ولا `fetch` ولا انتظار؛ نقطة الصحة لا تجرّب n8n ولا تُحسَب نداءً عليه، فلا تستهلك
 *    ميزانية ولا تحرّك القاطع.
 * ٢. **أسماء وحالات فقط، لا قيم**: لا سرّ ولا عنوان n8n ولا مسار ويبهوك ولا اسم متغيّر بيئة. كل
 *    حقلٍ يُبنى بالاسم من قائمة بيضاء (لا نسخ لكائن اللقطة)، فحقلٌ يُضاف لاحقًا إلى اللقطة لا يتسرّب.
 *
 * ## ما يعنيه كل حقل (والعامّ منه معلَّم)
 *
 * | الحقل | النوع | المعنى |
 * | `configured` (عامّ) | boolean | أي سطحٍ مهيّأ: أصلٌ https صالح وسرٌّ صالح له |
 * | `mode` (عامّ) | off/members/all | وضع بحث سَدِيد (الراية)، والافتراضي `off` |
 * | `breaker` (عامّ) | closed/open/half-open | الأسوأ عبر السطحين |
 * | `kill_switch` | boolean | مفتاح الإيقاف: إيقاف n8n الكامل أو مفتاح الذكاء القائم، أيّهما رُفع |
 * | `configured` (تفصيلي) | {sadeed, fnn} | لكل سطح. سرٌّ مكرَّر عبر السطحين = كلاهما false |
 * | `armed` | boolean | سَدِيد مهيّأ، والمفتاح غير مرفوع، والوضع ليس `off` (سيُجرَّب الذراع) |
 * | `breaker` (تفصيلي) | {sadeed, fnn} | قاطع كل سطح على حدة |
 * | `last_ok_at` · `p95_ms` · `samples` | ISO أو null · رقم أو null · عدد | ما رآه **هذا المعزول** من نداءات سَدِيد الناجحة |
 *
 * `last_ok_at` و`p95_ms` من نداءاتٍ فعلية أجراها هذا المعزول وحده، فمعزولٌ بارد يعيد `null` و`0`
 * ويُعرضان «لم يُقَس». صفرٌ ليس بديلًا عن غياب (المادة ٢٧). ولم يُقَس شيء من ذلك على n8n حقيقي.
 *
 * ## الفشل
 *
 * أي استثناءٍ أثناء القراءة ⇒ `null` (غير مقروء)، لا `off` ولا `closed` مختلَقتان: الصادق أن يقال
 * «لا أعرف». ولا يرمي هذا الملف أبدًا، فلا تُسقط نقطة الصحة بسبب قناةٍ اختيارية.
 *
 * ## ما لا تفعله الكتلتان
 *
 * لا تدخلان في `subsystems` ولا في الحالة الكلّية ولا في رمز HTTP: n8n اختياري، وغير مهيّأ أو
 * قاطعٌ مفتوح عليه لا يُسقط التطبيق ولا يُنذر المراقب (`watchdog-canary` يقرأ `status` و
 * `subsystems.*.status` و`ok` و`gate` و`key_present` ولا يقرأ هاتين الكتلتين).
 *
 * هذا الملف قارئ حالةٍ فقط: يستورد من العميل `n8nStatus` وحده (يحرسه `health.server.test.ts`)،
 * فلا يدخل في قائمة مستورِدي النداء `ALLOWED_IMPORTERS` في حارس العقد.
 */
import type { BreakerState } from "./breaker";
import { n8nStatus } from "./client.server";
import type { WebResearchMode } from "./config.server";
import type { N8nSurface } from "./protocol";
import type { N8nStatusSnapshot } from "./status.server";

/** كتلة `/api/public/health` (`n8n`): كل ما يحقّ لزائرٍ مجهول أن يراه. */
export interface PublicN8nHealth {
  /** أي سطحٍ مهيّأ (سَدِيد أو FNN). */
  readonly configured: boolean;
  readonly mode: WebResearchMode;
  /** الأسوأ عبر السطحين: open ثم half-open ثم closed. */
  readonly breaker: BreakerState;
}

/** كتلة `/api/chat/health` (`web_research`): حال ذراع بحث سَدِيد. */
export interface ChatWebResearchHealth {
  readonly mode: WebResearchMode;
  readonly kill_switch: boolean;
  readonly configured: { readonly sadeed: boolean; readonly fnn: boolean };
  readonly armed: boolean;
  readonly breaker: { readonly sadeed: BreakerState; readonly fnn: BreakerState };
  readonly last_ok_at: string | null;
  readonly p95_ms: number | null;
  readonly samples: number;
}

/** قارئ الحالة (الافتراضي `n8nStatus`)؛ يُحقَن في الاختبار فقط. */
type N8nStatusReader = (surface: N8nSurface) => N8nStatusSnapshot;

const BREAKER_RANK: Readonly<Record<BreakerState, number>> = {
  closed: 0,
  "half-open": 1,
  open: 2,
};
const MODES: readonly WebResearchMode[] = ["off", "members", "all"];

function breakerOf(value: unknown): BreakerState {
  if (value === "closed" || value === "open" || value === "half-open") return value;
  throw new Error("breaker state out of range");
}

function modeOf(value: unknown): WebResearchMode {
  if ((MODES as readonly unknown[]).includes(value)) return value as WebResearchMode;
  throw new Error("mode out of range");
}

const worstBreaker = (a: BreakerState, b: BreakerState): BreakerState =>
  BREAKER_RANK[a] >= BREAKER_RANK[b] ? a : b;

/** إسقاط الكتلة العامّة من لقطتين. نقيّ، ويرمي على لقطةٍ خارج المدى (المستدعي يحوّله إلى `null`). */
export function projectPublicN8nHealth(
  sadeed: N8nStatusSnapshot,
  fnn: N8nStatusSnapshot,
): PublicN8nHealth {
  return {
    configured: sadeed.configured === true || fnn.configured === true,
    mode: modeOf(sadeed.mode),
    breaker: worstBreaker(breakerOf(sadeed.breaker), breakerOf(fnn.breaker)),
  };
}

/** إسقاط كتلة سَدِيد التفصيلية من لقطتين. نقيّ، ويرمي على لقطةٍ خارج المدى. */
export function projectChatWebResearchHealth(
  sadeed: N8nStatusSnapshot,
  fnn: N8nStatusSnapshot,
): ChatWebResearchHealth {
  const mode = modeOf(sadeed.mode);
  const killSwitch = sadeed.disabled === true || fnn.disabled === true;
  const sadeedConfigured = sadeed.configured === true;
  const p95 = sadeed.p95_ms;
  const samples = sadeed.samples;
  return {
    mode,
    kill_switch: killSwitch,
    configured: { sadeed: sadeedConfigured, fnn: fnn.configured === true },
    armed: sadeedConfigured && !killSwitch && mode !== "off",
    breaker: { sadeed: breakerOf(sadeed.breaker), fnn: breakerOf(fnn.breaker) },
    last_ok_at: typeof sadeed.last_ok_at === "string" ? sadeed.last_ok_at : null,
    p95_ms: typeof p95 === "number" && Number.isFinite(p95) && p95 >= 0 ? p95 : null,
    samples: Number.isInteger(samples) && samples > 0 ? samples : 0,
  };
}

/** كتلة `n8n` لـ`/api/public/health`، أو `null` إن تعذّرت القراءة. لا شبكة ولا رمي. */
export function readPublicN8nHealth(read: N8nStatusReader = n8nStatus): PublicN8nHealth | null {
  try {
    return projectPublicN8nHealth(read("sadeed"), read("fnn"));
  } catch {
    return null;
  }
}

/** كتلة `web_research` لـ`/api/chat/health`، أو `null` إن تعذّرت القراءة. لا شبكة ولا رمي. */
export function readChatWebResearchHealth(
  read: N8nStatusReader = n8nStatus,
): ChatWebResearchHealth | null {
  try {
    return projectChatWebResearchHealth(read("sadeed"), read("fnn"));
  } catch {
    return null;
  }
}
