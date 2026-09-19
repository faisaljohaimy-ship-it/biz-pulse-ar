/**
 * حصّة الذكاء والصوت — الطبقة التي تحدّ **الإنفاق**، لا معدّل الطلب.
 *
 * ## لماذا الحدّ القائم لا يكفي
 *
 * كل نقطة تُنفق مالًا عليها `enforceRateLimit` بنافذة ٦٠ ثانية، وهو يفشل
 * مغلقًا. ذلك يمنع الاندفاع ولا يحدّ الفاتورة: ثلاثون طلبًا في الدقيقة
 * مسموحةٌ أبدًا، فعنوانٌ واحد صبور يبلغ **43,200 نداء ElevenLabs في
 * اليوم** بلا أن يكسر حدًّا واحدًا. ونافذةٌ لكل IP لا تعرف شيئًا عن
 * مجموع ما أنفقه المشروع.
 *
 * فالناقص ليس حدًّا أشدّ، بل **بُعدان آخران**: سقفٌ يوميّ لكل هوية،
 * وسقفٌ يوميّ **للمشروع كلّه** لا يتجاوزه مجموع الجميع.
 *
 * ## ولا تحتاج مخططًا جديدًا
 *
 * `public.check_rate_limit(_bucket_key, _max, _window_seconds)` مطبَّقة
 * على الإنتاج منذ ٢٠٢٦/٠٦/٢٨ وتقبل **أي** نافذة. فالسقف اليوميّ نافذةٌ
 * مقدارها 86400، والسقف العام مفتاحُ دلوٍ واحد يشترك فيه الجميع. صفر
 * ترحيل، وتشتغل الحماية من لحظة الدفع لا من لحظة تطبيق ترحيل.
 *
 * ## الترتيب مقصود
 *
 * مفتاح الإيقاف أولًا (قراءة بيئة، بلا شبكة)، ثم السقف العام، ثم سقف
 * الهوية. فحين يُغلق النظام كلُّه لا نُنفق استعلامًا لكل زائر.
 *
 * ## الرسائل عربية — والسبب ليس الذوق
 *
 * ‏429 بجسم `{"error":"rate_limited"}` يصل المستخدم صفحةً مكسورة بلا
 * خبر. ونمط المشروع المحفوظ: لا عبارة تقنية تُعرض، بل رسالة عربية محايدة
 * تقول ما حدث ومتى يعود.
 */
import { enforceRateLimit } from "./rate-limit.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DAY_SECONDS = 86_400;

/** الأسطح الثلاثة التي تُنفق مالًا، وتكلفتها تختلف فتختلف سقوفها. */
export type AiSurface = "tts" | "stt" | "chat";

/**
 * مفتاح الإيقاف الفوري — متغيّر بيئة لا نشر.
 *
 * حين يُساء استعمال النظام ليلًا فالخيار بين تعطيلٍ فوريّ وانتظار دورة
 * نشر كاملة. القيمة `"1"` أو `"on"` أو `"true"` تُطفئ الصوت والمساعد
 * معًا؛ وأي قيمة أخرى أو غيابها = يعمل.
 */
const SURFACE_AR: Record<AiSurface, string> = {
  tts: "الصوت",
  stt: "النسخ الصوتي",
  chat: "المساعد",
};

function arabicResponse(status: number, code: string, message: string, retryAfter: number) {
  return new Response(JSON.stringify({ error: code, message_ar: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Retry-After": String(retryAfter),
      "Cache-Control": "no-store",
    },
  });
}

