import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExecutivePresentationPlayer } from "@/components/demo/ExecutivePresentationPlayer";
import {
  clearExecutiveAcceptance,
  hasExecutiveAcceptance,
  recordExecutiveAcceptance,
} from "@/lib/access/executive-acceptance";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [accepted, setAccepted] = useState(() =>
    typeof window === "undefined" ? false : hasExecutiveAcceptance(window.localStorage),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const goNext = () => {
    const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/command-center";
    navigate({ to: target, replace: true });
  };

  useEffect(() => {
    if (!authLoading && user) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? (isAr ? "تعذّر الدخول" : "Google sign-in failed"));
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isAr ? "تعذّر الدخول" : "Sign-in error");
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      goNext();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : isAr ? "خطأ في المصادقة" : "Authentication error",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!accepted) {
    return (
      <ExecutiveAcceptanceStage
        isAr={isAr}
        onAccept={() => {
          recordExecutiveAcceptance(window.localStorage);
          setAccepted(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="nexus-identity-stage relative min-h-[100svh] overflow-hidden text-foreground"
    >
      <IdentityAtmosphere />
      <main className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-6xl items-center gap-8 px-4 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <section className="hidden lg:block">
          <BrandLockup isAr={isAr} />
          <div className="mt-10 grid max-w-xl gap-3">
            {[
              {
                icon: ShieldCheck,
                ar: "مساحة مؤسسية محمية وعزل كامل للصلاحيات",
                en: "Protected enterprise workspace with role isolation",
              },
              {
                icon: Fingerprint,
                ar: "كل إجراء حساس موثّق وقابل للمراجعة",
                en: "Every sensitive action is traceable and reviewable",
              },
              {
                icon: Sparkles,
                ar: "آريا جاهزة للعمل بعد التحقق من الهوية",
                en: "ARIA activates after identity verification",
              },
            ].map((item) => (
              <div
                key={item.en}
                className="nexus-floating-surface flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/78">{isAr ? item.ar : item.en}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="nexus-window relative mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
          {/* Mobile parity: the brand identity + trust points shown in the side
              panel on large screens, as a compact strip on small screens. */}
          <div className="mb-5 lg:hidden">
            <span className="nexus-command-chip">
              <Crown className="h-3.5 w-3.5" /> NEXIOS · SOVEREIGN INTELLIGENCE
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { icon: ShieldCheck, ar: "مساحة مؤسسية محمية", en: "Protected workspace" },
                { icon: Fingerprint, ar: "كل إجراء موثّق", en: "Every action traceable" },
                { icon: Sparkles, ar: "آريا بعد التحقق", en: "ARIA after verification" },
              ].map((item) => (
                <span
                  key={item.en}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-white/70"
                >
                  <item.icon className="h-3 w-3 text-primary" />
                  {isAr ? item.ar : item.en}
                </span>
              ))}
            </div>
          </div>
          <div className="mb-6 text-center">
            <span className="nexus-command-chip">
              <Check className="h-3.5 w-3.5" />
              {isAr ? "تم قبول العرض" : "Presentation accepted"}
            </span>
            <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_42px_rgba(0,212,255,.24)]">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {isAr ? "الدخول الآمن للنظام" : "Secure platform access"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              {isAr
                ? "تظهر بيانات الدخول الآن فقط بعد اكتمال العرض وقبول الانتقال إلى التفعيل."
                : "Credentials appear only after the presentation and explicit activation acceptance."}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={busy}
            className="h-12 w-full bg-white text-slate-900 hover:bg-slate-100"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            {isAr ? "المتابعة عبر Google" : "Continue with Google"}
          </Button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
            <span className="h-px flex-1 bg-white/10" />
            {isAr ? "أو" : "or"}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs text-white/60">
                {isAr ? "البريد المؤسسي" : "Work email"}
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 h-12"
                autoComplete="email"
                inputMode="email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs text-white/60">
                {isAr ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 h-12"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full text-sm font-black">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {isAr ? "دخول مساحة القيادة" : "Enter command workspace"}
            </Button>
          </form>

          <div className="mt-5 grid gap-2 border-t border-white/8 pt-4 text-center">
            <Link
              to="/request-demo"
              className="text-xs font-semibold text-primary hover:text-[#3AE8FF]"
            >
              {isAr
                ? "ليس لديك حساب؟ اطلب تفعيلًا مؤسسيًا"
                : "No account? Request enterprise activation"}
            </Link>
            <button
              type="button"
              onClick={() => {
                clearExecutiveAcceptance(window.localStorage);
                setAccepted(false);
              }}
              className="text-[11px] text-white/40 transition hover:text-white/75"
            >
              {isAr ? "إعادة مشاهدة العرض" : "Watch the presentation again"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ExecutiveAcceptanceStage({ isAr, onAccept }: { isAr: boolean; onAccept: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="nexus-identity-stage relative min-h-[100svh] overflow-hidden text-white"
    >
      <IdentityAtmosphere />
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_30px_rgba(0,212,255,.2)]">
            <img src="/nexus-icon.png" alt="NEXIOS" className="h-full w-full object-cover" />
          </span>
          <span>
            <span className="block text-sm font-black tracking-[0.18em]">NEXIOS</span>
            <span className="block text-[9px] uppercase tracking-[0.22em] text-primary/75">
              Executive Access
            </span>
          </span>
        </Link>
        <Link to="/" className="nexus-command-chip hover:border-primary/55">
          {isAr ? "العودة" : "Back"}
          <Arrow className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
        <section className="mx-auto max-w-4xl text-center">
          <span className="nexus-command-chip border-emerald-300/30 bg-emerald-300/8 text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAr ? "عرض مفتوح · لا يتطلب حسابًا" : "Open presentation · No account required"}
          </span>
          <h1 className="nexus-hero-title mx-auto mt-6 max-w-4xl text-balance text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
            {isAr
              ? "شاهد النظام أولًا. ثم قرّر. ثم ادخل."
              : "See the system. Make the decision. Then enter."}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
            {isAr
              ? "لن نطلب بريدًا أو كلمة مرور قبل أن تشاهد العرض التنفيذي وتؤكد رغبتك في الانتقال إلى التفعيل المؤسسي."
              : "We do not ask for credentials before you view the executive presentation and explicitly choose enterprise activation."}
          </p>
        </section>

        <ol className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { n: "01", ar: "مشاهدة العرض", en: "View", icon: Sparkles },
            { n: "02", ar: "قبول الانتقال", en: "Accept", icon: Check },
            { n: "03", ar: "الدخول الآمن", en: "Secure access", icon: LockKeyhole },
          ].map((step, index) => (
            <li
              key={step.n}
              className="nexus-card relative flex items-center gap-3 rounded-2xl p-4"
            >
              <span className="font-mono text-[10px] text-primary/55">{step.n}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/25 bg-primary/8 text-primary">
                <step.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{isAr ? step.ar : step.en}</span>
                <span className="block text-[9px] uppercase tracking-[0.18em] text-white/35">
                  {index === 0 ? "OPEN" : index === 1 ? "EXPLICIT" : "PROTECTED"}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <section className="nexus-window relative mx-auto mt-8 max-w-6xl overflow-hidden rounded-[2rem] p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-65" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                {isAr ? "العرض التنفيذي بصوت آريا" : "Executive presentation · ARIA narration"}
              </span>
            </div>
            <span className="nexus-command-chip">ARIA · LIVE EXPERIENCE</span>
          </div>
          <ExecutivePresentationPlayer />
        </section>

        <section className="nexus-window relative mx-auto mt-6 max-w-3xl overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/35 bg-amber-300/10 text-amber-200 shadow-[0_0_32px_rgba(245,197,96,.16)] sm:mx-0">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black sm:text-xl">
                {isAr ? "قبول الانتقال إلى التفعيل" : "Accept the activation transition"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-white/58">
                {isAr
                  ? "هذا الإقرار لا يمثل شراءً أو عقدًا ماليًا؛ إنه يؤكد فقط أنك شاهدت العرض وترغب في فتح مرحلة الدخول المؤسسي المحمية."
                  : "This is not a purchase or commercial contract. It only confirms that you viewed the presentation and want to open the protected enterprise-access stage."}
              </p>
              <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-white/78 transition hover:border-primary/30">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                />
                <span>
                  {isAr
                    ? "شاهدت العرض وأرغب بالانتقال إلى مرحلة التفعيل والدخول الآمن."
                    : "I viewed the presentation and want to continue to activation and secure access."}
                </span>
              </label>
              <Button
                type="button"
                size="lg"
                disabled={!confirmed}
                onClick={onAccept}
                className="mt-4 h-12 w-full text-sm font-black sm:w-auto"
              >
                <Check className="h-4 w-4" />
                {isAr ? "أقبل وأنتقل للدخول" : "Accept and continue to access"}
                <Arrow className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function BrandLockup({ isAr }: { isAr: boolean }) {
  return (
    <div className="max-w-2xl">
      <span className="nexus-command-chip">
        <Crown className="h-3.5 w-3.5" /> NEXIOS · SOVEREIGN INTELLIGENCE
      </span>
      <h2 className="nexus-hero-title mt-6 text-4xl font-black leading-tight xl:text-6xl">
        {isAr ? "الذكاء، تحت القيادة." : "Intelligence, under command."}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-8 text-white/58">
        {isAr
          ? "هوية تنفيذية سعودية، قرار موثّق، وآريا تعمل داخل حدود الصلاحية البشرية."
          : "Saudi executive identity, governed decisions, and ARIA operating inside human authority."}
      </p>
    </div>
  );
}

function IdentityAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="nexus-identity-grid absolute inset-0" />
      <div className="nexus-identity-aurora absolute -left-[15%] -top-[25%] h-[70vw] w-[70vw] rounded-full" />
      <div className="nexus-identity-aurora nexus-identity-aurora-secondary absolute -bottom-[35%] -right-[20%] h-[65vw] w-[65vw] rounded-full" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent shadow-[0_0_24px_rgba(0,212,255,.7)]" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
