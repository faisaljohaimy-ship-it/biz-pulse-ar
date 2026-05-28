import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { TrendingUp, Users, Target, Bot, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const revenueData = [
  { m: "يناير", v: 42 },
  { m: "فبراير", v: 58 },
  { m: "مارس", v: 51 },
  { m: "أبريل", v: 73 },
  { m: "مايو", v: 86 },
  { m: "يونيو", v: 94 },
  { m: "يوليو", v: 112 },
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
  const fmt = locale === "ar" ? "ar-EG" : "en-US";
  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Kpi label={t("kpi.revenue")} value={"$" + (1284560).toLocaleString(fmt)} delta={12.4} icon={TrendingUp} />
        <Kpi label={t("kpi.users")} value={(48291).toLocaleString(fmt)} delta={8.1} icon={Users} />
        <Kpi label={t("kpi.conversion")} value="3.84%" delta={-1.2} icon={Target} />
        <Kpi label={t("kpi.ai_calls")} value={(184320).toLocaleString(fmt)} delta={24.6} icon={Bot} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{t("chart.revenue_title")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.22 275)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.22 275)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.28 0.05 278 / 30%)" vertical={false} />
                <XAxis dataKey="m" stroke="oklch(0.68 0.04 268)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.04 268)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.05 278)",
                    border: "1px solid oklch(0.28 0.05 278)",
                    borderRadius: 12,
                    color: "white",
                  }}
                />
                <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.2 282)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{t("chart.activity_title")}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid stroke="oklch(0.28 0.05 278 / 30%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.04 268)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.05 278)",
                    border: "1px solid oklch(0.28 0.05 278)",
                    borderRadius: 12,
                    color: "white",
                  }}
                />
                <Bar dataKey="v" fill="oklch(0.62 0.22 275)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-glow md:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight md:text-2xl">{value}</div>
      <div
        className={
          "mt-1 flex items-center gap-1 text-xs font-medium " +
          (up ? "text-[oklch(0.72_0.18_155)]" : "text-destructive")
        }
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(delta).toFixed(1)}%
      </div>
    </div>
  );
}
