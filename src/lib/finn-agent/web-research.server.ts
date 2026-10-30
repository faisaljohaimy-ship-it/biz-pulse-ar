/**
 * أداة `web_research` لفِن: بحثٌ على الويب عبر قناة n8n، **قراءةٌ فقط، للمالك وحده، تفشل مغلقةً**.
 *
 * أمر المالك ٢٠٢٦/١٠/٣٠ (وكيل الأتمتة والبرمجة عبر n8n). هذه الوحدة هي المستورِد الوحيد لعميل n8n داخل
 * وكيل فِن، ويستوردها `tools.server.ts` وحده. لم تُشغَّل يومًا على n8n حقيقي: كل ما يثبته اختبارها نقلٌ
 * مزيَّفٌ حتميّ (`stub-transport.test-support.ts`) وحارس عقد، لا خدمةٌ فعلية ولا زمنُ استجابةٍ مقيس.
 *
 * ## لماذا وحدةٌ مستقلّة لا داخل `tools.server.ts`
 *
 * حارس عقد الأدوات (`finn-governance.contract.test.ts` ⑨) يمنع في وحدات الأدوات الثلاث الأصلية أي ذكرٍ
 * لـ`client.server` (يقصد عميل القاعدة)، وحارس القناة (`n8n-client.contract.test.ts` ⑥) يوجب أن يُعلَن كل
 * مستورِدٍ لعميل n8n بالاسم وأن يفحص مفتاح الإيقاف قبل أول نداءٍ له. فالاستيراد الوحيد معزولٌ هنا، ويُفحص
 * بحارسٍ يخصّه (⑩).
 *
 * ## الحدود التي تحرسها الوحدة نفسها
 *
 * 1. **المدخل مخطَّط ومغلق** (`webResearchInputSchema`): نصّ استعلامٍ بسقف طول، وتعدادٌ مغلق للوضع هو
 *    أوضاع سطح FNN في العقد. لا رابط ولا مضيف ولا مسار ولا سرّ ولا حقلٌ زائد (`strictObject`). ويُعاد
 *    التحقّق منه داخل `runWebResearch` فلا يُوثَق بنداءٍ مباشر تجاوز طبقة الـSDK.
 * 2. **لا يغادر النظام إلا الموجز**: `buildBrief` يحجب الروابط والبريد والأرقام الطويلة والأسرار ويقتصر على
 *    ست كلماتٍ وأربعة رموز ولغة. لا معرّف مستخدم ولا مؤسسة ولا سجلّ محادثة. موجزٌ فارغ ⇒ لا نداء.
 * 3. **السطح `fnn` وحده**: لا سطح سَدِيد ولا مشغّل (`runViaN8n` ممنوع هنا: كتالوج المشغّل يحتاج واجهة
 *    تأكيدٍ وسجلًّا، وهو قرارٌ منفصل للمالك).
 * 4. **تفشل مغلقةً بلا رمي**: كل سببٍ من أسباب العميل الأحد عشر يصير واحدًا من ثلاثة رموز عامّة
 *    (`not_configured` · `disabled` · `unavailable`) وجملةٍ عربيةٍ ثابتة. لا `auth_failed` ولا
 *    `bad_signature` ولا أي سببٍ يوحي بمصادقة يصل النموذج. مهلة الذراع 6 ث يفرضها العميل نفسه.
 * 5. **المخرجات بياناتٌ غير موثوقة** (`untrusted: true`): النصوص جاءت معقَّمةً من العميل، وتمرّ هنا بحجب
 *    الأسرار والبريد مرةً ثانية وتُقصّ، وعدد النتائج وحجم الناتج مسقوفان. والموجِّه يوجب معاملتها بيانات.
 * 6. **مفتاح الإيقاف أولًا**: `killSwitch()` يُفحص قبل بناء الموجز وقبل أي نداء.
 */
import { z } from "zod";
import { aiKillSwitchOn } from "@/lib/governance/ai-quota.server";
import { buildBrief } from "@/lib/n8n/brief.server";
import {
  n8nStatus,
  researchViaN8n,
  type ResearchInput,
  type ResearchOutcome,
} from "@/lib/n8n/client.server";
import { RESEARCH_MODES, type N8nReason } from "@/lib/n8n/protocol";
import type { N8nStatusSnapshot } from "@/lib/n8n/status.server";
import { maskSecrets } from "./secret-shapes";

/** أقصى طول لاستعلام النموذج (حرف). الموجز يقصّه إلى ست كلمات على كل حال. */
export const WEB_RESEARCH_QUERY_MAX_CHARS = 200;
/** عدد النتائج المطلوب دائمًا: أقصى ما يقبله عقد الطلب. النموذج لا يختاره. */
export const WEB_RESEARCH_MAX_RESULTS = 5;
/** سقف حجم الناتج المسلَّم للنموذج (حرف): مثل سقف بقية الأدوات. */
export const WEB_RESEARCH_MAX_RESULT_CHARS = 6_000;

const TITLE_CHARS = 120;
const SNIPPET_CHARS = 300;
const URL_CHARS = 300;

