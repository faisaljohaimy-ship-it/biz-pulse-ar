import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useEffect } from "react";
import { Sparkles, Rocket } from "lucide-react";
import { ensureDemoUser, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 start-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 end-1/4 h-96 w-96 rounded-full bg-chart-5/20 blur-3xl" />
      </div>

      <button
        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        className="absolute top-4 end-4 z-10 rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur hover:text-foreground"
      >
        {t("lang.toggle")}
      </button>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">Nexus AI OS</h1>
          <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
          <DemoLoginButton />

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("auth.signin")} / {t("auth.signup")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>

        <AdminGate />
      </div>
    </div>
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
      // 1) Ensure the seeded executive demo account exists (idempotent)
      await ensure();
      // 2) Sign in with the seeded credentials
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      toast.success(locale === "ar" ? "مرحباً في مركز القيادة التنفيذي" : "Welcome to the Executive Command Center");
      // 3) Route directly to the Executive Command Center
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
      className="group relative w-full overflow-hidden rounded-xl border border-primary/40 bg-gradient-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center justify-center gap-2">
        <Rocket className="h-4 w-4" />
        {loading
          ? (locale === "ar" ? "...جاري الدخول" : "Entering...")
          : (locale === "ar" ? "ادخل كعرض تنفيذي" : "Enter as Demo")}
      </span>
      <span className="relative mt-1 block text-[10px] font-normal tracking-wide opacity-80">
        {locale === "ar"
          ? "وصول فوري لمركز القيادة — للعروض والاجتماعات التنفيذية"
          : "Instant access to the Executive Command Center — for demos & boardroom reviews"}
      </span>
    </button>
  );
}


function SignInForm() {
  const { t } = useI18n();
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
        {loading ? "..." : t("auth.signin")}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const { t } = useI18n();
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
    else toast.success("✓ " + t("auth.signup"));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("auth.name")}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">{t("auth.email")}</Label>
        <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">{t("auth.password")}</Label>
        <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
        {loading ? "..." : t("auth.signup")}
      </Button>
    </form>
  );
}

function AdminGate() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === "99999") {
      sessionStorage.setItem("admin_unlocked", "1");
      toast.success("✓ Admin");
      navigate({ to: "/admin" });
    } else {
      toast.error("✗");
    }
  };

  return (
    <div className="mt-8 text-center">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
        >
          Admin
        </button>
      ) : (
        <form onSubmit={onSubmit} className="mx-auto flex max-w-xs items-center gap-2">
          <Input
            type="password"
            placeholder="••••"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" variant="outline">→</Button>
        </form>
      )}
    </div>
  );
}
