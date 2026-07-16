import { Database, Loader2, Radio } from "lucide-react";
import { SimBadge } from "@/components/os/SimBadge";
import type { ExecutiveKpiSource } from "@/lib/sec/use-executive-kpi-source";
import { cn } from "@/lib/utils";

export function ExecutiveSourceBadge({
  source,
  ar,
  className,
}: {
  source: ExecutiveKpiSource;
  ar: boolean;
  className?: string;
}) {
  if (source.mode !== "live") return <SimBadge ar={ar} className={className} />;
  const updated = source.updatedAt
    ? new Date(source.updatedAt).toLocaleTimeString(ar ? "ar-SA" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200",
        className,
      )}
      title={`${ar ? "المصدر" : "Source"}: RLS · sec_exec_kpis · ${updated}`}
    >
      {source.isFetching ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Radio className="h-3 w-3" />
      )}
      {ar ? "حيّ موثّق" : "VERIFIED LIVE"}
      <Database className="h-3 w-3 opacity-65" />
    </span>
  );
}
