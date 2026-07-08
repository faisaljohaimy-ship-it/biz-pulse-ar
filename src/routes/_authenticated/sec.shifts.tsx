import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, SampleBadge, StatCard } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/shifts")({
  component: Shifts,
});

const SHIFTS = [
  {
    name: "الوردية الصباحية A",
    time: "06:00 — 14:00",
    supervisor: "م. عبدالله الشهري",
    guards: 42,
    status: "نشطة",
  },
  {
    name: "الوردية المسائية B",
    time: "14:00 — 22:00",
    supervisor: "م. فهد العتيبي",
    guards: 38,
    status: "قادمة",
  },
  {
    name: "الوردية الليلية C",
    time: "22:00 — 06:00",
    supervisor: "م. سلطان الحارثي",
    guards: 30,
    status: "قادمة",
  },
  {
    name: "وردية احتياط",
    time: "On-Call",
    supervisor: "م. تركي القرشي",
    guards: 12,
    status: "احتياط",
  },
];

function Shifts() {
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="إدارة الورديات"
        subtitle="جدول الورديات وأعداد الحرّاس"
        badge="Sample"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي الحرّاس" value={SHIFTS.reduce((s, x) => s + x.guards, 0)} />
        <StatCard label="حاليّاً بالميدان" value={SHIFTS[0].guards} tone="success" />
        <StatCard label="عدد الورديات" value={SHIFTS.length} />
        <StatCard label="التغطية" value="100%" tone="success" />
      </div>
      <SampleBadge />
      <div className="grid gap-3 md:grid-cols-2">
        {SHIFTS.map((s) => (
          <div key={s.name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-foreground">{s.name}</div>
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px]">
                {s.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">⏱ {s.time}</div>
            <div className="mt-1 text-xs text-muted-foreground">المشرف: {s.supervisor}</div>
            <div className="mt-2 text-sm">
              عدد الحرّاس: <span className="font-bold">{s.guards}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
