import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Check, Bot, RefreshCw, Sparkles } from "lucide-react";
import { AriaSignatureBackdrop } from "@/components/aria/AriaSignatureBackdrop";
import { DOMAIN_URL } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "ربط مساعد ذكاء اصطناعي · NEXIOS AI OS" },
      {
        name: "description",
        content:
          "اربط ChatGPT أو Claude بنظام NEXIOS عبر MCP. انسخ رابط الخادم واتبع الدليل خطوة بخطوة.",
      },
      { property: "og:title", content: "ربط مساعد ذكاء اصطناعي بـ NEXIOS" },
      {
        property: "og:description",
        content: "خطوة بخطوة: الصق رابط NEXIOS MCP في ChatGPT أو Claude.",
      },
      { property: "og:url", content: `${DOMAIN_URL}/connect` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/connect` }],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { locale, setLocale } = useI18n();
  const ar = locale === "ar";
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="relative isolate min-h-screen overflow-hidden bg-[#04070F] text-white"
    >
      <AriaSignatureBackdrop intensity={1.2} />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-14 sm:py-20">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <Bot className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black sm:text-3xl">
              {ar ? "ربط مساعد ذكاء اصطناعي" : "Connect an AI assistant"}
            </h1>
            <p className="text-sm text-white/55">
              {ar
                ? "استخدم NEXIOS من داخل ChatGPT أو Claude عبر MCP."
                : "Use NEXIOS from ChatGPT or Claude through MCP."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocale(ar ? "en" : "ar")}
            className="shrink-0 rounded-xl border border-white/20 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
          >
            {ar ? "EN" : "ع"}
          </button>
        </div>

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {ar ? "رابط خادم MCP" : "MCP server URL"}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code
              dir="ltr"
              className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[13px] text-[#3AE8FF]"
            >
              {mcpUrl || "…"}
            </code>
            <button
              type="button"
              onClick={copy}
              disabled={!mcpUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/25 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ الرابط" : "Copy URL"}
            </button>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">
            {ar
              ? "الصق هذا الرابط في إعدادات الموصّلات لدى مساعدك. بعد الربط يمكنك أن تطلب منه استخدام أدوات NEXIOS لقراءة البلاغات والمؤشرات والملخصات التنفيذية."
              : "Paste this URL into your assistant's connector settings. Once connected, you can ask it to use NEXIOS tools to read incidents, KPIs, and briefings."}
          </p>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#3AE8FF]" />
            <h2 className="text-lg font-bold">{ar ? "الربط" : "Connect"}</h2>
          </div>

          <div className="space-y-6">
            <ClientCard title="ChatGPT">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  {ar ? "١. افتح " : "1. Open "}
                  <ExtLink href="https://chatgpt.com/#settings/Connectors/Advanced">
                    {ar
                      ? "ChatGPT ← الإعدادات ← الموصّلات ← متقدم"
                      : "ChatGPT → Settings → Connectors → Advanced"}
                  </ExtLink>
                  {ar
                    ? " وفعّل وضع المطوّر (اقرأ تنبيه المخاطر المعروض هناك)."
                    : " and enable Developer mode (read the risk notice shown there)."}
                </li>
                <li>
                  {ar
                    ? '٢. من قائمة "+" في صندوق المحادثة فعّل وضع المطوّر.'
                    : '2. In the chat composer, open the "+" menu and turn on Developer mode.'}
                </li>
                <li>
                  {ar
                    ? '٣. اختر "Add sources" ثم "Connect more".'
                    : '3. Click "Add sources", then "Connect more".'}
                </li>
                <li>
                  {ar
                    ? "٤. سمِّ الموصّل والصق رابط MCP أعلاه."
                    : "4. Give the connector a name and paste the MCP URL above."}
                </li>
                <li>
                  {ar
                    ? "٥. ابدأ محادثة جديدة واطلب من ChatGPT استخدام NEXIOS."
                    : "5. Start a new chat and ask ChatGPT to use NEXIOS."}
                </li>
              </ol>
            </ClientCard>

            <ClientCard title="Claude">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  {ar ? "١. افتح " : "1. Open "}
                  <ExtLink href="https://claude.ai/customize/connectors?modal=add-custom-connector">
                    {ar
                      ? "Claude ← الموصّلات ← إضافة موصّل مخصص"
                      : "Claude → Connectors → Add custom connector"}
                  </ExtLink>
                  .
                </li>
                <li>
                  {ar
                    ? "٢. سمِّ الموصّل والصق رابط MCP أعلاه."
                    : "2. Give the connector a name and paste the MCP URL above."}
                </li>
                <li>
                  {ar
                    ? "٣. فعّل الموصّل من صندوق المحادثة."
                    : "3. Enable the connector from the chat composer."}
                </li>
                <li>{ar ? "٤. اطلب من Claude استخدام NEXIOS." : "4. Ask Claude to use NEXIOS."}</li>
              </ol>
            </ClientCard>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[#3AE8FF]" />
            <h2 className="text-lg font-bold">
              {ar ? "التحديث بعد تغيّر التطبيق" : "Refresh after the app changes"}
            </h2>
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-white/60">
            {ar
              ? "المساعد المرتبط يخزّن قائمة الأدوات مؤقتًا. عند إطلاق أدوات أو تحديثات جديدة حدّث الموصّل ليراها مساعدك."
              : "A connected assistant caches the tool list. When we ship new tools or updates, refresh the connector so your assistant sees them."}
          </p>

          <div className="space-y-6">
            <ClientCard title="ChatGPT">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  {ar
                    ? '١. افتح تفضيلات تطبيق ChatGPT واختر NEXIOS ضمن "Enabled apps".'
                    : '1. Open ChatGPT app preferences and pick NEXIOS under "Enabled apps".'}
                </li>
                <li>
                  {ar
                    ? '٢. بجوار "Information" اضغط "Refresh".'
                    : '2. Next to "Information", click "Refresh".'}
                </li>
                <li>
                  {ar
                    ? "٣. إن تغيّر الرابط فالصق أحدث رابط من الأعلى."
                    : "3. If the URL changed, paste the latest URL from above."}
                </li>
                <li>
                  {ar
                    ? "٤. ابدأ محادثة جديدة واطلب من ChatGPT استخدام NEXIOS."
                    : "4. Start a new chat and ask ChatGPT to use NEXIOS."}
                </li>
              </ol>
            </ClientCard>

            <ClientCard title="Claude">
              <ol className="space-y-2 text-[14px] leading-relaxed text-white/80">
                <li>
                  {ar
                    ? "١. افتح صفحة الموصّلات واختر موصّل NEXIOS."
                    : "1. Open the Connectors page and select the NEXIOS connector."}
                </li>
                <li>
                  {ar
                    ? "٢. حدّث الموصّل أو قائمة أدواته."
                    : "2. Refresh or update the connector's tools."}
                </li>
                <li>
                  {ar
                    ? "٣. إن تغيّر الرابط فالصق أحدث رابط من الأعلى."
                    : "3. If the URL changed, paste the latest URL from above."}
                </li>
                <li>{ar ? "٤. اطلب من Claude استخدام NEXIOS." : "4. Ask Claude to use NEXIOS."}</li>
              </ol>
            </ClientCard>
          </div>
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
          {ar ? "تحتاج مساعدة؟ " : "Need help? "}
          <Link to="/contact" className="text-[#3AE8FF] underline-offset-4 hover:underline">
            {ar ? "تواصل مع فريق NEXIOS" : "Contact the NEXIOS team"}
          </Link>
          .
        </div>
      </main>
    </div>
  );
}

function ClientCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-[#3AE8FF] underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
