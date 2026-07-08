import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/analytics")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Analytics,
});

const trend = Array.from({ length: 14 }, (_, i) => ({
  d: i + 1,
  a: 30 + Math.round(Math.sin(i / 2) * 20 + i * 3),
  b: 20 + Math.round(Math.cos(i / 2) * 15 + i * 2),
}));
const segments = [
  { name: "Enterprise", value: 48, c: "oklch(0.62 0.22 275)" },
  { name: "SMB", value: 32, c: "oklch(0.72 0.2 282)" },
  { name: "Startups", value: 20, c: "oklch(0.78 0.17 80)" },
];

function Analytics() {
  const { t } = useI18n();
  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("nav.analytics")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Growth trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="oklch(0.28 0.05 278 / 30%)" vertical={false} />
                <XAxis
                  dataKey="d"
                  stroke="oklch(0.68 0.04 268)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.68 0.04 268)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.05 278)",
                    border: "1px solid oklch(0.28 0.05 278)",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="a"
                  stroke="oklch(0.62 0.22 275)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="b"
                  stroke="oklch(0.78 0.17 80)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Segments</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {segments.map((s) => (
                    <Cell key={s.name} fill={s.c} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.05 278)",
                    border: "1px solid oklch(0.28 0.05 278)",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
