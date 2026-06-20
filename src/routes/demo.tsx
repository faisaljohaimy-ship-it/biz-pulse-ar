import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";
import { seedDemoData, resetDemoData } from "@/lib/demo-seed.functions";
import { GuidedTour, type TourStep } from "@/components/guided-tour";
import {
  PlayCircle, RotateCcw, Briefcase, TrendingUp, Users, Building2,
  ArrowRight, Sparkles, Phone, CalendarDays, Mail, Shield, Database,
  Brain, Activity,
} from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo Center — NEEXIOS | NEXUS AI OS" },
      { name: "description", content: "Explore NEXUS AI OS with a fully seeded executive demo. Investor mode, enterprise mode, guided tour, and live sample data." },
      { property: "og:title", content: "Demo Center — NEEXIOS | NEXUS AI OS" },
      { property: "og:description", content: "Experience the executive operating system with sample enterprise data, investor mode, and a guided product tour." },
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

  const ensure = useServerFn(ensureDemoUser);
  const seed = useServerFn(seedDemoData);
  const reset = useServerFn(resetDemoData);

  const [busy, setBusy] = useState<null | "investor" | "enterprise" | "reset" | "seed">(null);
  const [tourOpen, setTourOpen] = useState(false);

  const tourSteps: TourStep[] = isAr
    ? [
        { title: "أهلاً بك في Nexus AI OS", body: "نظام التشغيل التنفيذي للمؤسسة. سنأخذك في جولة سريعة عبر الميزات الرئيسية." },
        { title: "الكوكبيت التنفيذي", body: "لوحة قيادة حية تعرض المؤشرات المالية، التشغيلية والمخاطر في الوقت الفعلي." },
        { title: "ذكاء القرار", body: "ذكاء اصطناعي يحول البيانات إلى توصيات تنفيذية قابلة للتطبيق." },
        { title: "محرك التنفيذ", body: "من قرار مجلس الإدارة إلى مهمة منجزة — دون فقدان أي التزام." },
        { title: "غرفة مجلس الإدارة", body: "وضع العرض التنفيذي للاجتماعات الاستراتيجية مع تتبع كامل." },
        { title: "جاهز للانطلاق", body: "ادخل الآن إلى نسخة العرض الحية واستكشف بنفسك." },
      ]
    : [
        { title: "Welcome to Nexus AI OS", body: "The executive operating system for the enterprise. We'll walk you through the core capabilities in under a minute." },
        { title: "Executive Cockpit", body: "A live dashboard surfacing financial, operational, and risk signals in real time." },
        { title: "Decision Intelligence", body: "AI that turns enterprise data into actionable executive recommendations." },
        { title: "Execution Engine", body: "From boardroom decision to completed task — without losing a single commitment." },
        { title: "Boardroom Mode", body: "Executive presentation mode for strategic meetings with full traceability." },
        { title: "You're ready", body: "Enter the live demo environment and explore it yourself." },
      ];

  async function enterAs(mode: Mode) {
    setBusy(mode);
    try {
      await ensure();
      await seed();
      const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      if (error) throw error;
      toast.success(isAr ? "تم تجهيز بيئة العرض" : "Demo environment ready");
      // Investor jumps to boardroom; enterprise jumps to dashboard
      navigate({ to: mode === "investor" ? "/boardroom" : "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enter demo");
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setBusy("reset");
    try {
      await reset();
      toast.success(isAr ? "تمت إعادة تعيين بيانات العرض" : "Demo data reset");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleReseed() {
    setBusy("seed");
    try {
      await ensure();
      await seed();
      toast.success(isAr ? "تم تحميل بيانات العرض الجديدة" : "Fresh demo data loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(null);
    }
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
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Demo Center</div>
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
            subtitle={isAr ? "العرض التنفيذي · غرفة مجلس الإدارة" : "Executive showcase · Boardroom view"}
            bullets={
              isAr
                ? ["مؤشرات الأداء الحية", "موجز الفرص والمخاطر", "قرارات مجلس الإدارة", "محاكاة العرض الاستثماري"]
                : ["Live KPI walls", "Risk & opportunity briefs", "Boardroom decisions", "Investor pitch simulation"]
            }
            cta={isAr ? "ادخل كمستثمر" : "Enter as Investor"}
            loading={busy === "investor"}
            onClick={() => enterAs("investor")}
          />
          <ModeCard
            icon={Building2}
            tone="accent"
            title={isAr ? "وضع المؤسسة" : "Enterprise Mode"}
            subtitle={isAr ? "العمليات الكاملة · المسؤول التنفيذي" : "Full operations · C-suite operator"}
            bullets={
              isAr
                ? ["كل الوحدات مفتوحة", "بيانات تشغيلية كاملة", "محرك التنفيذ نشط", "ذكاء اصطناعي تفاعلي"]
                : ["All modules unlocked", "Full operational data", "Execution engine live", "Interactive AI agents"]
            }
            cta={isAr ? "ادخل كمدير تنفيذي" : "Enter as Executive"}
            loading={busy === "enterprise"}
            onClick={() => enterAs("enterprise")}
          />
        </div>

        {/* Tour + Reset */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button
            onClick={() => setTourOpen(true)}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-primary/40"
          >
            <PlayCircle className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{isAr ? "ابدأ الجولة الإرشادية" : "Start Guided Tour"}</div>
              <div className="text-[11px] text-muted-foreground">{isAr ? "٦ خطوات · دقيقة واحدة" : "6 steps · ~1 minute"}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>

          <button
            onClick={handleReseed}
            disabled={busy !== null}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-emerald-400/40 disabled:opacity-50"
          >
            <Database className="h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{isAr ? "تحميل بيانات عرض جديدة" : "Load Fresh Demo Data"}</div>
              <div className="text-[11px] text-muted-foreground">{busy === "seed" ? (isAr ? "جارٍ التحميل..." : "Loading...") : (isAr ? "Fortune-500 snapshot" : "Fortune-500 snapshot")}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>

          <button
            onClick={handleReset}
            disabled={busy !== null}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-amber-400/40 disabled:opacity-50"
          >
            <RotateCcw className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{isAr ? "إعادة تعيين بيانات العرض" : "Reset Demo Data"}</div>
              <div className="text-[11px] text-muted-foreground">{busy === "reset" ? (isAr ? "جارٍ الحذف..." : "Resetting...") : (isAr ? "مسح آمن وكامل" : "Safe full wipe")}</div>
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
              { role: "CEO", name: "Demo Executive", email: DEMO_EMAIL, icon: TrendingUp },
              { role: "CFO", name: "Sarah Chen", email: "cfo.demo@nexus.app", icon: Activity },
              { role: "CTO", name: "Amir Hassan", email: "cto.demo@nexus.app", icon: Brain },
            ].map((a) => (
              <div key={a.role} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">{a.role}</span>
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
            <CtaCard to="/request-demo" icon={Sparkles} title={isAr ? "اطلب عرضاً شخصياً" : "Request Demo"} desc={isAr ? "عرض مخصص لمؤسستك" : "Personalized to your enterprise"} />
            <CtaCard to="/contact" icon={Mail} title={isAr ? "تواصل مع المبيعات" : "Contact Sales"} desc={isAr ? "حلول مؤسسية وأسعار" : "Enterprise & pricing"} primary />
            <CtaCard to="/book" icon={CalendarDays} title={isAr ? "احجز اجتماعاً" : "Book Meeting"} desc={isAr ? "٣٠ دقيقة مع متخصص" : "30 min with a specialist"} />
          </div>
        </div>
      </main>

      <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)} steps={tourSteps} isAr={isAr} />
    </div>
  );
}

function ModeCard({
  icon: Icon, tone, title, subtitle, bullets, cta, loading, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent";
  title: string;
  subtitle: string;
  bullets: string[];
  cta: string;
  loading: boolean;
  onClick: () => void;
}) {
  const ring = tone === "primary" ? "border-primary/40 hover:border-primary" : "border-accent/40 hover:border-accent";
  const grad = tone === "primary" ? "bg-gradient-primary" : "bg-gradient-to-br from-accent to-primary";
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${ring} bg-white/[0.03] p-6 backdrop-blur-xl transition`}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40" style={{ background: tone === "primary" ? "hsl(var(--primary))" : "hsl(var(--accent))" }} />
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
        disabled={loading}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl ${grad} px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60`}
      >
        {loading ? (isAr() ? "جارٍ التحضير..." : "Preparing...") : cta}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

function isAr() {
  // Local helper for the button label fallback when locale not in scope.
  if (typeof document === "undefined") return false;
  return document.documentElement.dir === "rtl";
}

function CtaCard({
  to, icon: Icon, title, desc, primary,
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
      className={`group flex items-center gap-3 rounded-xl border p-4 transition ${primary
        ? "border-primary/50 bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
        : "border-white/10 bg-white/[0.03] hover:border-primary/40"}`}
    >
      <Icon className={`h-5 w-5 ${primary ? "text-primary-foreground" : "text-primary"}`} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className={`text-[11px] ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </Link>
  );
}
