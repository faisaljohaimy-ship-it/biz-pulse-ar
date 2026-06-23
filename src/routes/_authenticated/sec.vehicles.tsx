import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, StatCard, SampleBadge, statusClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/vehicles")({
  component: Vehicles,
});

const SAMPLE = [
  { plate: "ر س م 4521", driver: "م. عبدالله الزهراني", type: "شاحنة", site: "محطة جدة 1", status: "inside" },
  { plate: "ع ل ك 8832", driver: "م. سعيد العمري", type: "مركبة خدمة", site: "ميناء جدة", status: "inside" },
  { plate: "ب ج د 1190", driver: "م. خالد الحارثي", type: "صهريج", site: "مستودع رابغ", status: "expected" },
  { plate: "ت ن ر 7741", driver: "م. ماجد الغامدي", type: "مركبة طوارئ", site: "محطة ينبع", status: "left" },
  { plate: "س م ع 2298", driver: "م. عبدالعزيز القرشي", type: "حافلة", site: "مكتب جدة", status: "inside" },
];

function Vehicles() {
  return (
    <div className="space-y-4">
      <SecPageHeader title="إدارة المركبات" subtitle="مركبات الجهات والمقاولين الداخلة للمواقع" badge="Sample" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مركبات بالداخل" value={SAMPLE.filter(v => v.status === "inside").length} />
        <StatCard label="متوقّعة اليوم" value={SAMPLE.filter(v => v.status === "expected").length} />
        <StatCard label="غادرت اليوم" value={SAMPLE.filter(v => v.status === "left").length} />
        <StatCard label="مركبات طوارئ" value={SAMPLE.filter(v => v.type.includes("طوارئ")).length} tone="success" />
      </div>
      <SampleBadge />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">اللوحة</th>
              <th className="px-3 py-2 text-start">السائق</th>
              <th className="px-3 py-2 text-start">النوع</th>
              <th className="px-3 py-2 text-start">الموقع</th>
              <th className="px-3 py-2 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.map((v, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{v.plate}</td>
                <td className="px-3 py-2">{v.driver}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.type}</td>
                <td className="px-3 py-2">{v.site}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(v.status)}`}>{v.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