export function aiKillSwitchOn(): boolean {
  const v = (process.env.SADEED_AI_DISABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "on" || v === "true";
}

/**
 * البوّابة المتزامنة — **تُستدعى أوّل سطرٍ في كل مُعالِج، قبل أي شبكة.**
 *
 * أوّل تركيبٍ وضع فحص المفتاح داخل `enforceAiQuota` وحدها، وهي تأتي بعد
 * حدّ المعدل الذي يستعلم القاعدة. فقِيس على خادمٍ حيّ: رفع المفتاح ثم
 * نداء `/api/public/sadeed-tts` أعطى **502** لا 503 — لأن استعلام القاعدة
 * سقط أوّلًا فابتلعه `catch` الخارجي، ولم يُقرأ المفتاح إطلاقًا.
 *
 * وذلك يُبطل معنى «الإيقاف الفوري»: اللحظة التي تحتاجه فيها أكثر — نظامٌ
 * تحت ضغطٍ وقاعدةٌ متعثّرة — هي عينها اللحظة التي كان يصمت فيها. فصار
 * الفحص متزامنًا لا يلمس شبكة، وأوّل ما يُنفَّذ.
 */
export function aiDisabledResponse(surface: AiSurface): Response | null {
  if (!aiKillSwitchOn()) return null;
  return arabicResponse(
    503,
    "ai_disabled",
    `خدمة ${SURFACE_AR[surface]} متوقفة مؤقتًا بأمر التشغيل. جرّب لاحقًا.`,
    300,
  );
}

/** سقفٌ من البيئة إن وُجد، وإلا الافتراض المكتوب. */
function cap(envVar: string, fallback: number): number {
  const raw = Number.parseInt(process.env[envVar] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/**
 * السقوف الافتراضية — مُقدَّرة بالتكلفة النسبية لا بالتساوي.
 *
 * ElevenLabs تُحاسَب بالأحرف وهي الأغلى، فسقفها الأضيق. وGemini أرخص
 * بمراتب فسقفها أوسع. وكلّها تُضبط من البيئة بلا نشر متى تبدّل الواقع.
 */
const LIMITS: Record<AiSurface, { perIdentity: number; global: number }> = {
  tts: {
    perIdentity: cap("SADEED_TTS_DAILY_PER_IDENTITY", 60),
    global: cap("SADEED_TTS_DAILY_GLOBAL", 2_000),
  },
  stt: {
    perIdentity: cap("SADEED_STT_DAILY_PER_IDENTITY", 40),
    global: cap("SADEED_STT_DAILY_GLOBAL", 1_500),
  },
  chat: {
    perIdentity: cap("SADEED_CHAT_DAILY_PER_IDENTITY", 120),
    global: cap("SADEED_CHAT_DAILY_GLOBAL", 5_000),
  },
};

/** ثوانٍ حتى منتصف الليل — رقمٌ صادق في `Retry-After` بدل ٦٠ ثابتة. */
function secondsUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(60, Math.round((next.getTime() - now.getTime()) / 1000));
}

/**
 * مفتاح اليوم — يُدرج التاريخ في الدلو نفسه.
 *
 * نافذة 86400 وحدها تنزلق مع أوّل طلب، فتصير «٢٤ ساعة من آخر صفر» لا
 * «اليوم». وإدراج التاريخ يجعل السقف يُصفَّر عند منتصف الليل فعلًا —
 * وهو ما تعده الرسالة المعروضة للمستخدم.
 */
function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * سجلّ الاستهلاك — **أفضل جهد، لا يحجب أبدًا**.
 *
 * الجدول `ai_usage_log` يأتي بترحيلٍ مرافق لم يُطبَّق بعد (القاعدة خارج
 * صلاحية جلسة التطوير). فالكتابة تُحاط بـtry وتُبتلع: لا يجوز أن يسقط
 * نداءُ مستخدمٍ لأن سطر محاسبةٍ لم يُكتب. وتشتغل من نفسها لحظة وجود
 * الجدول، بلا نشر ثانٍ.
 */
async function recordUsage(surface: AiSurface, identity: string, units: number): Promise<void> {
  try {
    await supabaseAdmin
      .from("ai_usage_log" as never)
      .insert({ surface, identity, units, occurred_at: new Date().toISOString() } as never);
  } catch {
    /* المحاسبة ليست بوابة. */
  }
}

export interface AiQuotaOptions {
  readonly surface: AiSurface;
  /** هوية المستهلك: معرّف المستخدم إن وُجد، وإلا عنوانه. */
  readonly identity: string;
  /** حجم تقديريّ (أحرف النصّ مثلًا) — للمحاسبة لا للحجب. */
  readonly units?: number;
}

/**
 * البوابة. تعيد `Response` عربية إن مُنع النداء، أو `null` إن سُمح.
 *
 * تُستدعى **بعد** حدّ المعدل القائم لا بدلًا منه: ذاك يمنع الاندفاع في
 * الدقيقة، وهذه تحدّ الفاتورة في اليوم.
 */
export async function enforceAiQuota(opts: AiQuotaOptions): Promise<Response | null> {
  const { surface, identity, units = 1 } = opts;
  const ar = SURFACE_AR[surface];

  const disabled = aiDisabledResponse(surface);
  if (disabled) return disabled;

  const limits = LIMITS[surface];
  const today = dayKey();
  const retry = secondsUntilMidnight();

  // السقف العام أوّلًا: حين يُستنفد لا معنى لسؤال الهوية.
  const globalGate = await enforceRateLimit(
    `ai-daily-global:${surface}:${today}`,
    limits.global,
    DAY_SECONDS,
  );
  if (globalGate.unavailable) {
    return arabicResponse(
      503,
      "quota_unavailable",
      `تعذّر التحقّق من حصّة ${ar} الآن. أعد المحاولة بعد قليل.`,
      60,
    );
  }
  if (!globalGate.allowed) {
    return arabicResponse(
      429,
      "daily_global_cap",
      `بلغ النظام سقفه اليومي من طلبات ${ar}. تُستأنف الخدمة بعد منتصف الليل.`,
      retry,
    );
  }

  const identityGate = await enforceRateLimit(
    `ai-daily-id:${surface}:${today}:${identity}`,
    limits.perIdentity,
    DAY_SECONDS,
  );
  if (identityGate.unavailable) {
    return arabicResponse(
      503,
      "quota_unavailable",
      `تعذّر التحقّق من حصّة ${ar} الآن. أعد المحاولة بعد قليل.`,
      60,
    );
  }
  if (!identityGate.allowed) {
    return arabicResponse(
      429,
      "daily_identity_cap",
      `تجاوزت حصّتك اليومية من طلبات ${ar}. تعود الحصّة بعد منتصف الليل.`,
      retry,
    );
  }

  void recordUsage(surface, identity, units);
  return null;
}
