/**
 * مخططات zod الصارمة لجسمَي الطلب والردّ — العقد كما هو، لا أكثر ولا أقلّ.
 *
 * ## الصرامة
 *
 * - **مفتاحٌ زائد ⇒ رفض** (`strictObject`): غلافٌ فيه حقلٌ لم يُتّفق عليه ليس غلافنا.
 * - **سقفٌ زائد ⇒ رفض الغلاف كلّه** لا قصٌّ صامت: العنوان ≤ 300 والعنوان النصّي ≤ 120 والمقتطف
 *   ≤ 300 والنتائج ≤ 6 — هذه حدودٌ يلتزم بها n8n، ومخالفتها خللٌ أو عبثٌ يظهر في اختبار المالك الذاتي
 *   ويُحتسب على القاطع. (التطبيق يعقّم النصّ ويقصّه بعد ذلك على كل حال — `normalize.server.ts`.)
 * - **اتساق `ok` و`code`**: `code = "ok"` ⇒ `ok = true`؛ ورموز الخطأ ⇒ `ok = false`. أمّا
 *   `no_results` و`already_done` فيُقبل فيهما أيٌّ من القيمتين: كلاهما «لم يفشل شيء» ولا يُبنى على
 *   الفرق قرار. التناقض الصريح (`ok = true` مع `internal`) غلافٌ مشوَّه.
 *
 * ## الطلب يُتحقَّق منه قبل أن يغادر
 *
 * العميل يمرّر جسمه الخاص على المخطط نفسه: خللٌ برمجيٌّ في مستدعٍ (موجزٌ فارغ، وضعٌ لا يخصّ السطح)
 * يُرفض محليًّا بلا شبكة ولا توقيع.
 *
 * ملف نقيٌّ (لا بيئة ولا شبكة) كي يستورده أي اختبار.
 */
import { z } from "zod";
import { FRESHNESS_VALUES, RUNNER_WORKFLOWS } from "./protocol";

// ── الطلب ───────────────────────────────────────────────────────────────────

export const BRIEF_MAX_TERMS = 6;
export const BRIEF_MAX_CODES = 4;
export const BRIEF_TERM_CHARS = 40;
export const BRIEF_CODE_CHARS = 24;

export const briefSchema = z.strictObject({
  terms: z.array(z.string().min(1).max(BRIEF_TERM_CHARS)).max(BRIEF_MAX_TERMS),
  codes: z.array(z.string().min(1).max(BRIEF_CODE_CHARS)).max(BRIEF_MAX_CODES),
  lang: z.enum(["ar", "en"]),
});
export type Brief = z.infer<typeof briefSchema>;

const RESEARCH_MODE_VALUES = ["general", "regulatory", "docs", "code", "security"] as const;

export const researchRequestSchema = z.strictObject({
  v: z.literal(1),
  requestId: z.uuid(),
  mode: z.enum(RESEARCH_MODE_VALUES),
  brief: briefSchema.refine((b) => b.terms.length + b.codes.length > 0, {
    message: "empty_brief",
  }),
  maxResults: z.number().int().min(1).max(5),
  freshness: z.enum(FRESHNESS_VALUES),
});
export type ResearchRequest = z.infer<typeof researchRequestSchema>;

/** معاملات المشغّل: أعدادٌ صحيحة محدودة أو تعدادات قصيرة، بمفاتيح صغيرة — لا نصٌّ حرّ. */
const paramValue = z.union([
  z.number().int().min(-1_000_000).max(1_000_000),
  z.string().regex(/^[a-z0-9_-]{1,40}$/),
]);
const RUNNER_MAX_PARAMS = 8;

export const runnerRequestSchema = z.strictObject({
  v: z.literal(1),
  requestId: z.uuid(),
  workflow: z.enum(RUNNER_WORKFLOWS),
  params: z
    .record(z.string().regex(/^[a-z][a-z0-9_]{0,31}$/), paramValue)
    .refine((p) => Object.keys(p).length <= RUNNER_MAX_PARAMS, { message: "too_many_params" }),
});
export type RunnerRequest = z.infer<typeof runnerRequestSchema>;

// ── الردّ ───────────────────────────────────────────────────────────────────

const RESEARCH_CODES = [
  "ok",
  "no_results",
  "all_providers_failed",
  "auth_failed",
  "bad_request",
  "budget_exhausted",
  "internal",
] as const;

const RUNNER_CODES = [
  "ok",
  "unknown_workflow",
  "bad_params",
  "auth_failed",
  "already_done",
  "budget_exhausted",
  "internal",
] as const;

export const RESULT_TITLE_CHARS = 120;
const RESULT_URL_CHARS = 300;
export const RESULT_SNIPPET_CHARS = 300;
const RESULT_MAX = 6;
const PROVIDER_MAX = 8;
export const RUNNER_SUMMARY_CHARS = 500;
export const RUNNER_ITEM_CHARS = 200;
const RUNNER_ITEMS_MAX = 10;

const providerStatusSchema = z.strictObject({
  id: z.string().min(1).max(40),
  status: z.enum(["ok", "error", "timeout", "skipped"]),
  ms: z.number().int().min(0).max(600_000),
  n: z.number().int().min(0).max(100),
});

const rawResultSchema = z.strictObject({
  title: z.string().max(RESULT_TITLE_CHARS),
  url: z.string().max(RESULT_URL_CHARS),
  snippet: z.string().max(RESULT_SNIPPET_CHARS),
  // ISO أو null بحسب العقد؛ يُطبَّع لاحقًا ويُسقط إلى null إن لم يُفهم (حقلٌ لا يستحق إسقاط الغلاف).
  publishedAt: z.string().max(40).nullable(),
  provider: z.string().min(1).max(40),
});

/** الرمز «ok» يحمل `ok = true`، والأخطاء `ok = false`؛ وما بينهما يُقبل بأيٍّ منهما. */
function okMatchesCode(ok: boolean, code: string, soft: readonly string[]): boolean {
  if (soft.includes(code)) return true;
  return code === "ok" ? ok : !ok;
}

export const researchEnvelopeSchema = z
  .strictObject({
    v: z.literal(1),
    ok: z.boolean(),
    code: z.enum(RESEARCH_CODES),
    requestId: z.string().min(1).max(64),
    degraded: z.boolean(),
    fetchedAt: z.iso.datetime({ offset: true }),
    providers: z.array(providerStatusSchema).max(PROVIDER_MAX),
    results: z.array(rawResultSchema).max(RESULT_MAX),
  })
  .refine((e) => okMatchesCode(e.ok, e.code, ["no_results"]), { message: "ok_code_mismatch" });
export type ResearchEnvelope = z.infer<typeof researchEnvelopeSchema>;
export type RawResearchResult = z.infer<typeof rawResultSchema>;

export const runnerEnvelopeSchema = z
  .strictObject({
    v: z.literal(1),
    ok: z.boolean(),
    code: z.enum(RUNNER_CODES),
    requestId: z.string().min(1).max(64),
    result: z
      .strictObject({
        summary: z.string().max(RUNNER_SUMMARY_CHARS),
        items: z.array(z.string().max(RUNNER_ITEM_CHARS)).max(RUNNER_ITEMS_MAX),
      })
      .nullable(),
  })
  .refine((e) => okMatchesCode(e.ok, e.code, ["already_done"]), { message: "ok_code_mismatch" });
export type RunnerEnvelope = z.infer<typeof runnerEnvelopeSchema>;
