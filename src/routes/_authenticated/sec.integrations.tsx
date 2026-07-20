import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listIntegrations } from "@/lib/integrations/stubs.functions";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { CheckCircle2, XCircle, AlertCircle, Plug } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/integrations")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Integrations,
});

const CATEGORY_AR: Record<string, string> = {
  erp: "أنظمة الموارد",
  productivity: "الإنتاجية",
  identity: "الهوية",
  bi: "التحليلات",
  ai: "الذكاء الاصطناعي",
  data: "البيانات",
  automation: "الأتمتة والتنبيهات",
  api: "واجهات برمجية",
};

function Integrations() {
  const fetchList = useServerFn(listIntegrations);
  const { data: providers } = useQuery({
    queryKey: ["sec-integrations"],
    queryFn: () => fetchList(),
  });
  const usingReference = (providers ?? []).some((p) => "last_sync_at" in p);
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="جاهزية التكامل"
        subtitle="حالة المزوّدات الخارجية — كل وحدة جاهزة للربط الفعلي عند تكوين البيانات الصحيحة"
      >
        {usingReference && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-300">
            محاكاة مرجعية
          </span>
        )}
      </SecPageHeader>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(providers ?? []).map((p) => {
          const Icon =
            p.status === "configured" ? CheckCircle2 : p.status === "error" ? AlertCircle : XCircle;
          const color =
            p.status === "configured"
              ? "text-emerald-500"
              : p.status === "error"
                ? "text-amber-500"
                : "text-muted-foreground";
          const label =
            p.status === "configured"
              ? "متّصل"
              : p.status === "error"
                ? "يتطلب تجديد الربط"
                : "قيد التهيئة";
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {p.label}
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${color}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              </div>
              <div className="mt-1 text-[11px] tracking-wide text-muted-foreground">
                {CATEGORY_AR[p.category] ?? p.category}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
              {p.last_sync_at !== undefined && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  آخر مزامنة:{" "}
                  <span className="text-foreground">
                    {p.last_sync_at ? new Date(p.last_sync_at).toLocaleString("ar-SA") : "—"}
                  </span>
                </div>
              )}
              <div className="mt-3 text-[11px]">
                <div className="text-muted-foreground">Scopes:</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[10px] text-muted-foreground">
                  آلية الربط: {p.doc}
                </div>
                <button
                  disabled
                  title="يتطلب تفويض المدير"
                  className="inline-flex h-11 shrink-0 cursor-not-allowed items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 text-xs text-muted-foreground opacity-70"
                >
                  <Plug className="h-3.5 w-3.5" />
                  {p.status === "error" ? "تجديد الربط" : "ربط"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
