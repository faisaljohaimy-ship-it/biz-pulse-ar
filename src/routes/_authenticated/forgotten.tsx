import { createFileRoute, Link } from "@tanstack/react-router";
import { Ghost, ArrowRight, AlertOctagon } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse } from "@/lib/enterprise-pulse";

export const Route = createFileRoute("/_authenticated/forgotten")({
  component: ForgottenPage,
});

function ForgottenPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const pulse = useEnterprisePulse();

  const blindspots = useMemo(() => {
    const items = pulse.memory.filter(
      (m) =>
        m.status === "forgotten" ||
        m.daysSilent >= 7 ||
        (new Date(m.due).getTime() < Date.now() && m.status !== "done"),
    );
    return items.sort((a, b) => b.daysSilent - a.daysSilent);
  }, [pulse.memory]);

  const overdue = blindspots.filter((b) => new Date(b.due).getTime() < Date.now()).length;
  const silent = blindspots.filter((b) => b.daysSilent >= 7).length;
  const critical = blindspots.filter((b) => b.impact === "critical").length;

  return (
    <NexusPage
      eyebrow="BLIND SPOTS"
      title={ar ? "ما الذي نُسي؟" : "What Was Forgotten?"}
      subtitle={
        ar
          ? "الأعمال غير المسندة، المتابعات الصامتة، والمشاريع المهجورة عبر الإدارات."
          : "Unassigned work, silent follow-ups, and abandoned items across departments."
      }
      actions={<NexusPill tone="rose"><Ghost className="h-3 w-3" /> EXECUTIVE VIEW</NexusPill>}
      why={ar ? "الأعمال تُنسى بين الإدارات والأنظمة دون مالك واضح." : "Work falls between departments without a clear owner."}
      whatNext={ar ? "أسند مالكاً جديداً لكل بند أو أغلقه رسمياً." : "Re-assign every entry or formally close it out."}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "بنود منسية" : "Forgotten items"} value={String(blindspots.length)} tone="rose" />
        <NexusStat label={ar ? "متأخر" : "Overdue"} value={String(overdue)} tone="amber" />
        <NexusStat label={ar ? "صامت ≥ 7 أيام" : "Silent ≥ 7d"} value={String(silent)} tone="violet" />
        <NexusStat label={ar ? "تأثير حرج" : "Critical impact"} value={String(critical)} tone="cyan" />
      </div>

      <div className="grid gap-3">
        {blindspots.map((m) => {
          const overdueDays = Math.max(0, Math.round((Date.now() - new Date(m.due).getTime()) / 86_400_000));
          return (
            <NexusCard key={m.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.status === "forgotten" && <NexusPill tone="rose"><AlertOctagon className="h-3 w-3" /> {ar ? "منسي" : "FORGOTTEN"}</NexusPill>}
                    {overdueDays > 0 && <NexusPill tone="amber">{ar ? `متأخر ${overdueDays}ي` : `${overdueDays}d overdue`}</NexusPill>}
                    {m.daysSilent >= 7 && <NexusPill tone="violet">{ar ? `صامت ${m.daysSilent}ي` : `silent ${m.daysSilent}d`}</NexusPill>}
                    {m.impact === "critical" && <NexusPill tone="rose">CRITICAL</NexusPill>}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-100">{ar ? m.title_ar : m.title_en}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
                    <span>{ar ? "المالك السابق" : "Last owner"}: <span className="text-slate-200">{m.owner}</span></span>
                    <span>{ar ? "الإدارة" : "Dept"}: <span className="text-slate-200">{m.department}</span></span>
                    <span>{ar ? "المصدر" : "Source"}: <span className="text-slate-200">{ar ? m.source_ar : m.source_en}</span></span>
                  </div>
                </div>
                {m.decisionRoute && (
                  <Link to={m.decisionRoute} className="inline-flex items-center gap-1 self-start rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20">
                    {ar ? "إعادة تنشيط" : "Re-activate"} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </NexusCard>
          );
        })}
        {blindspots.length === 0 && (
          <NexusCard>
            <p className="text-sm text-emerald-300">{ar ? "لا توجد بنود منسية حالياً." : "Nothing forgotten right now."}</p>
          </NexusCard>
        )}
      </div>
    </NexusPage>
  );
}
