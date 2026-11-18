/**
 * أصل النداء الذاتي — إلى أين يرسل الخادم أسراره حين يستدعي نقطته العامة.
 *
 * `enqueueKnowledgeIngest` كان يبني عنوان `/api/public/hooks/sadeed-docs-ingest`
 * من `req.url` ويرسل إليه `x-cron-secret`. والأصل المشتقّ من الطلب يقرؤه الخادم
 * ممّا يصله على الحافّة (المضيف، وربّما `x-forwarded-host` خلف وكيل)، فإن انحرف
 * ذهب السرّ إلى مضيفٍ آخر (تدقيق ٢٠٢٦/١٠/١٧، SEC-1C-06). القاعدة: أصلٌ مضبوط من
 * البيئة أوّلًا (`PUBLIC_SITE_URL` ثم `SITE_URL`)، ولا يُقبل منه إلا `https:`
 * أو `http:` بلا مسار. لا نستخدم أصل الطلب إلا عند غياب الضبط كليًّا؛
 * الضبط غير الصالح يوقف النداء بدل إرسال السرّ إلى مضيف مشتق من الطلب.
 */
export function resolveSelfCallOrigin(
  requestUrl: string,
  env: Record<string, string | undefined> = process.env,
): string {
  let hasConfiguredOrigin = false;
  for (const name of ["PUBLIC_SITE_URL", "SITE_URL"] as const) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    hasConfiguredOrigin = true;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      return url.origin;
    } catch {
      /* قيمةٌ ليست عنوانًا مطلقًا — تُتجاهل وتُجرَّب التالية. */
    }
  }
  // A malformed explicitly configured site must not downgrade a secret-bearing
  // self-call to an untrusted request Host. Unconfigured local use is unchanged.
  if (hasConfiguredOrigin) throw new Error("Invalid configured self-call origin.");
  return new URL(requestUrl).origin;
}
