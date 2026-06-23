import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, SampleBadge, severityClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/risks")({
  component: Risks,
});

const RISKS = [
  { id: "R-001", title: "اختراق محيط محطات الحدود الشرقية للمنطقة الغربية", severity: "critical", likelihood: "متوسطة", impact: "عالٍ", owner: "إدارة الأمن — جدة", treatment: "تعزيز الدوريات + رفع كاميرات حرارية" },
  { id: "R-002", title: "تجاوز صلاحية تصاريح المقاولين في رابغ", severity: "high", likelihood: "عالية", impact: "متوسط", owner: "وحدة التصاريح", treatment: "أتمتة التنبيهات قبل 7 أيام" },
  { id: "R-003", title: "تعطّل أنظمة CCTV في موقع ينبع 2", severity: "high", likelihood: "متوسطة", impact: "عالٍ", owner: "وحدة التقنية الأمنية", treatment: "صيانة دورية + نظام بديل" },
  { id: "R-004", title: "نقص العمالة في الورديات المسائية", severity: "medium", likelihood: "عالية", impact: "متوسط", owner: "إدارة الموارد", treatment: "خطة استقطاب ربعية" },
  { id: "R-005", title: "ضعف الاستجابة لتنبيهات HAZMAT", severity: "medium", likelihood: "منخفضة", impact: "حرج", owner: "فريق الطوارئ", treatment: "تدريبات شهرية" },
  { id: "R-006", title: "بطء تحديث بيانات الزوار بين البوّابات", severity: "low", likelihood: "عالية", impact: "منخفض", owner: "وحدة الزوار", treatment: "تكامل مع Lenel" },
];

function Risks() {
  return (
    <div className="space-y-4">
      <SecPageHeader title="سجل المخاطر الأمنية" subtitle="المخاطر التشغيلية للمنطقة الغربية" badge="Sample" />
      <SampleBadge />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المعرّف</th>
              <th className="px-3 py-2 text-start">المخاطرة</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الاحتمال</th>
              <th className="px-3 py-2 text-start">الأثر</th>
              <th className="px-3 py-2 text-start">المالك</th>
              <th className="px-3 py-2 text-start">المعالجة</th>
            </tr>
          </thead>
          <tbody>
            {RISKS.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(r.severity)}`}>{r.severity}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{r.likelihood}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.impact}</td>
                <td className="px-3 py-2">{r.owner}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.treatment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
