import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { submitLead } from "@/lib/leads.functions";
import { DOMAIN_URL } from "@/lib/domain";
import { ArrowLeft, Briefcase, Building2, Landmark, Calendar, ExternalLink, Check, Shield, Clock, Globe } from "lucide-react";

export const Route = createFileRoute("/executive-briefing")({
  head: () => ({
    meta: [
      { title: "Executive Briefing — Nexus AI OS" },
      { name: "description", content: "Schedule a private executive briefing of Nexus AI OS. For investors, enterprise boards, and government leaders. Calendly, Google Calendar, and Outlook ready." },
      { property: "og:title", content: "Executive Briefing — Nexus AI OS" },
      { property: "og:description", content: "Private live walkthrough for executives, investors, and government leaders." },
      { property: "og:url", content: `${DOMAIN_URL}/executive-briefing` },
      { property: "og:image", content: `${DOMAIN_URL}/og-image.jpg` },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/executive-briefing` }],
  }),
  component: ExecutiveBriefingPage,
});

type DemoKind = "investor" | "enterprise" | "government";

const CALENDLY_URL =
  (import.meta.env.VITE_CALENDLY_URL as string | undefined) ||
  "https://calendly.com/nexus-ai-os/executive-briefing";

/* ----------------------------- Calendar helpers ---------------------------- */

function toICSDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function buildEvent(kind: DemoKind, isAr: boolean) {
  const titles: Record<DemoKind, string> = {
    investor: isAr ? "عرض المستثمرين — NEXUS AI OS" : "Investor Briefing — NEXUS AI OS",
    enterprise: isAr ? "عرض المؤسسات — NEXUS AI OS" : "Enterprise Briefing — NEXUS AI OS",
    government: isAr ? "العرض الحكومي — NEXUS AI OS" : "Government Briefing — NEXUS AI OS",
  };
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  start.setHours(15);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const details = isAr
    ? "جلسة تنفيذية خاصة لعرض منصة NEXUS AI OS."
    : "Private executive session showcasing the NEXUS AI OS platform.";
  return { title: titles[kind], start, end, details, location: "Online · Secure Conference" };
}
function googleCalUrl(kind: DemoKind, isAr: boolean) {
  const e = buildEvent(kind, isAr);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toICSDate(e.start)}/${toICSDate(e.end)}`,
    details: e.details,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
function outlookUrl(kind: DemoKind, isAr: boolean) {
  const e = buildEvent(kind, isAr);
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    body: e.details,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    location: e.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}
function downloadICS(kind: DemoKind, isAr: boolean) {
  const e = buildEvent(kind, isAr);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NEXUS AI OS//Executive Briefing//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@nexus-ai-os`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.start)}`,
    `DTEND:${toICSDate(e.end)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${e.details}`,
    `LOCATION:${e.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexus-${kind}-briefing.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------- Page ----------------------------------- */

function ExecutiveBriefingPage() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [kind, setKind] = useState<DemoKind>("investor");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = useServerFn(submitLead);

  const kinds = useMemo(
    () => [
      {
        id: "investor" as const,
        icon: <Briefcase className="h-5 w-5" />,
        title: isAr ? "عرض المستثمرين" : "Investor Briefing",
        desc: isAr
          ? "نموذج العائد، المنافسة، وخطة التوسع."
          : "ROI model, competitive moat, and expansion roadmap.",
        duration: "45 min",
      },
      {
        id: "enterprise" as const,
        icon: <Building2 className="h-5 w-5" />,
        title: isAr ? "عرض المؤسسات" : "Enterprise Briefing",
        desc: isAr
          ? "ARIA Core، التوأم الرقمي، والأتمتة التنفيذية."
          : "ARIA Core, Digital Twin, and autonomous operations.",
        duration: "45 min",
      },
      {
        id: "government" as const,
        icon: <Landmark className="h-5 w-5" />,
        title: isAr ? "العرض الحكومي" : "Government Briefing",
        desc: isAr
          ? "السيادة الرقمية، الامتثال، ورؤية ٢٠٣٠."
          : "Sovereign architecture, compliance, and Vision 2030 alignment.",
        duration: "60 min",
      },
    ],
    [isAr],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const company = String(fd.get("company") || "").trim();
    const role = String(fd.get("role") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const team_size = String(fd.get("team_size") || "").trim();

    if (!name || !email || !company) {
      toast.error(isAr ? "يرجى إكمال الحقول المطلوبة." : "Please complete the required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          kind: "demo",
          name,
          email,
          company,
          role,
          team_size,
          notes: `Briefing type: ${kind}${phone ? ` · Phone: ${phone}` : ""}`,
          source: "executive-briefing",
          metadata: { briefing_kind: kind, phone },
        },
      });
      setSubmitted(true);
      toast.success(isAr ? "تم استلام طلبك التنفيذي." : "Your executive request has been received.");
    } catch (err) {
      toast.error(
        isAr
          ? "تعذّر الإرسال. حاول مرة أخرى."
          : err instanceof Error ? err.message : "Submission failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
      {/* Cinematic backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.06),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:56px_56px] opacity-25" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`h-4 w-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-xs uppercase tracking-[0.32em] text-amber-300/70">
          {isAr ? "الجلسة التنفيذية الخاصة" : "Private Executive Session"}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* Hero */}
        <section className="mb-12 max-w-3xl">
          <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? "جلسة تنفيذية مباشرة مع NEXUS" : "A private live briefing with NEXUS"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isAr
              ? "مخصصة لمجالس الإدارة، صناديق الاستثمار، والقيادة الحكومية. عرض حي لمنصة الذكاء التنفيذي، نموذج العائد، والجاهزية السيادية."
              : "Tailored for boards, investment funds, and government leadership. Live executive intelligence, ROI model, and sovereign-grade readiness."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-300/80" /> NDA-ready</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-300/80" /> 45–60 min</span>
            <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-amber-300/80" /> Riyadh · GMT+3</span>
          </div>
        </section>

        {/* Demo type selector */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {kinds.map((k) => {
            const active = kind === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`group relative overflow-hidden rounded-2xl border p-6 text-start transition ${
                  active
                    ? "border-amber-400/50 bg-amber-400/[0.06]"
                    : "border-white/10 bg-white/[0.02] hover:border-amber-400/25 hover:bg-white/[0.04]"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-amber-400/15 text-amber-200" : "bg-white/[0.04] text-muted-foreground"}`}>
                    {k.icon}
                  </span>
                  {active && <Check className="h-4 w-4 text-amber-300" />}
                </div>
                <h3 className="mt-4 text-base font-medium text-foreground">{k.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{k.desc}</p>
                <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">{k.duration}</div>
              </button>
            );
          })}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          {/* FORM */}
          <section className="rounded-2xl border border-amber-400/15 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-8">
            {submitted ? (
              <SuccessState isAr={isAr} kind={kind} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-amber-300/80">
                  {isAr ? "بيانات التواصل" : "Your details"}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field name="name" label={isAr ? "الاسم" : "Full Name"} required isAr={isAr} />
                  <Field name="company" label={isAr ? "الشركة" : "Company"} required isAr={isAr} />
                  <Field name="role" label={isAr ? "المنصب" : "Position"} placeholder={isAr ? "مثلاً: الرئيس التنفيذي" : "e.g. Chief Executive Officer"} isAr={isAr} />
                  <Field name="email" type="email" label={isAr ? "البريد الإلكتروني" : "Work Email"} required isAr={isAr} />
                  <Field name="phone" type="tel" label={isAr ? "الجوال" : "Phone"} placeholder="+966 5X XXX XXXX" isAr={isAr} />
                  <SelectField
                    name="team_size"
                    label={isAr ? "عدد الموظفين" : "Employee Count"}
                    isAr={isAr}
                    options={[
                      "1–50",
                      "51–250",
                      "251–1,000",
                      "1,001–5,000",
                      "5,001–20,000",
                      "20,000+",
                    ]}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-medium text-[#0a0a0f] transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-60"
                >
                  {submitting
                    ? (isAr ? "جارٍ الإرسال…" : "Submitting…")
                    : (isAr ? "احجز الجلسة التنفيذية" : "Request Executive Briefing")}
                </button>
                <p className="text-xs text-muted-foreground/70">
                  {isAr
                    ? "سنرد خلال ساعتين عمل بمواعيد مقترحة عبر القناة التي تختارها."
                    : "We reply within 2 business hours with proposed times via your preferred channel."}
                </p>
              </form>
            )}
          </section>

          {/* CALENDAR PANEL */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-amber-300/80">
                <Calendar className="h-4 w-4" />
                {isAr ? "اختر قناة الحجز" : "Book via your calendar"}
              </div>
              <div className="mt-5 space-y-3">
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-sm transition hover:bg-amber-400/[0.08]"
                >
                  <span className="font-medium text-amber-100">Calendly</span>
                  <ExternalLink className="h-4 w-4 text-amber-300/80 transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href={googleCalUrl(kind, isAr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/[0.05]"
                >
                  <span>Google Calendar</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href={outlookUrl(kind, isAr)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/[0.05]"
                >
                  <span>Microsoft Outlook</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </a>
                <button
                  onClick={() => downloadICS(kind, isAr)}
                  className="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/[0.05]"
                >
                  <span>{isAr ? "تنزيل ملف ICS" : "Download .ics file"}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground/70">
                {isAr
                  ? "ستفتح القناة المختارة في نافذة جديدة مع تفاصيل الجلسة جاهزة."
                  : "Your selected channel opens in a new window with the session pre-filled."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-400/[0.04] to-transparent p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-amber-300/80">
                {isAr ? "ما يميّز هذه الجلسة" : "What's included"}
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {[
                  isAr ? "عرض حي لـ ARIA Core والتوأم الرقمي" : "Live ARIA Core & Digital Twin demo",
                  isAr ? "نموذج مالي مخصص لمؤسستك" : "Custom financial model for your enterprise",
                  isAr ? "خارطة طريق للتطبيق والامتثال" : "Implementation & compliance roadmap",
                  isAr ? "ملف تنفيذي مغلق NDA" : "NDA-protected executive packet",
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* --------------------------------- Fields --------------------------------- */

function Field({
  name, label, type = "text", required, placeholder, isAr,
}: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string; isAr: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}{required && <span className="ms-1 text-amber-300">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        dir={isAr ? "rtl" : "ltr"}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-amber-400/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-amber-400/15"
      />
    </label>
  );
}

function SelectField({
  name, label, options, isAr,
}: { name: string; label: string; options: string[]; isAr: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-amber-400/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-amber-400/15"
      >
        <option value="" disabled>{isAr ? "اختر…" : "Select…"}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#0a0a0f]">{o}</option>
        ))}
      </select>
    </label>
  );
}

function SuccessState({ isAr, kind }: { isAr: boolean; kind: DemoKind }) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/[0.08]">
        <Check className="h-6 w-6 text-amber-300" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-foreground">
        {isAr ? "تم استلام طلبك التنفيذي" : "Your request has been received"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAr
          ? "سيتواصل معك فريق التطوير التنفيذي خلال ساعتين عمل بمواعيد مقترحة."
          : "Our executive team will reach out within 2 business hours with proposed times."}
      </p>
      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
        <a
          href={googleCalUrl(kind, isAr)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-amber-400/25 bg-amber-400/[0.05] px-4 py-2 text-xs text-amber-200 transition hover:bg-amber-400/[0.1]"
        >
          {isAr ? "أضف إلى Google" : "Add to Google"}
        </a>
        <a
          href={outlookUrl(kind, isAr)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-foreground transition hover:bg-white/[0.06]"
        >
          {isAr ? "أضف إلى Outlook" : "Add to Outlook"}
        </a>
      </div>
    </div>
  );
}
