/**
 * مِغلاف الصوت — يحوّل صوت سَدِيد الجاري إلى رقمٍ واحد بين 0 و1 تُحرَّك به
 * الشفاه. حركةُ فمٍ مربوطة بالصوت **الفعلي**، لا حلقةً مُعدّة سلفًا تتظاهر
 * بالمزامنة.
 *
 * ── لماذا أمكن هذا هنا تحديدًا ──
 * `SadeedAudioBus.notifyPlaying(source, audioEl)` يمرّر عنصر `<audio>` نفسه
 * إلى المشتركين (audio-bus.ts). والصوت يُشغَّل من `blob:` أنشأه
 * `URL.createObjectURL` (useSadeedSpeech.ts) — أي **من أصلٍ واحد**، فلا
 * تلوّث CORS يمنع قراءة الطيف. لو كان الصوت من نطاقٍ آخر بلا
 * `crossOrigin="anonymous"` لعاد المحلّل أصفارًا صامتة: تشتغل الآلة ولا
 * تتحرّك الشفاه، بلا خطأ يُنبّه.
 *
 * ── المصيدة التي تُفقد الصوت ──
 * `createMediaElementSource` يُستدعى **مرّة واحدة لكل عنصر**؛ واستدعاؤه
 * ثانيةً على العنصر نفسه يرمي. والأخطر: بمجرّد وصل العنصر بالرسم البياني
 * يتوقّف صوته عن الخروج إلى السمّاعة ما لم يُوصَل صراحةً بـ`destination`.
 * فالنسيان هنا لا يكسر الحركة — يكسر **الصوت نفسه**. لذلك يحتفظ الملف
 * بخريطة عناصر سبق وصلها، ويصل المصدر بالوجهة دائمًا.
 */

/** سعة صامتة — دون هذا يُعدّ الصوت سكونًا فيُغلق الفم. */
const SILENCE_FLOOR = 0.012;

/**
 * تنعيم أُسّي غير متماثل: الفتح أسرع من الإغلاق.
 *
 * لماذا غير متماثل — الكلام يبدأ بانفجارٍ سريع وينتهي بذيلٍ أبطأ؛ التنعيم
 * المتماثل يعطي فمًا «مطّاطًا» يتأخّر عن المقطع ثم يعلق مفتوحًا بعده.
 * دالّة خالصة، فمنحناها يُختبر بلا صوت ولا متصفّح.
 */
export function smoothEnvelope(prev: number, next: number, attack = 0.55, release = 0.14): number {
  const k = next > prev ? attack : release;
  return prev + (next - prev) * k;
}

/**
 * السعة الجذرية التربيعية (RMS) من عيّنات المجال الزمني بصيغة بايت.
 *
 * البايت 128 هو الصفر الصوتي، لا 0 — والقراءة الساذجة (`v / 255`) تعطي
 * ~0.5 على السكون التام فيبقى الفم مفتوحًا نصف فتحة أبدًا. دالّة خالصة
 * تُختبر بمصفوفة مصنوعة.
 */
export function rmsFromTimeDomain(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const centered = (bytes[i] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / bytes.length);
}

/**
 * يحوّل RMS إلى فتحة فمٍ بين 0 و1.
 *
 * الجذر التربيعي يرفع المستويات المنخفضة: كلام الحديث العادي يقع في نطاقٍ
 * ضيّق قرب القاع، فالخطّي منه يعطي حركةً بالكاد تُرى. والقصّ عند 1 يمنع
 * الصياح من فكٍّ يتجاوز حدود القناع.
 */
export function mouthOpennessFromRms(rms: number, gain = 3.2): number {
  if (rms <= SILENCE_FLOOR) return 0;
  return Math.min(1, Math.sqrt(rms * gain));
}

interface Attachment {
  ctx: AudioContext;
  analyser: AnalyserNode;
  /**
   * `Uint8Array<ArrayBuffer>` صراحةً لا `Uint8Array` المجرّدة: الأخيرة
   * تُستنتج على `ArrayBufferLike` الذي يشمل `SharedArrayBuffer`، و
   * `getByteTimeDomainData` يشترط المخزن غير المشترك.
   */
  buffer: Uint8Array<ArrayBuffer>;
}

/** العناصر التي وُصلت من قبل — الوصل الثاني يرمي، والنسيان يقطع الصوت. */
const attached = new WeakMap<HTMLMediaElement, Attachment>();

/**
 * يصل عنصر صوتٍ بمحلّل ويعيد قارئًا للسعة، أو `null` إذا تعذّر.
 *
 * `null` ليست فشلًا صامتًا: المتّصل يسقط عندها إلى حركة فمٍ إيقاعية خفيفة
 * (انظر المكوّن) فتبقى الشخصية حيّة ولا تتجمّد — لكنه لا يدّعي مزامنة.
 */
export function attachVoiceEnvelope(el: HTMLMediaElement): (() => number) | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    let a = attached.get(el);
    if (!a) {
      const ctx = new Ctor();
      const source = ctx.createMediaElementSource(el);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      // **واجبة**: بغيرها يُبتلع الصوت في الرسم البياني ولا يخرج للسمّاعة.
      analyser.connect(ctx.destination);
      // `new ArrayBuffer` صراحةً: `new Uint8Array(n)` يُستنتج على
      // `ArrayBufferLike` فيرفضه `getByteTimeDomainData` الذي يشترط
      // `ArrayBuffer` غير المشترك.
      a = { ctx, analyser, buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)) };
      attached.set(el, a);
    }
    const at = a;
    // السياق يُنشأ معلّقًا حين لا إيماءة سابقة؛ الاستئناف بلا انتظار لأن
    // الإخفاق هنا يعني قراءةَ أصفار لا انهيارًا.
    if (at.ctx.state === "suspended") void at.ctx.resume().catch(() => {});
    return () => {
      at.analyser.getByteTimeDomainData(at.buffer);
      return mouthOpennessFromRms(rmsFromTimeDomain(at.buffer));
    };
  } catch {
    return null;
  }
}
