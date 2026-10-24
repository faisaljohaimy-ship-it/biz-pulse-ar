/**
 * نصوص فِن العربية للواجهة — **مصدرٌ واحد**، نقيّة بلا DOM، فتُفحص بالمساواة.
 *
 * القاعدة (الطريقة المحفوظة، البند ٣): لا عبارة مصادقةٍ ولا نصّ خطأٍ خام ولا اسم
 * متغيّر بيئةٍ تبلغ الشاشة. كل رسالةٍ هنا جملةٌ عربية محايدة تقول ما جرى وما
 * يمكن فعله، وتُختبر ضدّ نمط «شكل السرّ» نفسه الذي يحرس `userFacingError`.
 */
import type { FinnEngineStatus, FinnFallbackReason } from "./status";

/** الشريط الثابت — يُعرض دائمًا فوق المحادثة، لا يُخفى ولا يُطوى. */
export const FINN_BANNER_AR = "يقترح ولا ينفّذ — راجع قبل أي تنفيذ";

export const FINN_COPY = {
  title: "فِن",
  subtitle: "مساعد المالك للبرمجة والأتمتة",
  bannerHint:
    "فِن يكتب ويراجع ويشرح، ويقرأ حالة المنصّة وGitHub وVercel بأدوات قراءةٍ فقط؛ لا يشغّل ولا يكتب في المستودع أو القاعدة.",
  newChat: "محادثة جديدة",
  send: "إرسال",
  stop: "إيقاف",
  retry: "إعادة المحاولة",
  copy: "نسخ",
  copied: "تم النسخ",
  copyFailed: "تعذّر النسخ",
  composerLabel: "رسالتك إلى فِن",
  composerPlaceholder: "اكتب طلبك، أو الصق الكود أو الخطأ هنا…",
  emptyTitle: "بماذا أساعدك اليوم؟",
  emptyHint: "اختر بداية سريعة أو اكتب طلبك. تبقى المحادثة في هذه الصفحة فقط ولا تُحفظ.",
  thinking: "فِن يفكّر…",
  toolsUsed: "أدوات القراءة المستعملة",
  truncated: "قُطع الرد عند الحدّ الأقصى للطول. اكتب «أكمل» لمتابعته.",
  interrupted: "توقّف الرد قبل اكتماله.",
  you: "أنت",
  assistant: "فِن",
  conversationLabel: "محادثة فِن",
  loadingPage: "جارٍ تحميل فِن…",
} as const;

/** تحذير الرسالة الأطول من حدّ الخادم: يسمّي مقدار الزيادة ليقصّها المالك (W5 #9). */
export function finnOverLimitAr(excess: number): string {
  return `الرسالة أطول من الحدّ بـ ${excess.toLocaleString("ar-SA")} حرفًا. اختصرها أو قسّمها قبل الإرسال.`;
}

/** بدايات سريعة: تملأ حقل الكتابة ولا تُرسل — المالك يعدّل ثم يرسل. */
export const FINN_STARTERS: ReadonlyArray<{ readonly label: string; readonly prompt: string }> = [
  {
    label: "راجع هذا الكود",
    prompt:
      "راجع هذا الكود بحثًا عن أخطاء ومشكلات أمان وأداء، واقترح تعديلات دون تنفيذ شيء:\n\n```ts\n\n```",
  },
  {
    label: "اكتب دالة خادم",
    prompt:
      "اكتب دالة خادم بـcreateServerFn في TanStack Start تقرأ من Supabase وتتحقق من الجلسة، مع اختبار Vitest:\n",
  },
  {
    label: "صمّم مسار أتمتة",
    prompt:
      "صمّم workflow في GitHub Actions يشغّل tsc وeslint والاختبارات على كل دفع، مع مواصفة قصيرة (المُشغِّل · الخطوات · الفشل والتراجع):\n",
  },
  {
    label: "راجع سياسة RLS",
    prompt:
      "راجع سياسات RLS التالية بحثًا عن ثغرات عزل بين المؤسسات، واقترح إصلاحًا دون تنفيذه:\n\n```sql\n\n```",
  },
];

/** شارة المحرّك الذي أجاب فعلًا. */
export const FINN_ENGINE_LABEL_AR = {
  gpt: "GPT",
  fallback: "احتياطي",
} as const;

/** سبب السقوط عن GPT — جملةٌ عامّة لا نصّ مزوّد. */
export const FINN_FALLBACK_REASON_AR: Readonly<Record<FinnFallbackReason, string>> = {
  not_configured: "مفتاح GPT غير مضبوط على الخادم",
  rate_limited: "GPT بلغ حدّ الطلبات",
  timeout: "GPT لم يردّ في المهلة",
  upstream_error: "تعذّر الاتصال بـGPT",
  model_unavailable: "نموذج GPT غير متاح",
  auth_failed: "رفض GPT حساب الخادم",
  billing: "حساب GPT يحتاج مراجعة الرصيد",
};

