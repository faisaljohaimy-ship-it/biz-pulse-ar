import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { submitLead } from "@/lib/leads.functions";
import { DOMAIN_URL } from "@/lib/domain";
import { Sparkles, ArrowLeft, Send, CheckCircle2, Copy } from "lucide-react";

export const Route = createFileRoute("/request-demo")({
  head: () => ({
    meta: [
      { title: "Request a Demo — Nexus AI OS" },
      { name: "description", content: "Request a personalized walkthrough of Nexus AI OS for your executive team." },
      { property: "og:title", content: "Request a Demo — Nexus AI OS" },
      { property: "og:description", content: "Personalized executive walkthrough tailored to your enterprise." },
      { property: "og:url", content: `${DOMAIN_URL}/request-demo` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/request-demo` }],
  }),
  component: RequestDemoPage,
});

function RequestDemoPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  return (
    <FormShell
      kind="demo"
      isAr={isAr}
      eyebrow={isAr ? "اطلب عرضاً شخصياً" : "Request a Demo"}
      title={isAr ? "أرنا مؤسستك. سنُريك Nexus." : "Tell us about your enterprise. We'll show you Nexus."}
      subtitle={isAr ? "عرض ٣٠ دقيقة مخصص لقطاعك وأولوياتك." : "30-minute walkthrough tailored to your sector and priorities."}
      successMsg={isAr ? "تم استلام طلبك بنجاح. سيتواصل معك فريق المؤسسات خلال ٢٤ ساعة." : "Your request has been received successfully. Our Enterprise Team will contact you within 24 hours."}
      fields={[
        { name: "name", label: isAr ? "الاسم الكامل" : "Full name", required: true },
        { name: "email", label: isAr ? "البريد الإلكتروني للعمل" : "Work email", type: "email", required: true },
        { name: "company", label: isAr ? "اسم الشركة" : "Company", required: true },
        { name: "role", label: isAr ? "المنصب" : "Role" },
        { name: "team_size", label: isAr ? "حجم الفريق" : "Team size" },
        { name: "notes", label: isAr ? "ماذا تريد أن ترى؟" : "What would you like to see?", textarea: true },
      ]}
      submitLabel={isAr ? "اطلب العرض" : "Request demo"}
    />
  );
}

type SuccessState = { request_id: string; email_delivered: boolean };

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  return "Unknown";
}
function detectDevice(ua: string): string {
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android Phone" : "Android Tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

export function FormShell({
  kind, isAr, eyebrow, title, subtitle, fields, successMsg, submitLabel,
}: {
  kind: "contact" | "demo" | "book";
  isAr: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  fields: { name: string; label: string; type?: string; textarea?: boolean; required?: boolean }[];
  successMsg: string;
  submitLabel: string;
}) {
  const submit = useServerFn(submitLead);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" && v.trim() ? v.trim() : null;
    };
    try {
      const known = new Set(["name", "email", "company", "role", "team_size", "notes"]);
      const metadata: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string" && !known.has(k) && v.trim()) metadata[k] = v.trim();
      }
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const language = typeof navigator !== "undefined" ? (navigator.language || null) : null;
      const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

      const res = await submit({
        data: {
          kind,
          name: get("name") ?? "",
          email: get("email") ?? "",
          company: get("company"),
          role: get("role"),
          team_size: get("team_size"),
          notes: get("notes") ?? get("message") ?? get("topic"),
          source: typeof window !== "undefined" ? window.location.pathname : null,
          language,
          browser: ua ? detectBrowser(ua) : null,
          device: ua ? detectDevice(ua) : null,
          timezone,
          metadata,
        },
      });
      form.reset();
      setSuccess({ request_id: res.request_id, email_delivered: res.email_delivered });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isAr ? "تعذر الإرسال" : "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#04060d] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_55%)]" />
      <header className="relative z-10 flex items-center justify-between px-4 py-3 md:px-10 md:py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-wide">NEXUS</span>
        </Link>
        <Link to="/demo" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          {isAr ? "مركز العرض" : "Demo Center"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-6 md:px-6 md:pt-12">
        {success ? (
          <SuccessCard isAr={isAr} successMsg={successMsg} state={success} />
        ) : (
          <>
            <div className="text-center">
              <div className="inline-block rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                <span className="text-gradient">{title}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:p-6">
              {fields.map((f) => (
                <div key={f.name}>
                  <label htmlFor={f.name} className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {f.label}{f.required && <span className="text-primary"> *</span>}
                  </label>
                  {f.textarea ? (
                    <textarea
                      id={f.name} name={f.name} required={f.required} rows={4} maxLength={4000}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
                    />
                  ) : (
                    <input
                      id={f.name} name={f.name} type={f.type ?? "text"} required={f.required}
                      maxLength={f.type === "email" ? 255 : 200}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
              >
                {submitting ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (
                  <>
                    <Send className="h-4 w-4" />
                    {submitLabel}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

function SuccessCard({ isAr, successMsg, state }: { isAr: boolean; successMsg: string; state: SuccessState }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mx-auto mt-6 max-w-xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-8 text-center backdrop-blur-xl md:p-10 animate-in fade-in zoom-in-95 duration-500">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.25),_transparent_60%)]" />
      <div className="relative">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <span className="absolute inset-2 rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">
          <span className="text-gradient">
            {isAr ? "تم استلام طلبك" : "Request received"}
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {successMsg}
        </p>

        <div className="mx-auto mt-6 inline-flex flex-col items-center gap-1 rounded-2xl border border-primary/30 bg-black/40 px-5 py-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80">
            {isAr ? "رقم الطلب" : "Request ID"}
          </span>
          <div className="flex items-center gap-2">
            <code className="font-mono text-base text-foreground">{state.request_id}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(state.request_id);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              aria-label="copy"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {copied && (
            <span className="text-[10px] text-primary">{isAr ? "تم النسخ" : "Copied"}</span>
          )}
        </div>

        {!state.email_delivered && (
          <p className="mt-4 text-[11px] text-muted-foreground/80">
            {isAr
              ? "تم حفظ الطلب. سنتولى التواصل معك حتى لو تأخّر بريد التأكيد."
              : "Your request is safely stored. We'll reach out even if the confirmation email is delayed."}
          </p>
        )}

        <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link to="/" className="rounded-xl border border-white/10 px-4 py-2 text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
            {isAr ? "العودة للرئيسية" : "Back to home"}
          </Link>
          <Link to="/demo" className="rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
            {isAr ? "استكشف مركز العرض" : "Explore Demo Center"}
          </Link>
        </div>
      </div>
    </div>
  );
}
