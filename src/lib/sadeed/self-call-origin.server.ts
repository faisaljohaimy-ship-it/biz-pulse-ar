/**
 * أصل النداء الذاتي — إلى أين يرسل الخادم أسراره حين يستدعي نقطته العامة.
 *
 * `enqueueKnowledgeIngest` كان يبني عنوان `/api/public/hooks/sadeed-docs-ingest`
 * من `req.url` ويرسل إليه `x-cron-secret`. والأصل المشتقّ من الطلب يقرؤه الخادم
 * ممّا يصله على الحافّة (المضيف، وربّما `x-forwarded-host` خلف وكيل)، فإن انحرف
 * ذهب السرّ إلى مضيفٍ آخر (تدقيق ٢٠٢٦/١٠/١٧، SEC-1C-06). القاعدة: أصلٌ مضبوط من
 * البيئة أوّلًا (`PUBLIC_SITE_URL` ثم `SITE_URL`)، ولا يُقبل منه إلا `https:`
 * أو `http:` بلا مسار؛ وإلا يبقى أصل الطلب كما كان — فالسلوك لا يتغيّر حيث لا
 * ضبط، ويتحصّن حيث يوجد.
 */
export function resolveSelfCallOrigin(
  requestUrl: string,
  env: Record<string, string | undefined> = process.env,
): string {
  for (const name of ["PUBLIC_SITE_URL", "SITE_URL"] as const) {
    const raw = env[name]?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      return url.origin;
    } catch {
      /* قيمةٌ ليست عنوانًا مطلقًا — تُتجاهل وتُجرَّب التالية. */
    }
  }
  return new URL(requestUrl).origin;
}
