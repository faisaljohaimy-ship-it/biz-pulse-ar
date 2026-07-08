import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";

import {
  RotateCcw,
  Briefcase,
  TrendingUp,
  Users,
  Building2,
  ArrowRight,
  Sparkles,
  Phone,
  CalendarDays,
  Mail,
  Shield,
  Database,
  Brain,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo Center — NEXIOS | NEXUS AI OS" },
      {
        name: "description",
        content:
          "Explore NEXUS AI OS with a fully seeded executive demo. Investor mode, enterprise mode, guided tour, and live sample data.",
      },
      { property: "og:title", content: "Demo Center — NEXIOS | NEXUS AI OS" },
      {
        property: "og:description",
        content:
          "Experience the executive operating system with sample enterprise data, investor mode, and a guided product tour.",
      },
      { property: "og:url", content: "https://neexios.com/demo" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/demo" }],
  }),
  component: DemoCenter,
});

type Mode = "investor" | "enterprise";

function DemoCenter() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const navigate = useNavigate();

  function requestPersonalDemo(mode: Mode) {
    navigate({ to: "/request-demo", search: { mode } });
  }

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-[#04060d] text-foreground">
      {/* Atmospheric backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_hsl(220_70%_40%/0.15),_transparent_60%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 md:px-10 md:py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">NEXUS</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Demo Center
            </div>
          </div>
        </Link>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          {isAr ? "العودة للرئيسية" : "Back to home"}
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-4 md:px-10 md:pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {isAr ? "بيئة عرض مباشرة" : "Live Demo Environment"}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            <span className="text-gradient">{isAr ? "مركز عرض Nexus" : "Nexus Demo Center"}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            {isAr
              ? "اختر تجربة العرض المناسبة لك. كل بيئة محملة ببيانات تنفيذية واقعية من Fortune 500."
              : "Pick your experience. Every environment is preloaded with realistic Fortune-500 executive data."}
          </p>
        </div>

        {/* Mode cards */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ModeCard
            icon={Briefcase}
            tone="primary"
            title={isAr ? "وضع المستثمر" : "Investor Mode"}
            subtitle={
              isAr ? "العرض التنفيذي · غرفة مجلس الإدارة" : "Executive showcase · Boardroom view"
            }
            bullets={
              isAr
                ? [
                    "مؤشرات الأداء الحية",
                    "موجز الفرص والمخاطر",
                    "قرارات مجلس الإدارة",
                    "محاكاة العرض الاستثماري",
                  ]
                : [
                    "Live KPI walls",
                    "Risk & opportunity briefs",
                    "Boardroom decisions",
                    "Investor pitch simulation",
                  ]
            }
            cta={isAr ? "ادخل كمستثمر" : "Enter as Investor"}
            onClick={() => requestPersonalDemo("investor")}
          />
          <ModeCard
            icon={Building2}
            tone="accent"
            title={isAr ? "وضع المؤسسة" : "Enterprise Mode"}
            subtitle={
              isAr ? "العمليات الكاملة · المسؤول التنفيذي" : "Full operations · C-suite operator"
            }
            bullets={
              isAr
                ? [
                    "كل الوحدات مفتوحة",
                    "بيانات تشغيلية كاملة",
                    "محرك التنفيذ نشط",
                    "ذكاء اصطناعي تفاعلي",
                  ]
                : [
                    "All modules unlocked",
                    "Full operational data",
                    "Execution engine live",
                    "Interactive AI agents",
                  ]
            }
            cta={isAr ? "ادخل كمدير تنفيذي" : "Enter as Executive"}
            onClick={() => requestPersonalDemo("enterprise")}
          />
        </div>

        {/* Reset */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => navigate({ to: "/request-demo", search: { mode: "enterprise" } })}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-emerald-400/40 disabled:opacity-50"
          >
            <Database className="h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {isAr ? "اطلب بيئة مخصصة" : "Request a tailored environment"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isAr ? "مهيأة لقطاعك وبياناتك" : "Configured for your sector and data"}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>

          <button
            onClick={() => navigate({ to: "/book" })}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-amber-400/40 disabled:opacity-50"
          >
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {isAr ? "احجز جلسة تنفيذية" : "Book an executive session"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isAr ? "مراجعة مباشرة مع الفريق" : "Live review with the team"}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>
        </div>

        {/* Sample accounts */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {isAr ? "حسابات تنفيذية للعرض" : "Sample Executive Accounts"}
            </h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                role: "CEO",
                name: "Executive Director",
                email: "Personalized access",
                icon: TrendingUp,
              },
              {
                role: "CFO",
                name: "Finance Leadership",
                email: "Controlled workspace",
                icon: Activity,
              },
              {
                role: "CTO",
                name: "Technology Leadership",
                email: "Secure onboarding",
                icon: Brain,
              },
            ].map((a) => (
              <div key={a.role} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {a.role}
                  </span>
                  <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="mt-1.5 text-sm font-semibold">{a.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{a.email}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            {isAr
              ? "كل حسابات العرض معزولة عن بيانات العميل الحقيقية"
              : "All demo accounts are sandboxed from production customer data"}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {isAr ? "جاهز للخطوة التالية؟" : "Ready for the next step?"}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <CtaCard
              to="/request-demo"
              icon={Sparkles}
              title={isAr ? "اطلب عرضاً شخصياً" : "Request Demo"}
              desc={isAr ? "عرض مخصص لمؤسستك" : "Personalized to your enterprise"}
            />
            <CtaCard
              to="/contact"
              icon={Mail}
              title={isAr ? "تواصل مع المبيعات" : "Contact Sales"}
              desc={isAr ? "حلول مؤسسية وأسعار" : "Enterprise & pricing"}
              primary
            />
            <CtaCard
              to="/book"
              icon={CalendarDays}
              title={isAr ? "احجز اجتماعاً" : "Book Meeting"}
              desc={isAr ? "٣٠ دقيقة مع متخصص" : "30 min with a specialist"}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  tone,
  title,
  subtitle,
  bullets,
  cta,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent";
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  onClick: () => void;
}) {
  const ring =
    tone === "primary"
      ? "border-primary/40 hover:border-primary"
      : "border-accent/40 hover:border-accent";
  const grad =
    tone === "primary" ? "bg-gradient-primary" : "bg-gradient-to-br from-accent to-primary";
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${ring} bg-white/[0.03] p-6 backdrop-blur-xl transition`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40"
        style={{ background: tone === "primary" ? "hsl(var(--primary))" : "hsl(var(--accent))" }}
      />
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${grad} shadow-glow`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
            {b}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl ${grad} px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CtaCard({
  to,
  icon: Icon,
  title,
  desc,
  primary,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to as "/"}
      className={`group flex items-center gap-3 rounded-xl border p-4 transition ${
        primary
          ? "border-primary/50 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
          : "border-white/10 bg-white/[0.03] hover:border-primary/40"
      }`}
    >
      <Icon className={`h-5 w-5 ${primary ? "text-primary-foreground" : "text-primary"}`} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div
          className={`text-[11px] ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {desc}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </Link>
  );
}
