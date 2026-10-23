/**
 * تفضيل صوت فيلم التوأم المحفوظ للزائر — **يكتبه زرّ الصوت وحده**. الغياب = «مرغوب»: الفيلم يبدأ
 * بصوته ما أُذن له المتصفّح. وهو ملفٌّ منفصل عن المشغّل عمدًا: المشغّل لا يكتب في التخزين إطلاقًا
 * (عقد `twin-film.contract.test.ts`)، فالكتابة الوحيدة المسموحة هنا وبمفتاحٍ واحد.
 * التخزين المحجوب (نافذة خاصة · بيانات موقع محجوبة) يعني «بلا تفضيل محفوظ» لا عطلًا.
 */
export const SOUND_PREF_KEY = "nx-twin-sound";
export const SOUND_PREF_OFF = "off";

export function readSoundWanted(): boolean {
  try {
    return localStorage.getItem(SOUND_PREF_KEY) !== SOUND_PREF_OFF;
  } catch {
    return true;
  }
}

export function writeSoundWanted(wanted: boolean): void {
  try {
    if (wanted) localStorage.removeItem(SOUND_PREF_KEY);
    else localStorage.setItem(SOUND_PREF_KEY, SOUND_PREF_OFF);
  } catch {
    /* تخزينٌ محجوب — يبقى الاختيار لهذه الجلسة في الذاكرة */
  }
}
