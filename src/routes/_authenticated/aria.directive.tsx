import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { getDirectiveAudit } from "@/lib/aria/directive/directive.functions";
import type { PhaseStatus } from "@/lib/aria/directive/phase-audit.server";

const auditQuery = queryOptions({
  queryKey: ["aria-directive-audit"],
  queryFn: () => getDirectiveAudit(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/_authenticated/aria/directive")({
  loader: ({ context }) => context.queryClient.ensureQueryData(auditQuery),
  head: () => ({
    meta: [
      { title: "ARIA Directive Ledger — NEXIOS" },
      { name: "description", content: "Live phase-by-phase audit of the ARIA Impact Priority Directive." },
    ],
  }),
  component: DirectivePage,
});

const STATUS_TONE: Record<PhaseStatus, string> = {
  green: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  amber: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  red: "text-rose-400 border-rose-400/40 bg-rose-400/10",
  deferred: "text-cyan-300/80 border-cyan-300/30 bg-cyan-400/5",
  unknown: "text-muted-foreground border-border bg-muted/20",
};

const STATUS_AR: Record<PhaseStatus, string> = {
  green: "مكتمل",
  amber: "ناقص",
  red: "معطل",
  deferred: "مؤجل",
  unknown: "غير معلوم",
};

function DirectivePage() {
  const { data } = useSuspenseQuery(auditQuery);
  return (
    <div className="min-h-screen bg-[#061A2E] text-slate-100 p-6 md:p-10" dir="ltr">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            ARIA Impact Directive — Phase Ledger
          </h1>
          <p className="text-sm text-slate-400" dir="rtl">
            سجل التنفيذ الحي لمراحل توجيه أريا التنفيذي (v{data.version}). آخر تحديث:{" "}
            {new Date(data.generated_at).toLocaleString("ar-SA")}
          </p>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${STATUS_TONE[data.overall]}`}>
            <span className="uppercase tracking-wider">Overall</span>
            <span>·</span>
            <span>{data.overall}</span>
            <span dir="rtl">— {STATUS_AR[data.overall]}</span>
          </div>
        </header>

        <ol className="space-y-4">
          {data.phases.map((phase) => (
            <li
              key={phase.n}
              className="rounded-xl border border-cyan-400/10 bg-[#0A2540]/60 p-5 shadow-[0_0_40px_-20px_rgba(0,212,255,0.4)]"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-cyan-300/70 uppercase tracking-widest">
                    Phase {phase.n}
                  </div>
                  <h2 className="text-lg font-semibold">
                    {phase.title_en}{" "}
                    <span className="text-slate-400 text-base font-normal" dir="rtl">
                      — {phase.title_ar}
                    </span>
                  </h2>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_TONE[phase.status]}`}
                >
                  {phase.status.toUpperCase()}
                </span>
              </div>
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {phase.probes.map((probe) => (
                  <li
                    key={probe.module}
                    className="rounded-lg border border-white/5 bg-black/30 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-cyan-200">{probe.module}</code>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_TONE[probe.status]}`}
                      >
                        {probe.status}
                      </span>
                    </div>
                    {probe.note && (
                      <p className="mt-1 text-xs text-slate-400">{probe.note}</p>
                    )}
                    {probe.issues.length > 0 && (
                      <ul className="mt-2 list-disc pl-4 text-xs text-amber-300/80 space-y-0.5">
                        {probe.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
