import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { submitLead } from "@/lib/leads.functions";
import { Sparkles, ArrowLeft, Send } from "lucide-react";

export const Route = createFileRoute("/request-demo")({
  head: () => ({
    meta: [
      { title: "Request a Demo — Nexus AI OS" },
      { name: "description", content: "Request a personalized walkthrough of Nexus AI OS for your executive team." },
      { property: "og:title", content: "Request a Demo — Nexus AI OS" },
      { property: "og:description", content: "Personalized executive walkthrough tailored to your enterprise." },
    ],
  }),
  component: RequestDemoPage,
});

function RequestDemoPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  return (
    <FormShell
      isAr={isAr}
      eyebrow={isAr ? "اطلب عرضاً شخصياً" : "Request a Demo"}
      title={isAr ? "أرنا مؤسستك. سنُريك Nexus." : "Tell us about your enterprise. We'll show you Nexus."}
      subtitle={isAr ? "عرض ٣٠ دقيقة مخصص لقطاعك وأولوياتك." : "30-minute walkthrough tailored to your sector and priorities."}
      successMsg={isAr ? "تم استلام طلبك. سنتواصل خلال ٢٤ ساعة." : "Request received. We'll be in touch within 24 hours."}
      fields={[
        { name: "name", label: isAr ? "الاسم الكامل" : "Full name", required: true },
        { name: "email", label: isAr ? "البريد الإلكتروني للعمل" : "Work email", type: "email", required: true },
        { name: "company", label: isAr ? "اسم الشركة" : "Company", required: true },
        { name: "role", label: isAr ? "المنصب" : "Role" },
        { name: "size", label: isAr ? "حجم الفريق" : "Team size" },
        { name: "notes", label: isAr ? "ماذا تريد أن ترى؟" : "What would you like to see?", textarea: true },
      ]}
      submitLabel={isAr ? "اطلب العرض" : "Request demo"}
    />
  );
}

export function FormShell({
  isAr, eyebrow, title, subtitle, fields, successMsg, submitLabel,
}: {
  isAr: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  fields: { name: string; label: string; type?: string; textarea?: boolean; required?: boolean }[];
  successMsg: string;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // Lightweight client-side handler — stores nothing server-side beyond a toast.
    // Replace with a server fn / CRM webhook before production go-live.
    await new Promise((r) => setTimeout(r, 700));
    toast.success(successMsg);
    (e.currentTarget as HTMLFormElement).reset();
    setSubmitting(false);
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
                  id={f.name} name={f.name} required={f.required} rows={4}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
                />
              ) : (
                <input
                  id={f.name} name={f.name} type={f.type ?? "text"} required={f.required}
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
      </main>
    </div>
  );
}
