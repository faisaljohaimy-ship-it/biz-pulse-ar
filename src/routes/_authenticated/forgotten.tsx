import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Ghost, ArrowRight, AlertOctagon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useFabricSnapshot } from "@/lib/use-fabric";
import { PredictionsPanel } from "@/components/predictions-panel";

export const Route = createFileRoute("/_authenticated/forgotten")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ForgottenPage,
});

function ForgottenPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data: fabric, isLoading } = useFabricSnapshot();

  const blindspots = fabric.forgotten;
  const overdue = blindspots.filter((b) => b.overdue_days > 0).length;
  const silent = blindspots.filter((b) => b.days_silent >= 7).length;

  return (
    <NexusPage
      eyebrow="BLIND SPOTS"
      title={ar ? "ما الذي نُسي؟" : "What Was Forgotten?"}
      subtitle={
        ar
          ? "الأعمال غير المسندة، المتابعات الصامتة، والمشاريع المهجورة عبر الإدارات."
          : "Unassigned work, silent follow-ups, and abandoned items across departments."
      }
      actions={
        <NexusPill tone="rose">
          <Ghost className="h-3 w-3" /> LIVE
        </NexusPill>
      }
      why={
        ar
          ? "الأعمال تُنسى بين الإدارات والأنظمة دون مالك واضح."
          : "Work falls between departments without a clear owner."
      }
      whatNext={
        ar
          ? "أسند مالكاً جديداً لكل بند أو أغلقه رسمياً."
          : "Re-assign every entry or formally close it out."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat
          label={ar ? "بنود منسية" : "Forgotten items"}
          value={String(blindspots.length)}
          tone="rose"
        />
        <NexusStat label={ar ? "متأخر" : "Overdue"} value={String(overdue)} tone="amber" />
        <NexusStat
          label={ar ? "صامت ≥ 7 أيام" : "Silent ≥ 7d"}
          value={String(silent)}
          tone="violet"
        />
        <NexusStat
          label={ar ? "تنبيهات مفتوحة" : "Open alerts"}
          value={String(fabric.counts.openAlerts)}
          tone="cyan"
        />
      </div>

      <PredictionsPanel compact />

      <div className="grid gap-3">
        {blindspots.map((m) => (
          <NexusCard key={m.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <NexusPill tone="violet">{m.kind}</NexusPill>
                  {m.overdue_days > 0 && (
                    <NexusPill tone="amber">
                      {ar ? `متأخر ${m.overdue_days}ي` : `${m.overdue_days}d overdue`}
                    </NexusPill>
                  )}
                  {m.days_silent >= 7 && (
                    <NexusPill tone="rose">
                      <AlertOctagon className="h-3 w-3" />{" "}
                      {ar ? `صامت ${m.days_silent}ي` : `silent ${m.days_silent}d`}
                    </NexusPill>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">
                  {ar ? m.title : (m.title_en ?? m.title)}
                </h3>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  {m.owner && (
                    <span>
                      {ar ? "المالك" : "Owner"}: <span className="text-slate-200">{m.owner}</span>
                    </span>
                  )}
                  {m.department && (
                    <span>
                      {ar ? "الإدارة" : "Dept"}:{" "}
                      <span className="text-slate-200">{m.department}</span>
                    </span>
                  )}
                </div>
              </div>
              {m.decision_route && (
                <Link
                  to={m.decision_route}
                  className="inline-flex items-center gap-1 self-start rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                >
                  {ar ? "إعادة تنشيط" : "Re-activate"} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </NexusCard>
        ))}
        {blindspots.length === 0 && !isLoading && (
          <NexusCard>
            <p className="text-sm text-emerald-300">
              {ar ? "لا توجد بنود منسية حالياً." : "Nothing forgotten right now."}
            </p>
          </NexusCard>
        )}
      </div>
    </NexusPage>
  );
}
