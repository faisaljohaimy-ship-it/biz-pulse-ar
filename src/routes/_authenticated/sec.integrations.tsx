import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listIntegrations } from "@/lib/integrations/stubs.functions";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/integrations")({
  component: Integrations,
});

function Integrations() {
  const fetchList = useServerFn(listIntegrations);
  const { data: providers } = useQuery({ queryKey: ["sec-integrations"], queryFn: () => fetchList() });
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="جاهزية التكامل"
        subtitle="حالة المزوّدات الخارجية — كل وحدة جاهزة للربط الفعلي عند تكوين البيانات الصحيحة"
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(providers ?? []).map((p) => {
          const Icon = p.status === "configured" ? CheckCircle2 : p.status === "error" ? AlertCircle : XCircle;
          const color = p.status === "configured" ? "text-emerald-500" : p.status === "error" ? "text-red-500" : "text-muted-foreground";
          const label = p.status === "configured" ? "متّصل" : p.status === "error" ? "خطأ" : "Disabled";
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{p.label}</div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{p.category}</div>
              <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
              <div className="mt-3 text-[11px]">
                <div className="text-muted-foreground">Scopes:</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.scopes.map(s => (
                    <span key={s} className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">{s}</span>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">آلية الربط: {p.doc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
