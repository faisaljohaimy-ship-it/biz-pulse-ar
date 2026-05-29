import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  Cpu,
  Globe2,
  Lock,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LaunchExperience,
});

function LaunchExperience() {
  const { user, loading } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // If already authenticated, bypass the launch entirely.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAr = locale === "ar";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05060d] text-foreground">
      {/* === Digital twin background === */}
      <DigitalTwinScene />

      {/* === Top bar === */}
      <header className="relative z-20 flex items-center justify-between px-5 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            <span className="absolute inset-0 animate-ping rounded-xl bg-primary/30" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-foreground">NEXUS</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Operating System</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-300">
              {isAr ? "النظام مباشر" : "Systems Live"}
            </span>
          </div>
          <button
            onClick={() => setLocale(isAr ? "en" : "ar")}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur hover:text-foreground"
          >
            {t("lang.toggle")}
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-5 pt-6 pb-24 md:px-10 md:pt-16">
        <div className="mb-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {isAr ? "منصة تنفيذية معتمدة" : "Fortune 500 Executive Platform"}
          </span>
        </div>

        <h1 className="max-w-4xl text-center text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          <span className="text-gradient">
            {isAr ? "نظام التشغيل التنفيذي" : "The Executive Operating"}
          </span>
          <br />
          <span className="text-foreground">
            {isAr ? "للذكاء المؤسسي" : "System for the Enterprise"}
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground md:text-base">
          {isAr
            ? "ذاكرة المؤسسة، محرك التنفيذ، وذكاء القرار — في توأم رقمي حي يعمل على مدار الساعة."
            : "Organizational memory, execution engine, and decision intelligence — unified in a live digital twin that never sleeps."}
        </p>

        {/* CTA */}
        <div className="mt-9 flex flex-col items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="group relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative flex items-center gap-2.5">
              <Rocket className="h-4 w-4" />
              {isAr ? "ادخل مركز القيادة" : "Enter Command Center"}
              <span className="text-base leading-none">{isAr ? "←" : "→"}</span>
            </span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Lock className="h-3 w-3" />
            {isAr ? "تشفير من الطرف إلى الطرف · تحقق متعدد العوامل" : "End-to-end encrypted · Multi-factor verified"}
          </div>
        </div>

        {/* Live metrics strip */}
        <LiveMetricsStrip isAr={isAr} />

        {/* Intelligence pillars */}
        <PillarsGrid isAr={isAr} />
      </main>

      {/* === Auth Modal === */}
      <AuthModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

/* ============================================================
   Digital Twin Background Scene
   ============================================================ */
function DigitalTwinScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Radial gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_hsl(220_70%_40%/0.15),_transparent_60%)]" />

      {/* Animated grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          animation: "nexus-grid-pan 24s linear infinite",
        }}
      />

      {/* Orbiting rings (SVG, no WebGL) */}
      <svg
        className="absolute left-1/2 top-1/2 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2 opacity-50"
        viewBox="0 0 800 800"
      >
        <defs>
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <circle cx="400" cy="400" r="140" fill="url(#coreGrad)" />

        {[180, 240, 310, 380].map((r, i) => (
          <g
            key={r}
            style={{
              transformOrigin: "400px 400px",
              animation: `nexus-orbit ${28 + i * 8}s linear ${i % 2 ? "reverse" : "normal"} infinite`,
            }}
          >
            <circle
              cx="400"
              cy="400"
              r={r}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={1.2}
              strokeDasharray="4 8"
              opacity={0.7 - i * 0.1}
            />
            {/* node dots on the ring */}
            {Array.from({ length: 6 }).map((_, j) => {
              const angle = (j / 6) * Math.PI * 2;
              const cx = 400 + Math.cos(angle) * r;
              const cy = 400 + Math.sin(angle) * r;
              return (
                <circle
                  key={j}
                  cx={cx}
                  cy={cy}
                  r={3 + (j % 2)}
                  fill="hsl(var(--primary))"
                  opacity={0.85}
                >
                  <animate
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur={`${3 + (j % 4)}s`}
                    repeatCount="indefinite"
                    begin={`${j * 0.3}s`}
                  />
                </circle>
              );
            })}
          </g>
        ))}
      </svg>

      {/* Floating data nodes */}
      <svg className="absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="none">
        {Array.from({ length: 14 }).map((_, i) => {
          const x = (i * 73) % 100;
          const y = (i * 41) % 100;
          return (
            <g key={i}>
              <circle
                cx={`${x}%`}
                cy={`${y}%`}
                r={1.5}
                fill="hsl(var(--primary))"
              >
                <animate
                  attributeName="opacity"
                  values="0.1;0.9;0.1"
                  dur={`${4 + (i % 5)}s`}
                  begin={`${i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#05060d]" />
    </div>
  );
}

/* ============================================================
   Live metrics strip
   ============================================================ */
function LiveMetricsStrip({ isAr }: { isAr: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 2400);
    return () => clearInterval(id);
  }, []);

  const metrics = [
    {
      label: isAr ? "صحة المؤسسة" : "Enterprise Health",
      value: `${(96 + Math.sin(tick / 3) * 1.4).toFixed(1)}%`,
      icon: Activity,
      tone: "text-emerald-400",
    },
    {
      label: isAr ? "وكلاء نشطون" : "Active Agents",
      value: `${248 + (tick % 7)}`,
      icon: Brain,
      tone: "text-primary",
    },
    {
      label: isAr ? "قرارات/ساعة" : "Decisions/hr",
      value: `${(12.4 + Math.cos(tick / 4) * 0.6).toFixed(1)}K`,
      icon: Zap,
      tone: "text-amber-400",
    },
    {
      label: isAr ? "تكامل مباشر" : "Live Integrations",
      value: `${84 + (tick % 3)}`,
      icon: Network,
      tone: "text-chart-5",
    },
  ];

  return (
    <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl transition hover:border-primary/40 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <m.icon className={`h-4 w-4 ${m.tone}`} />
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              {isAr ? "مباشر" : "Live"}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{m.value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Pillars
   ============================================================ */
function PillarsGrid({ isAr }: { isAr: boolean }) {
  const pillars = [
    {
      icon: Brain,
      title: isAr ? "ذاكرة المؤسسة" : "Organizational Memory",
      desc: isAr ? "لا يُنسى قرار. لا يضيع التزام." : "No decision forgotten. No commitment lost.",
    },
    {
      icon: Cpu,
      title: isAr ? "محرك التنفيذ" : "Execution Engine",
      desc: isAr ? "من قرار تنفيذي إلى مهمة مكتملة." : "From boardroom decision to completed task.",
    },
    {
      icon: Globe2,
      title: isAr ? "ذكاء القرار" : "Decision Intelligence",
      desc: isAr ? "اعرف لماذا، وماذا بعد، وما المخاطر." : "Know the why, the next, and the risk.",
    },
  ];

  return (
    <div className="mt-10 grid w-full max-w-4xl gap-3 md:grid-cols-3">
      {pillars.map((p) => (
        <div
          key={p.title}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:border-primary/40"
        >
          <p.icon className="h-5 w-5 text-primary" />
          <div className="mt-3 text-sm font-semibold text-foreground">{p.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Auth Modal (glass overlay)
   ============================================================ */
function AuthModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { locale } = useI18n();
  const isAr = locale === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-card/70 p-0 backdrop-blur-2xl">
        <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-primary/15 via-transparent to-chart-5/15" />
        <div className="p-6">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {isAr ? "مصادقة تنفيذية" : "Executive Authentication"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isAr
              ? "دخول آمن إلى نظام تشغيل المؤسسة."
              : "Secure access to your enterprise operating system."}
          </DialogDescription>

          <div className="mt-5">
            <DemoLoginButton />
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {isAr ? "أو" : "Or"}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{isAr ? "تسجيل الدخول" : "Sign In"}</TabsTrigger>
              <TabsTrigger value="signup">{isAr ? "حساب جديد" : "Sign Up"}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-5">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DemoLoginButton() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const ensure = useServerFn(ensureDemoUser);
  const [loading, setLoading] = useState(false);

  const enterDemo = async () => {
    setLoading(true);
    try {
      await ensure();
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      toast.success(locale === "ar" ? "مرحباً في مركز القيادة" : "Welcome to the Command Center");
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={enterDemo}
      disabled={loading}
      className="group relative w-full overflow-hidden rounded-xl border border-primary/40 bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center justify-center gap-2">
        <Rocket className="h-4 w-4" />
        {loading
          ? locale === "ar" ? "...جاري الدخول" : "Entering..."
          : locale === "ar" ? "دخول العرض التنفيذي" : "Enter as Executive Demo"}
      </span>
    </button>
  );
}

function SignInForm() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("✓");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">{isAr ? "البريد الإلكتروني" : "Email"}</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{isAr ? "كلمة المرور" : "Password"}</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
        {loading ? "..." : isAr ? "تسجيل الدخول" : "Sign In"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(isAr ? "✓ تم إنشاء الحساب" : "✓ Account created");
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="name">{isAr ? "الاسم" : "Name"}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email2">{isAr ? "البريد الإلكتروني" : "Email"}</Label>
        <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">{isAr ? "كلمة المرور" : "Password"}</Label>
        <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
        {loading ? "..." : isAr ? "إنشاء الحساب" : "Create Account"}
      </Button>
    </form>
  );
}
