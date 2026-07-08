import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, SampleBadge, StatCard, severityClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/safety")({
  component: Safety,
});

const OBS = [
  {
    ref: "SAF-2026-0118",
    site: "محطة جدة 1",
    category: "PPE",
    severity: "medium",
    desc: "عامل بدون نظارات حماية في منطقة اللحام",
    reporter: "م. سعد القحطاني",
    status: "مفتوحة",
  },
  {
    ref: "SAF-2026-0117",
    site: "ميناء جدة",
    category: "Housekeeping",
    severity: "low",
    desc: "أدوات متناثرة على ممر الطوارئ",
    reporter: "م. فيصل الزهراني",
    status: "مغلقة",
  },
  {
    ref: "SAF-2026-0116",
    site: "محطة ينبع",
    category: "Hot Work",
    severity: "high",
    desc: "عمل ساخن بدون مراقب حريق",
    reporter: "م. ماجد الحربي",
    status: "مفتوحة",
  },
  {
    ref: "SAF-2026-0115",
    site: "مستودع رابغ",
    category: "Electrical",
    severity: "critical",
    desc: "كابل تالف قرب خزان وقود",
    reporter: "م. عمر الغامدي",
    status: "قيد المعالجة",
  },
];

function Safety() {
  return (
    <div className="space-y-4">
      <SecPageHeader
        title="ملاحظات السلامة"
        subtitle="رصد المخالفات والمشاهدات في الميدان"
        badge="Sample"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي هذا الشهر" value={47} />
        <StatCard
          label="مفتوحة"
          value={OBS.filter((o) => o.status === "مفتوحة").length}
          tone="warning"
        />
        <StatCard
          label="حرجة"
          value={OBS.filter((o) => o.severity === "critical").length}
          tone="danger"
        />
        <StatCard label="معدّل الإغلاق" value="82%" tone="success" />
      </div>
      <SampleBadge />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">الموقع</th>
              <th className="px-3 py-2 text-start">الفئة</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الوصف</th>
              <th className="px-3 py-2 text-start">المُبلِّغ</th>
              <th className="px-3 py-2 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {OBS.map((o) => (
              <tr key={o.ref} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{o.ref}</td>
                <td className="px-3 py-2">{o.site}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.category}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(o.severity)}`}
                  >
                    {o.severity}
                  </span>
                </td>
                <td className="px-3 py-2">{o.desc}</td>
                <td className="px-3 py-2 text-muted-foreground">{o.reporter}</td>
                <td className="px-3 py-2">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
