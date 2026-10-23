/**
 * بوّابة مالك فِن في الخادم — **الهوية من جلسة Supabase مُتحقَّقة هنا**، لا من
 * معرّفٍ يرسله العميل. للخادم وحده.
 *
 * ## الحكم الواحد
 *
 * `resolveFinnOwner(request)` يعيد `{ ok: true, userId }` للمالك **وحده**، وكلّ ما
 * عداه `{ ok: false }` بلا تمييز بين أسبابه: قائمة غير مضبوطة · قائمة فاسدة · لا
 * رمز · رمزٌ لمعرّفٍ ليس مالكًا · جلسة منتهية · عطلٌ في المصادقة. وغير المالك —
 * مسجَّلًا أو زائرًا — يتلقّى **404 متطابقًا** (`finnNotFoundResponse`) فلا يُكشف
 * وجود الوكيل ولا سبب الرفض.
 *
 * ## الترتيب: رخيصٌ أولًا، ولا شبكة لغير المالك
 *
 * 1. القائمة غير سليمة ⇒ رفضٌ بلا قراءة الطلب.
 * 2. لا رمز حامل ⇒ رفض.
 * 3. ادّعاء `sub` في الرمز (غير مُتحقَّق) ليس في القائمة ⇒ رفضٌ **بلا نداء مصادقة**.
 *    لا يجعل هذا أحدًا مالكًا — هو مرشِّح رفضٍ فقط (انظر `peekJwtSubject`).
 * 4. المدّعى في القائمة ⇒ **التحقّق الحقيقي** عبر `verifySupabaseUser` (يسأل
 *    خدمة المصادقة؛ يلتقط الرمز المسحوب والمنتهي)، ثم المقارنة على المعرّف المتحقَّق.
 *
 * فلا يتحوّل المسار إلى مكبّر نداءات مصادقةٍ يستعمله من لا يملكه، ولا يمرّ زائرٌ
 * بنموذجٍ ولا بحصّةٍ ولا بحدّ معدّل.
 *
 * ## زمن الرفض ثابت (ملاحظة W5 #1)
 *
 * الفلترة المسبقة (٣) تُنهي الرفض في ~1ms بينما رمزٌ يدّعي معرّفًا **داخل** القائمة
 * يمرّ بنداء مصادقة (مئات الملّي ثانية) قبل الرفض نفسه — فكان الفرق مِجَسًّا توقيتيًّا
 * يكشف لمن يملك UUID مرشَّحًا (ورمزًا بتوقيعٍ مزوَّر) أنه في `FINN_OWNER_USER_IDS`،
 * أي أن الوكيل موجود. **العلاج: أرضيةُ زمنٍ على كل رفض** (`FINN_DENY_FLOOR_MS`): كل
 * مسارات الرفض تنتظر الفرق حتى تبلغ الأرضية ثم تردّ. والفلترة المسبقة باقية — لا
 * «تحقّق دائم» (الذي يضخّم نداءات المصادقة لكل رمز). والمالك لا يُؤخَّر (القبول بلا نوم).
 *
 * **حدٌّ معلَن:** الأرضية تُتمّ ولا تُضيف؛ فنداءُ مصادقةٍ يتجاوز الأرضية نفسها (شبكة بطيئة)
 * يبقى أطول منها. قيمتها اختيارٌ بين إطالة كل رفض وبين سدّ الفرق الغالب، لا ضمانٌ
 * مطلق، والمسار بعد ذلك محميّ بأن لا بيانات ولا تنفيذ يتبعان الفرق (يكشف وجود الوكيل فقط).
 */
import { verifySupabaseUser } from "@/lib/hook-auth.server";
import {
  bearerToken,
  FINN_OWNER_ENV,
  isFinnOwner,
  parseFinnOwnerIds,
  peekJwtSubject,
  type FinnOwnerList,
} from "./owner-gate";

type EnvLike = Record<string, string | undefined>;

export type FinnOwnerDecision =
  { readonly ok: true; readonly userId: string } | { readonly ok: false };

const DENY: FinnOwnerDecision = { ok: false };

/**
 * أدنى زمنٍ (مللي ثانية) لأي رفض. قيمةٌ ثابتة لا يضبطها العميل ولا البيئة: أطول
 * من فرع «الرفض بلا شبكة» بكثير، وقريبةٌ من زمن نداء المصادقة المعتاد.
 */
export const FINN_DENY_FLOOR_MS = 250;

/** ساعة قابلة للحقن — الاختبارات تقدّم الزمن افتراضيًّا بلا انتظار حقيقي. */
export interface FinnDenyClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

const REAL_CLOCK: FinnDenyClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

let activeClock: FinnDenyClock = REAL_CLOCK;

/** للاختبارات وحدها. `null` يعيد الساعة الحقيقية. */
export function setFinnDenyClockForTests(clock: FinnDenyClock | null): void {
  activeClock = clock ?? REAL_CLOCK;
}

/** تحذير الإغلاق مرّةً واحدة لكل معزول وسبب — سجلٌّ بلا قيم ولا معرّفات. */
const warned = new Set<string>();

/** قراءة القائمة من بيئة الخادم. قائمةٌ غير سليمة تُسجَّل مرّةً (السبب فقط) وتُغلق الباب. */
export function readFinnOwnerList(env: EnvLike = process.env): FinnOwnerList {
  const list = parseFinnOwnerIds(env[FINN_OWNER_ENV]);
  if (list.status !== "ok" && !warned.has(list.status)) {
    warned.add(list.status);
    console.warn("[finn] owner gate is closed", { reason: list.status });
  }
  return list;
}

/** للاختبارات وحدها. */
export function resetFinnOwnerWarningsForTests(): void {
  warned.clear();
}

/** هل هذا المعرّف (المتحقَّق منه سلفًا) مالك؟ تستعمله دالة الواجهة بعد وسيط الجلسة. */
export function isFinnOwnerUser(userId: string | null | undefined, env: EnvLike = process.env) {
  return isFinnOwner(userId, readFinnOwnerList(env));
}

export async function resolveFinnOwner(
  request: Request,
  env: EnvLike = process.env,
  clock: FinnDenyClock = activeClock,
): Promise<FinnOwnerDecision> {
  const startedAt = clock.now();
  const decision = await decideFinnOwner(request, env);
  if (decision.ok) return decision;
  // رفضٌ: لا يُردّ قبل بلوغ الأرضية، أيًّا كان المسار الذي أدّى إليه.
  const remaining = FINN_DENY_FLOOR_MS - (clock.now() - startedAt);
  if (remaining > 0) await clock.sleep(remaining);
  return DENY;
}

async function decideFinnOwner(request: Request, env: EnvLike): Promise<FinnOwnerDecision> {
  const list = readFinnOwnerList(env);
  if (list.status !== "ok") return DENY;

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return DENY;

  const claimed = peekJwtSubject(token);
  if (!claimed || !isFinnOwner(claimed, list)) return DENY;

  try {
    const verified = await verifySupabaseUser(request);
    if (verified instanceof Response) return DENY;
    if (!isFinnOwner(verified.userId, list)) return DENY;
    return { ok: true, userId: verified.userId.toLowerCase() };
  } catch {
    return DENY;
  }
}

/**
 * الـ404 الواحد لكل رفض — الجسم والترويسات لا تتغيّر بتغيّر السبب.
 * (لا نصّ يقول «غير مصرّح» ولا «الوكيل غير مفعّل».)
 */
export function finnNotFoundResponse(): Response {
  return new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
