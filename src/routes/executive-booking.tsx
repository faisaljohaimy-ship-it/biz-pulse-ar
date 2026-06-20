import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { DOMAIN_URL } from "@/lib/domain";
import { submitLead } from "@/lib/leads.functions";
import { ArrowLeft, Calendar, Crown, Landmark, Briefcase, Users2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/executive-booking")({
  head: () => ({
    meta: [
      { title: "Executive Booking Center — NEXUS AI OS" },
      { name: "description", content: "Book a confidential executive briefing, investor meeting, government brief, or enterprise discovery session with the NEXUS team." },
      { property: "og:title", content: "Executive Booking Center — NEXUS AI OS" },
      { property: "og:url", content: `${DOMAIN_URL}/executive-booking` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/executive-booking` }],
  }),
  component: ExecutiveBookingPage,
});

type Track = "executive" | "investor" | "government" | "enterprise";

function ExecutiveBookingPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const submit = useServerFn(submitLead);

  const [track, setTrack] = useState<Track>("executive");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const tracks: { id: Track; icon: React.ReactNode; title: string; sub: string; sla: string }[] = [
    { id: "executive",  icon: <Crown className="h-5 w-5" />,     title: isAr ? "عرض تنفيذي خاص" : "Executive Briefing",     sub: isAr ? "جلسة 45 دقيقة على مستوى C-Suite" : "45-minute private session for C-suite", sla: isAr ? "خلال 48 ساعة" : "Within 48 hours" },
    { id: "investor",   icon: <Briefcase className="h-5 w-5" />, title: isAr ? "اجتماع مستثمر" : "Investor Meeting",         sub: isAr ? "Series A · مستثمرون مؤسسيون" : "Series A · institutional investors", sla: isAr ? "خلال 72 ساعة" : "Within 72 hours" },
    { id: "government", icon: <Landmark className="h-5 w-5" />,  title: isAr ? "إحاطة حكومية" : "Government Brief",          sub: isAr ? "على مستوى الوزراء والقيادات" : "Minister-level briefing", sla: isAr ? "خلال 5 أيام عمل" : "Within 5 business days" },
    { id: "enterprise", icon: <Users2 className="h-5 w-5" />,    title: isAr ? "اكتشاف مؤسسي" : "Enterprise Discovery",      sub: isAr ? "للمؤسسات الكبرى والقطاعات الحساسة" : "Large enterprise & regulated sectors", sla: isAr ? "خلال 3 أيام عمل" : "Within 3 business days" },
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const company = String(fd.get("company") || "").trim();
    const role = String(fd.get("role") || "").trim();
    const notes = String(fd.get("notes") || "").trim();
    const when = String(fd.get("when") || "").trim();
    if (!name || !email) {
      toast.error(isAr ? "الاسم والبريد مطلوبان" : "Name and email are required");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          kind: track === "executive" ? "book" : track === "investor" ? "contact" : "demo",
          name, email,
          company: company || null,
          role: role || null,
          notes: notes || null,
          source: `executive-booking:${track}`,
          metadata: { track, preferred_time: when || null, locale },
        },
      });
      setDone(true);
      toast.success(isAr ? "تم استلام طلبك. سيتواصل معك فريقنا التنفيذي." : "Request received. Our executive team will reach out.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:48px_48px] opacity-30" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-xs uppercase tracking-[0.32em] text-amber-300/70">
          {isAr ? "مركز الحجز التنفيذي" : "Executive Booking Center"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <section className="mb-10 max-w-3xl">
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "احجز جلسة تنفيذية خاصة" : "Book a private executive session"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "تجربة VIP للمسؤولين التنفيذيين، المستثمرين، والقيادات الحكومية. كل طلب يُعالَج بسرّية تامة من فريق العملاء التنفيذيين."
              : "A VIP track for executives, investors, and government leaders. Every request is handled in strict confidence by our executive accounts team."}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          {/* Track picker */}
          <aside className="space-y-3">
            {tracks.map((t) => {
              const active = t.id === track;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrack(t.id)}
                  className={`w-full rounded-2xl border p-5 text-start transition ${
                    active
                      ? "border-amber-400/40 bg-amber-400/[0.06]"
                      : "border-white/10 bg-white/[0.02] hover:border-amber-400/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-lg border ${active ? "border-amber-400/40 text-amber-300" : "border-white/10 text-muted-foreground"}`}>
                      {t.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.sub}</div>
                    </div>
                  </div>
                  <div className={`mt-3 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] ${active ? "text-amber-300" : "text-muted-foreground"}`}>
                    <Calendar className="h-3 w-3" /> {t.sla}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Form / confirmation */}
          <section className="rounded-2xl border border-amber-400/15 bg-white/[0.02] p-6 backdrop-blur-xl">
            {done ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-12 w-12 text-amber-300" />
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                  {isAr ? "تم استلام طلبك بنجاح" : "Your request was received"}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {isAr
                    ? "سيتواصل معك مدير الحسابات التنفيذية مباشرةً لتأكيد الموعد عبر التقويم الخاص بك."
                    : "An executive account director will reach out shortly to confirm a time on your calendar."}
                </p>
                <div className="mt-6 flex gap-3">
                  <Link to="/data-room" className="rounded-lg border border-amber-400/30 px-4 py-2 text-sm text-amber-200/90 hover:bg-amber-400/5">
                    {isAr ? "غرفة البيانات التنفيذية" : "Open Data Room"}
                  </Link>
                  <Link to="/demo-videos" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/5">
                    {isAr ? "مشاهدة العروض" : "Watch Demos"}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <h2 className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-amber-300/80">
                  {isAr ? "تفاصيل الطلب" : "Request Details"}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field name="name" label={isAr ? "الاسم الكامل" : "Full name"} required />
                  <Field name="email" type="email" label={isAr ? "البريد التنفيذي" : "Executive email"} required />
                  <Field name="company" label={isAr ? "الجهة / الشركة" : "Organization"} />
                  <Field name="role" label={isAr ? "المنصب" : "Title / Role"} />
                  <Field name="when" label={isAr ? "الوقت المفضّل" : "Preferred time"} placeholder={isAr ? "مثال: الثلاثاء ١٠ صباحاً" : "e.g. Tue 10am KSA"} />
                  <Field name="phone" label={isAr ? "هاتف (اختياري)" : "Phone (optional)"} />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {isAr ? "ملاحظات سرّية" : "Confidential notes"}
                  </label>
                  <textarea
                    name="notes"
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-400/40 focus:outline-none"
                    placeholder={isAr ? "السياق، الأولويات، الحاضرون، أي قيود تفضّلها." : "Context, priorities, attendees, constraints."}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-medium text-[#0a0a0f] transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-60"
                >
                  {busy
                    ? (isAr ? "جاري الإرسال…" : "Submitting…")
                    : (isAr ? "تأكيد الحجز التنفيذي" : "Confirm Executive Booking")}
                </button>
                <p className="text-xs text-muted-foreground/70">
                  {isAr
                    ? "تُعالَج جميع الطلبات بسرّية تامة وفق سياسات الخصوصية واتفاقية معالجة البيانات (DPA)."
                    : "All requests are handled in strict confidence under our Privacy Policy and DPA."}
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ name, label, type = "text", required, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}{required && <span className="text-amber-300"> *</span>}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-amber-400/40 focus:outline-none"
      />
    </div>
  );
}
