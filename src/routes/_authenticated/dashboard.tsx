import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  Users,
  Target,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Send,
  Zap,
  AlertTriangle,
  Lightbulb,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createThread } from "@/lib/threads.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const revenueData = [
  { m: "Jan", v: 42 },
  { m: "Feb", v: 58 },
  { m: "Mar", v: 51 },
  { m: "Apr", v: 73 },
  { m: "May", v: 86 },
  { m: "Jun", v: 94 },
  { m: "Jul", v: 112 },
];

const activityData = [
  { d: "S", v: 24 },
  { d: "M", v: 38 },
  { d: "T", v: 31 },
  { d: "W", v: 52 },
  { d: "T", v: 47 },
  { d: "F", v: 64 },
  { d: "S", v: 41 },
];

function Dashboard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fmt = locale === "ar" ? "ar-EG" : "en-US";

  const startAssistant = async (initial?: string) => {
    const seed = (initial ?? prompt).trim();
    setSubmitting(true);
    try {
      const thread = await createThread({ data: { title: seed?.slice(0, 60) || undefined } });
      const search = seed ? { q: seed } : undefined;
      navigate({ to: "/assistant/$threadId", params: { threadId: thread.id }, search });
    } finally {
      setSubmitting(false);
    }
  };

  const suggestions = [
    t("dashboard.suggestion_1"),
    t("dashboard.suggestion_2"),
    t("dashboard.suggestion_3"),
  ];

  const insights = [
    {
      icon: Lightbulb,
      tone: "success" as const,
      title: t("dashboard.insight_1_t"),
      desc: t("dashboard.insight_1_d"),
    },
    {
      icon: AlertTriangle,
      tone: "warning" as const,
      title: t("dashboard.insight_2_t"),
      desc: t("dashboard.insight_2_d"),
    },
    {
      icon: Zap,
      tone: "primary" as const,
      title: t("dashboard.insight_3_t"),
      desc: t("dashboard.insight_3_d"),
    },
  ];

  const name = user?.email?.split("@")[0] ?? "";

  return (
    <div className="space-y-6 p-4 md:space-y-8 md:p-8">
      {/* Hero / AI Command bar */}
      <section className="relative overflow-hidden rounded-3xl glass-strong shadow-elevated animate-rise">
        <div className="absolute inset-0 bg-gradient-hero opacity-25" />
        <div className="absolute -top-24 end-[-60px] h-72 w-72 rounded-full bg-primary/40 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-24 start-[-40px] h-64 w-64 rounded-full bg-accent/40 blur-3xl animate-float-slow" />

        <div className="relative space-y-6 p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t("dashboard.status_live")}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(fmt, { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t("dashboard.greeting")}{name ? `, ${name}` : ""}
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              <span className="text-gradient">{t("dashboard.title")}</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              {t("dashboard.subtitle")}
            </p>
          </div>

          {/* Prompt bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) startAssistant();
            }}
            className="group relative flex items-center gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-elevated backdrop-blur-xl transition-all focus-within:border-primary/60 focus-within:shadow-glow"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("dashboard.ask_placeholder")}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground md:text-base"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || submitting}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-primary px-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 disabled:opacity-50 md:h-10 md:px-4"
            >
              <span className="hidden sm:inline">{t("dashboard.open_assistant")}</span>
              <Send className="h-4 w-4" data-flip-rtl />
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={s}
                onClick={() => startAssistant(s)}
                disabled={submitting}
                className="animate-rise rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-all hover:border-primary/50 hover:text-foreground hover:shadow-glow disabled:opacity-50"
                style={{ animationDelay: `${i * 80 + 200}ms` }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Kpi label={t("kpi.revenue")} value={"$" + (1284560).toLocaleString(fmt)} delta={12.4} icon={TrendingUp} accent="primary" i={0} />
        <Kpi label={t("kpi.users")} value={(48291).toLocaleString(fmt)} delta={8.1} icon={Users} accent="emerald" i={1} />
        <Kpi label={t("kpi.conversion")} value="3.84%" delta={-1.2} icon={Target} accent="primary" i={2} />
        <Kpi label={t("kpi.ai_calls")} value={(184320).toLocaleString(fmt)} delta={24.6} icon={Bot} accent="emerald" i={3} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="animate-rise rounded-2xl glass p-5 shadow-elevated lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("chart.revenue_title")}</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.17 235)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.62 0.17 235)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.32 0.04 240 / 25%)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.72 0.03 235)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.03 235)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.05 240)",
                    border: "1px solid oklch(0.32 0.04 240)",
                    borderRadius: 12,
                    color: "white",
                  }}
                />
                <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.16 230)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="animate-rise rounded-2xl glass p-5 shadow-elevated delay-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("chart.activity_title")}</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <defs>
                  <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.17 160)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(0.62 0.17 200)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.32 0.04 240 / 25%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.72 0.03 235)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.05 240)",
                    border: "1px solid oklch(0.32 0.04 240)",
                    borderRadius: 12,
                    color: "white",
                  }}
                />
                <Bar dataKey="v" fill="url(#act)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI insights */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-muted-foreground">{t("dashboard.insights")}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {insights.map((ins, i) => (
            <Insight key={ins.title} {...ins} i={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  i,
}: {
  label: string;
  value: string;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "emerald";
  i: number;
}) {
  const up = delta >= 0;
  const iconBg = accent === "emerald" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary";
  return (
    <div
      className="group relative animate-rise overflow-hidden rounded-2xl glass p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow md:p-5"
      style={{ animationDelay: `${i * 80}ms` }}
    >
      <div
        className={
          "absolute inset-x-0 top-0 h-px " +
          (accent === "emerald"
            ? "bg-gradient-to-r from-transparent via-accent/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-primary/60 to-transparent")
        }
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={"flex h-9 w-9 items-center justify-center rounded-xl " + iconBg}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight md:text-2xl">{value}</div>
      <div
        className={
          "mt-1 flex items-center gap-1 text-xs font-semibold " +
          (up ? "text-success" : "text-destructive")
        }
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(delta).toFixed(1)}%
      </div>
    </div>
  );
}

function Insight({
  icon: Icon,
  tone,
  title,
  desc,
  i,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "primary";
  title: string;
  desc: string;
  i: number;
}) {
  const toneCls =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/15 text-primary";
  return (
    <div
      className="animate-rise rounded-2xl glass p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
      style={{ animationDelay: `${i * 100 + 100}ms` }}
    >
      <div className={"mb-3 flex h-9 w-9 items-center justify-center rounded-xl " + toneCls}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
