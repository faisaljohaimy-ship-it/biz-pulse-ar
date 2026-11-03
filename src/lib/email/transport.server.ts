/**
 * ناقل البريد الفعلي — هل يوجد من يُفرغ طابور البريد؟
 *
 * `enqueue_email` (قاعدة البيانات) **تُنشئ الطابور عند غيابه وتعيد النجاح**؛ فالإدراج في
 * `pgmq` ينجح دائمًا، سواء وُجد مستهلكٌ للطابور أو لم يوجد. والمستهلك الوحيد في هذا
 * المستودع هو المسار `/lovable/email/queue/process`، وهو يرفض العمل (500) بلا
 * `LOVABLE_API_KEY`. فبلا المفتاح يصير «نجاح الإدراج» وعدًا بلا أحد يفي به: يُحفَظ الطلب،
 * ويُسجَّل `email_delivered: true`، ولا يصل بريد — فشلٌ صامت أسوأ من فشلٍ معلَن.
 *
 * القاعدة هنا: لا نُدرج رسالةً لا يوجد من يرسلها، ولا نُعلن نجاحًا لم يقع. وجودُ المفتاح
 * شرطٌ لازمٌ لا كافٍ (التشغيل المجدول للمعالج بيد البنية التحتية ولم يُقَس هنا)، لكنّ غيابه
 * يقين.
 *
 * الفحص وجودٌ فقط: لا تُطبع القيمة ولا تُسجَّل ولا يُعاد طولها.
 */

type EnvLike = Record<string, string | undefined>;

/** رمز الخطأ المستقرّ الذي يُسجَّل في `leads.metadata.email_delivery.error` ويقرؤه التشغيل. */
export const EMAIL_TRANSPORT_NOT_CONFIGURED = "email_transport_not_configured" as const;

/** هل في الخادم ناقلُ بريدٍ تُفرَّغ به رسائل الطابور؟ منطقيّ فقط. */
export function emailTransportConfigured(env: EnvLike = process.env): boolean {
  return (env.LOVABLE_API_KEY?.trim() ?? "").length > 0;
}