/** أي `://` (رابطٌ بأي مخطط)، أو `www.`، أو مخططات الحقن الشائعة. الاستعلام كلماتٌ لا عنوان. */
const URL_SHAPE = /:\/\/|www\.|\b(?:data|javascript|vbscript|file):\S/iu;
/** مسارٌ: شرطة عكسية، أو قرصٌ (`C:\`)، أو رمزٌ يبدأ بـ`/` أو `./` أو `../` أو `~/` (ولو بعد قوسٍ أو اقتباس). */
const PATH_SHAPE = /\\|\b[a-z]:[\\/]|(?:^|[\s"'`([{=,;])(?:\.{1,2}\/|~\/|\/)/iu;

/**
 * مدخل الأداة: استعلامٌ ووضعٌ اختياري من القائمة المغلقة. **لا شيء غيرهما**: لا رابط ولا مضيف ولا مسار
 * ولا عدد نتائج ولا حداثة. الوضع الافتراضي `general`.
 */
export const webResearchInputSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .min(2)
    .max(WEB_RESEARCH_QUERY_MAX_CHARS)
    .refine((q) => !URL_SHAPE.test(q), { message: "no_url" })
    .refine((q) => !PATH_SHAPE.test(q), { message: "no_path" }),
  mode: z.enum(RESEARCH_MODES.fnn).default("general"),
});
export type WebResearchInput = z.infer<typeof webResearchInputSchema>;

/** الجمل التي يقولها النموذج للمالك كما هي: عربيةٌ هادئة، بلا مصطلح مصادقة ولا سبب تقني. */
export const WEB_RESEARCH_MESSAGES_AR = {
  not_configured: "البحث على الويب غير مفعَّل على الخادم.",
  disabled: "البحث على الويب موقوف الآن.",
  unavailable: "تعذّر البحث على الويب الآن.",
  empty_query: "لا توجد في الاستعلام كلمات تصلح للبحث. أعد صياغته بكلمات محددة.",
  invalid_input: "الاستعلام غير صالح. اكتب كلمات بحث فقط، بلا روابط ولا مسارات.",
} as const;

export type WebResearchFailureReason = keyof typeof WEB_RESEARCH_MESSAGES_AR;

export interface WebResearchItem {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
  readonly domain: string;
  readonly tier: string;
}

export type WebResearchResult =
  | {
      readonly ok: true;
      readonly source: "web";
      /** نتائج الويب كتبها غرباء: بياناتٌ لا أوامر، وأرقامها ليست حقيقة المنتج (المادة ٢٧). */
      readonly untrusted: true;
      readonly mode: WebResearchInput["mode"];
      readonly code: "ok" | "no_results";
      readonly degraded: boolean;
      readonly fromCache: boolean;
      readonly fetchedAt: string;
      readonly total: number;
      readonly items: readonly WebResearchItem[];
    }
  | {
      readonly ok: false;
      readonly configured: false;
      readonly reason: "not_configured";
      readonly message_ar: string;
    }
  | {
      readonly ok: false;
      readonly reason: Exclude<WebResearchFailureReason, "not_configured">;
      readonly message_ar: string;
    };

/** حالة الجسر كما تُعرض في `platform_status`: أسماء وحالات فقط، لا عنوان ولا سرّ ولا قيمة بيئة. */
export interface N8nBridgeView {
  readonly surface: "fnn";
  readonly configured: boolean;
  /** مفتاح الإيقاف (الذكاء أو الويب) مرفوع. */
  readonly disabled: boolean;
  readonly breaker: N8nStatusSnapshot["breaker"];
  /** من هذا المعزول وحده؛ `null` ⇒ لم يُقَس. */
  readonly last_ok_at: string | null;
  readonly p95_ms: number | null;
  readonly samples: number;
}

/** المنافذ القابلة للحقن: الاختبار وحده يستبدلها، والإنتاج يستعمل الافتراضي أدناه. */
export interface WebResearchPorts {
  readonly killSwitch: () => boolean;
  readonly research: (input: ResearchInput) => Promise<ResearchOutcome>;
  readonly status: () => N8nStatusSnapshot;
}

export const DEFAULT_WEB_RESEARCH_PORTS: WebResearchPorts = {
  killSwitch: () => aiKillSwitchOn(),
  research: (input) => researchViaN8n(input),
  status: () => n8nStatus("fnn"),
};

function fail(reason: WebResearchFailureReason): WebResearchResult {
  if (reason === "not_configured") {
    return {
      ok: false,
      configured: false,
      reason,
      message_ar: WEB_RESEARCH_MESSAGES_AR.not_configured,
    };
  }
  return { ok: false, reason, message_ar: WEB_RESEARCH_MESSAGES_AR[reason] };
}

/**
 * سبب العميل ← رمز عامّ. شاملٌ بالنوع: سببٌ جديد في `N8N_REASONS` لا يُترجَم هنا يكسر `tsc`
 * (فلا يتسرّب اسمه إلى النموذج بصمت).
 */
