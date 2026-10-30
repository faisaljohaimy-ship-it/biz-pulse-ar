/**
 * أنواع الاسترجاع المشتركة — أنواع فقط، بلا منطق ولا استيراد.
 *
 * نواة الاسترجاع (`src/lib/retrieval/*.server.ts`) خادمٌ فقط؛ هذا الملف وحده
 * بلا لاحقة `.server` لأنه لا يحمل كودًا يُنفَّذ، فيجوز أن تستورده الواجهة
 * لوصف شكل النتيجة إن احتاجت.
 *
 * ## لماذا `provenance` على كل نتيجة
 *
 * المادة ٢٧: الرقم لا يُقال عاريًا. فكل نتيجة تحمل ذراعها (`label`) ومصدرها
 * وهل يجوز الاستشهاد بها (`citable`). الذراع المعجمية تطبع «مطابقة نصّية»
 * لا `(sim NN%)` — لأن درجة BM25 ليست تشابهًا دلاليًّا وعرضها كنسبة اختلاق.
 *
 * ## معنى `citable` هنا (قرار المالك ⑤، ٢٠٢٦/١٠/٢٩)
 *
 * `true` = مصدرٌ مراجَع يجوز الاستشهاد به: متنٌ مضمّن في المستودع
 * (`seed-corpus.data.ts`)، أو اسم صفّ HCIS مبذور، أو صفّ معرفة موثّق في
 * القاعدة. `false` = مرفوعٌ غير موثّق (`upload-unverified`) أو ذاكرة —
 * يُقرأ سياقًا موسومًا «غير موثّق» ولا يصير استشهاد `[DOC:]` أبدًا.
 * سُمّي `citable` لا `verified` عمدًا: `verified` في القاعدة حالةُ ترقية
 * بوابتها trigger (المادة ٢٥)، وصفّ HCIS مبذور أو مدخل بذرة ليس «موثّقًا»
 * بذلك المعنى وإن جاز الاستشهاد به — فالاسم الواحد كان سيخلطهما حين تُوصَل
 * استشهادات `[DOC:]` في الخطوة ٢. وليس هذا حكمًا على «متن موثّق» بمعنى
 * بوابة `rag_enabled` (المادة ٢٧): تلك تحتاج قياسًا على ≥30 سؤالًا، ولا
 * شيء هنا يفتحها.
 */

/**
 * مصدر النتيجة — من أين جاء النصّ. `upload-unverified` لكل مقطع من مستند مرفوع،
 * معجميًّا كان أو متّجهيًّا (قرار المالك ⑤ والمادة ٢٥). و`document` محجوز لمقطعٍ
 * **موثّق** يجوز الاستشهاد به `[DOC:]`: لا ذراع تنتجه اليوم، إذ لا بوابة ترقية
 * على مقاطع المستندات بعد؛ ويبقى في النوع كي يحرس `assembleRagContext` الحقلين معًا.
 */
export type HitSource = "hcis" | "seed" | "knowledge" | "document" | "upload-unverified" | "memory";

/** وسم الذراع كما يُطبع للنموذج وللمستخدم — لا نسبة مئوية للمعجمي. */
export type MatchLabel = "مطابقة نصّية" | "تشابه دلالي";

export interface HitProvenance {
  /** جدول القاعدة الذي بُذر منه الصفّ أو قُرئ منه — إن وُجد. */
  table?: string;
  /** معرّف الوثيقة/الصفّ (رمز التوجيه، معرّف المستند…). */
  docId?: string;
  /** رقم المقطع داخل الوثيقة — للمقاطع المرفوعة فقط. */
  chunkIndex?: number;
  /** هل يجوز الاستشهاد به (انظر ترويسة الملف) — ليس حالة `verified` في القاعدة. */
  citable: boolean;
  label: MatchLabel;
}

export interface Hit {
  /** معرّف فريد داخل مصدره. */
  id: string;
  source: HitSource;
  title: string;
  /** مقتطف محدود الطول — لا النصّ كاملًا. */
  excerpt: string;
  /** درجة الذراع الخام (BM25 أو RRF) — للترتيب لا للعرض. */
  score: number;
  /** الرتبة 1 فأعلى. */
  rank: number;
  provenance: HitProvenance;
}

/** جمهور الاستدعاء — الزائر لا يرى إلا ما سياسته `anon`. */
export type RetrievalAudience = "anonymous" | "member";

export interface RetrievalContext {
  orgId: string | null;
  audience: RetrievalAudience;
}

export interface ArmResult {
  arm: string;
  /** هل خدمت الذراع فعلًا (لا مهلة ولا عطل). الفراغ مع `served: true` نتيجة صادقة. */
  served: boolean;
  hits: Hit[];
  /**
   * سبب عدم الخدمة — `null` حين خدمت. رمزٌ قصير بلا نصّ استعلام ولا رسالة
   * خطأ حرّة (يصل حدث `rag.arm_failed` كما هو): `timeout` · `threw` ·
   * `flag_off` · `embed_unavailable` · `no_org` · `db_unavailable` · `guest` ·
   * `breaker_open` · `negative_cache` · رمز Postgres مثل `42P01`.
   */
  reason: string | null;
  latencyMs: number;
}

/**
 * ذراع استرجاع واحدة. المجمِّع (`aggregate.server.ts`) يشغّل الأذرع متزامنةً
 * ويمرّر لكلٍّ موعدها وإشارة إلغاء تُطلق عند تجاوزه — الذراع التي تنادي
 * القاعدة تمرّر الإشارة لنداءاتها فتُهجَر لا تُنتظَر. الإشارة اختيارية كي
 * تبقى الأذرع المتزامنة داخليًّا (الفهرس الذاكري) كما هي.
 *
 * موصولةٌ بمسار الإجابة منذ الخطوة ٢ (٢٠٢٦/١٠/٢٩) عبر `gatherRagContext` في
 * `src/lib/sadeed/rag.server.ts` بالضوابط الأربعة — المستهلكون المسموح لهم
 * محصورون في `retrieval.architecture.contract.test.ts`.
 */
export interface RetrievalArm {
  readonly name: string;
  run(
    query: string,
    ctx: RetrievalContext,
    deadlineMs: number,
    signal?: AbortSignal,
  ): Promise<ArmResult>;
}
