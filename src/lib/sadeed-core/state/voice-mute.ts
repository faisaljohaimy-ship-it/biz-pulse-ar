/**
 * كَتْم صوت المساعد — المفتاح الواحد الذي يملك الصمت في كل مسارات النطق.
 *
 * ── لماذا هنا، لا داخل مكوّن ──
 * الصوت يخرج من أربعة مصادر (تحية المحادثة، ردّ الدردشة، أصوات الوكلاء،
 * صوت الرئيسية)، وكلها تمرّ إجباريًّا عبر `SadeedAudioBus`. فلو عاش الكتم في
 * حالة React لكان لكل مصدر نسخته، ولَنطق أحدها بعد أن يكتم المستخدم الآخر.
 * الحالة هنا مُعرّفة على مستوى الوحدة (module scope): نسخة واحدة يقرأها
 * الناقل مباشرة قبل أن يمنح القناة، فالكتم يسبق أول بايت صوت وأول طلب TTS —
 * لا يخفض صوتًا يُشترى ويُنزَّل ثم يُهدَر.
 *
 * ── الاختيار محفوظ بين الجلسات ──
 * `localStorage` بالمفتاح **القائم** `aria-voice-muted` — نفسه الذي يستعمله
 * `src/hooks/useSadeedSpeech.ts`. لم يُخترع مفتاح جديد عمدًا: مفتاحان للمعنى
 * الواحد يجعلان تفضيلًا محفوظًا سابقًا يتيتّم، وبادئة `aria-` مفتاح تخزين
 * حيّ لا اسم عرض (CLAUDE.md — «العقود الحيّة»: لا تُعاد تسميتها).
 * القيمة `"1"` مكتوم و`"0"` ناطق، والافتراضي: ناطق.
 *
 * ── لا استيراد للناقل من هنا ──
 * `audio-bus` يستورد هذا الملف؛ فلو استورده هذا الملف لصارت الحلقة مغلقة.
 * إيقاف ما يُنطَق الآن يتم بالاشتراك: الناقل يشترك ويوقف نفسه عند الكتم.
 */
import { useEffect, useState } from "react";

/** مفتاح التخزين — عقد حيّ، لا يُعاد تسميته. */
export const SADEED_VOICE_MUTED_STORAGE_KEY = "aria-voice-muted";

let muted = false;
let hydrated = false;
const listeners = new Set<(m: boolean) => void>();

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SADEED_VOICE_MUTED_STORAGE_KEY) === "1";
  } catch {
    // وضع التصفح الخاص يرمي عند القراءة: الافتراض الآمن أن الصوت ناطق،
    // فالمستخدم يملك زرًّا يكتمه، ولا شيء يُكتم من غير طلبه.
    return false;
  }
}

/** أول قراءة فعلية من التخزين. تُؤجَّل حتى أول استعلام كي تعمل على الخادم. */
function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  muted = readStored();
}

/** هل صوت المساعد مكتوم الآن؟ يقرأها الناقل قبل منح القناة. */
export function isSadeedVoiceMuted(): boolean {
  hydrate();
  return muted;
}

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(muted);
    } catch {
      /* مستمع فاشل لا يمنع البقية */
    }
  }
}

/** يضبط الكتم ويحفظه. لا يفعل شيئًا إن كانت القيمة نفسها. */
export function setSadeedVoiceMuted(next: boolean): void {
  hydrate();
  if (muted === next) return;
  muted = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SADEED_VOICE_MUTED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* التخزين محجوب: الاختيار يعمل هذه الجلسة ولا يُحفظ */
    }
  }
  emit();
}

/** يقلب الحالة ويعيد الحالة الجديدة. */
export function toggleSadeedVoiceMuted(): boolean {
  setSadeedVoiceMuted(!isSadeedVoiceMuted());
  return muted;
}

/** اشتراك على تبدّل الكتم. يعيد دالة إلغاء الاشتراك. */
export function subscribeSadeedVoiceMute(listener: (m: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// تزامن بين التبويبات: كتم في تبويب يكتم البقية، وإلا ظنّ المستخدم أن الزر
// لا يعمل لأنه ضغطه في نافذة وسمع الصوت من أخرى.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SADEED_VOICE_MUTED_STORAGE_KEY) return;
    const next = event.newValue === "1";
    if (next === muted) return;
    hydrated = true;
    muted = next;
    emit();
  });
}

/**
 * قراءة تفاعلية للكتم داخل React.
 *
 * تبدأ من `false` ثم تُزامن في `useEffect` — لا من `localStorage` مباشرة:
 * الصفحة تُصيَّر على الخادم حيث لا تخزين، فلو بدأت القيمة من التخزين
 * لاختلف ترميز العميل عن ترميز الخادم وانكسر التعليق (hydration).
 */
export function useSadeedVoiceMuted(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    setValue(isSadeedVoiceMuted());
    return subscribeSadeedVoiceMute(setValue);
  }, []);
  return value;
}