function failureFor(reason: N8nReason): "not_configured" | "disabled" | "unavailable" {
  switch (reason) {
    case "not_configured":
      return "not_configured";
    case "disabled":
      return "disabled";
    case "breaker_open":
    case "timeout":
    case "network":
    case "bad_signature":
    case "bad_envelope":
    case "n8n_error":
    case "auth_failed":
    case "budget_exhausted":
    case "oversized":
      return "unavailable";
    default: {
      const unreachable: never = reason;
      return unreachable;
    }
  }
}

const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** معرّف UUID (مستخدم أو مؤسسة)، وسلسلة سداسية طويلة (SHA). `buildBrief` يبقي شظاياها كلماتٍ فتُنزع قبله. */
const UUID_SHAPE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const LONG_HEX = /\b[0-9a-f]{16,}\b/gi;

/**
 * دفاعٌ ثانٍ للخصوصية قبل الموجز: لا معرّف مستخدم ولا مؤسسة ولا هاش يغادر. (قِيس أن `buildBrief` يمرّر
 * شظايا UUID سداسيةً كلماتٍ مفردة، فتُنزع هنا بدل الاعتماد عليه وحده.)
 */
export function withoutIdentifiers(query: string): string {
  return query.replace(UUID_SHAPE, " ").replace(LONG_HEX, " ");
}

/** نصٌّ بعيد ⇒ بلا أسرار ولا بريد، مقصوص. (المعقِّم الأول في العميل؛ هذا الدفاع الثاني.) */
function safe(value: string, max: number): string {
  const masked = maskSecrets(value).replace(EMAIL_SHAPE, "[بريد محجوب]");
  return masked.length > max ? `${masked.slice(0, max - 1)}…` : masked;
}

/** يقصّ المصفوفة نصفًا نصفًا حتى يدخل الناتج السقف (نظير `fit` في بقية الأدوات). */
function bound(result: Extract<WebResearchResult, { ok: true }>): WebResearchResult {
  let current = result;
  while (
    current.items.length > 1 &&
    JSON.stringify(current).length > WEB_RESEARCH_MAX_RESULT_CHARS
  ) {
    const items = current.items.slice(0, Math.ceil(current.items.length / 2));
    current = { ...current, items, total: items.length };
  }
  return current;
}

function shape(
  outcome: Extract<ResearchOutcome, { served: true }>,
  mode: WebResearchInput["mode"],
): WebResearchResult {
  const items = outcome.results.slice(0, WEB_RESEARCH_MAX_RESULTS).map((r): WebResearchItem => ({
    title: safe(r.title, TITLE_CHARS),
    url: safe(r.url, URL_CHARS),
    snippet: safe(r.snippet, SNIPPET_CHARS),
    publishedAt: r.publishedAt,
    domain: safe(r.domain, 80),
    tier: r.tier,
  }));
  return bound({
    ok: true,
    source: "web",
    untrusted: true,
    mode,
    code: items.length > 0 ? "ok" : "no_results",
    degraded: outcome.degraded,
    fromCache: outcome.fromCache,
    fetchedAt: outcome.fetchedAt,
    total: items.length,
    items,
  });
}

/**
 * ينفّذ بحثًا واحدًا. **لا يرمي أبدًا.** الترتيب: تحقّق المدخل ← مفتاح الإيقاف ← الموجز ← النداء. وأي فشلٍ
 * في أي خطوةٍ نتيجةٌ منظَّمة. لا يقبل إشارة إلغاء: مهلة العميل (6 ث لسطح FNN) هي السقف، وردٌّ
 * يصل بعد انصراف المالك لا يُبثّ ولا يُحفظ.
 */
export async function runWebResearch(
  rawInput: unknown,
  ports: WebResearchPorts = DEFAULT_WEB_RESEARCH_PORTS,
): Promise<WebResearchResult> {
  try {
    const parsed = webResearchInputSchema.safeParse(rawInput);
    if (!parsed.success) return fail("invalid_input");
    const input = parsed.data;

    if (ports.killSwitch()) return fail("disabled");

    // ما يغادر النظام إلى n8n هو هذا الموجز وحده: كلماتٌ ورموز ولغة، لا الجملة ولا معرّف.
    const brief = buildBrief(withoutIdentifiers(input.query), { surface: "fnn" });
    if (brief === null) return fail("empty_query");

    const outcome = await ports.research({
      surface: "fnn",
      mode: input.mode,
      brief,
      maxResults: WEB_RESEARCH_MAX_RESULTS,
    });
    return outcome.served ? shape(outcome, input.mode) : fail(failureFor(outcome.reason));
  } catch {
    return fail("unavailable");
  }
}

/** حالة جسر FNN كما تراها هذه العملية الآن، أو `null` إن تعذّرت القراءة (مجهولٌ لا مختلَق). */
export function fnnBridgeStatus(
  ports: Pick<WebResearchPorts, "status"> = DEFAULT_WEB_RESEARCH_PORTS,
): N8nBridgeView | null {
  try {
    const s = ports.status();
    return {
      surface: "fnn",
      configured: s.configured,
      disabled: s.disabled,
      breaker: s.breaker,
      last_ok_at: s.last_ok_at,
      p95_ms: s.p95_ms,
      samples: s.samples,
    };
  } catch {
    return null;
  }
}