export type FinnReadiness = {
  readonly tone: "ok" | "warn" | "off";
  readonly label: string;
  readonly detail: string;
};

/**
 * مؤشر الجاهزية الصادق. **منطقيّات فقط**: «مهيّأ» تعني أن المفتاح مضبوط على الخادم،
 * لا أن المزوّد يعمل الآن — الاتصال الفعلي لا يُقاس إلا عند الإرسال، ويُعرض حينها
 * في شارة كل ردّ. لا يظهر طول المفتاح ولا قيمته.
 */
export function describeFinnReadiness(engine: FinnEngineStatus): FinnReadiness {
  if (engine.paused) {
    return {
      tone: "off",
      label: "متوقف بأمر التشغيل",
      detail: "مفتاح الإيقاف الفوري مرفوع؛ لن يردّ فِن حتى يُخفض.",
    };
  }
  if (engine.gpt) {
    return {
      tone: "ok",
      label: "GPT مهيّأ",
      detail: `النموذج المعتمد: ${engine.gptModel}. «مهيّأ» تعني أن المفتاح مضبوط، لا أن المزوّد يعمل الآن.`,
    };
  }
  if (engine.fallback) {
    return {
      tone: "warn",
      label: "يعمل بالاحتياطي",
      detail:
        "مفتاح GPT غير مضبوط على الخادم، فتُجاب الطلبات بالمحرّك الاحتياطي ويُعلَن ذلك على كل ردّ.",
    };
  }
  return {
    tone: "off",
    label: "لا محرّك مهيّأ",
    detail: "لم يُهيَّأ أي محرّك على الخادم؛ لن يردّ فِن حتى يُضبط أحدهما.",
  };
}

export type FinnClientErrorKind =
  | "not_found"
  | "paused"
  | "rate_limited"
  | "quota"
  | "quota_global"
  | "unavailable"
  | "engine"
  | "timeout"
  | "too_large"
  | "network"
  | "interrupted"
  | "unknown";

/** رمز خطأ الخادم ورمز HTTP ⇒ نوعٌ يعرفه العميل. */
export function classifyFinnHttpError(status: number, code: string | null): FinnClientErrorKind {
  if (status === 404) return "not_found";
  if (code === "ai_disabled") return "paused";
  if (code === "finn_rate_limited") return "rate_limited";
  // سقفان مختلفان لا يُقرآن بجملةٍ واحدة: سقف سطح فِن الكلّي ≠ حصّة المالك اليومية (W5 #2).
  if (code === "daily_global_cap") return "quota_global";
  if (code === "daily_identity_cap") return "quota";
  if (code === "quota_unavailable" || code === "rate_limit_unavailable" || code === "no_engine") {
    return "unavailable";
  }
  if (code === "engine_timeout" || status === 504) return "timeout";
  if (status === 413) return "too_large";
  if (code === "engine_unavailable" || status === 502) return "engine";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  return "unknown";
}

export const FINN_ERROR_AR: Readonly<Record<FinnClientErrorKind, string>> = {
  not_found: "هذا الوكيل غير متاح لحسابك.",
  paused: "فِن متوقف مؤقتًا بأمر التشغيل. جرّب لاحقًا.",
  rate_limited: "طلبات كثيرة في وقتٍ قصير. انتظر دقيقة ثم أعد المحاولة.",
  quota: "بلغت حصّتك اليومية من طلبات فِن. تعود بعد منتصف الليل.",
  quota_global:
    "بلغ فِن سقفه الكلّي اليومي من الطلبات (إعداد الخادم، لا حصّتك). يُستأنف بعد منتصف الليل.",
  unavailable:
    "فِن غير متاح الآن (تعذّر التحقّق من الحدّ أو لا محرّك مهيّأ). أعد المحاولة بعد قليل.",
  engine: "تعذّر الحصول على ردّ من المحرّكين الآن. أعد المحاولة بعد قليل.",
  timeout: "انتهت مهلة المحرّك دون ردّ. أعد المحاولة أو اختصر الطلب.",
  too_large: "المحادثة أو الرسالة أكبر من الحدّ المسموح. ابدأ محادثة جديدة أو اختصر الرسالة.",
  network: "تعذّر الاتصال بالخادم. تحقّق من الشبكة وأعد المحاولة.",
  interrupted: "انقطع البثّ قبل اكتمال الرد. أعد المحاولة.",
  unknown: "تعذّر إكمال الرد الآن. أعد المحاولة.",
};
