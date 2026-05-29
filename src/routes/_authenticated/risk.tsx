import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Shield, AlertTriangle, FileCheck, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/risk")({
  component: RiskPage,
});

const RISKS = [
  { id: "R-014", t_ar: "تذبذب سعر العملة", t_en: "FX volatility exposure", cat: "Financial", lk: 4, im: 5, owner: "CFO", status: "mitigating", control: "FX hedge program" },
  { id: "R-022", t_ar: "اعتماد على مزود سحابي وحيد", t_en: "Single-cloud dependency", cat: "Tech", lk: 3, im: 5, owner: "CIO", status: "active", control: "Multi-cloud strategy" },
  { id: "R-031", t_ar: "تسرب بيانات العملاء", t_en: "Customer data breach", cat: "Security", lk: 2, im: 5, owner: "CISO", status: "monitored", control: "ZTNA + DLP" },
  { id: "R-038", t_ar: "تغيير تنظيمي في السوق", t_en: "Regulatory shift in market", cat: "Compliance", lk: 4, im: 4, owner: "GC", status: "active", control: "Quarterly review" },
  { id: "R-044", t_ar: "نقص مواهب الذكاء الاصطناعي", t_en: "AI talent shortage", cat: "People", lk: 4, im: 3, owner: "CHRO", status: "mitigating", control: "Reskilling program" },
  { id: "R-051", t_ar: "اضطراب سلسلة الإمداد", t_en: "Supply chain disruption", cat: "Operational", lk: 3, im: 4, owner: "COO", status: "active", control: "Dual sourcing" },
];

const CONTROLS = [
  { name_ar: "MFA على جميع الأنظمة", name_en: "MFA on all systems", eff: 96, last: "2026-05-12" },
  { name_ar: "تشفير بيانات الإنتاج", name_en: "Production data encryption", eff: 100, last: "2026-05-20" },
  { name_ar: "مراجعة وصول ربع سنوية", name_en: "Quarterly access review", eff: 88, last: "2026-04-30" },
  { name_ar: "اختبار اختراق دوري", name_en: "Recurring pen testing", eff: 92, last: "2026-03-18" },
  { name_ar: "فصل الواجبات في الدفع", name_en: "Payment SoD enforcement", eff: 100, last: "2026-05-22" },
  { name_ar: "مراقبة شذوذ المعاملات", name_en: "Transaction anomaly monitor", eff: 84, last: "2026-05-26" },
];

const AUDITS = [
  { id: "A-118", t_ar: "تعزيز مراقبة طلبات الشراء فوق SAR 1M", t_en: "Enhanced monitoring on PO > SAR 1M", sev: "high", status: "open", due: "2026-06-15" },
  { id: "A-119", t_ar: "توثيق إجراءات استرداد الكوارث", t_en: "Document DR procedures", sev: "med", status: "in-progress", due: "2026-07-01" },
  { id: "A-120", t_ar: "مراجعة صلاحيات حسابات الخدمة", t_en: "Service account privilege review", sev: "high", status: "closed", due: "2026-04-30" },
  { id: "A-121", t_ar: "تحديث سجل معالجة البيانات", t_en: "Update DPIA register", sev: "low", status: "open", due: "2026-08-10" },
];

function heatTone(lk: number, im: number) {
  const s = lk * im;
  return s >= 16 ? "rose" : s >= 9 ? "amber" : s >= 4 ? "cyan" : "emerald";
}

function RiskPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="ENTERPRISE RISK"
      title={ar ? "إدارة المخاطر المؤسسية" : "Enterprise Risk Management"}
      subtitle={ar ? "سجل المخاطر، الضوابط، الامتثال، نتائج التدقيق، وتتبع التخفيف." : "Risk register, controls, compliance, audit findings, and mitigation tracking."}
      actions={<NexusPill tone="rose"><Shield className="h-3 w-3" /> 6 ACTIVE</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "مخاطر نشطة" : "Active risks"} value="34" tone="rose" />
        <NexusStat label={ar ? "ضوابط فعالة" : "Controls effective"} value="92%" tone="emerald" />
        <NexusStat label={ar ? "نتائج تدقيق مفتوحة" : "Open audit findings"} value="9" tone="amber" />
        <NexusStat label={ar ? "امتثال" : "Compliance score"} value="A-" tone="emerald" />
      </div>

      <NexusCard glow>
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-rose-300/80">{ar ? "سجل المخاطر" : "RISK REGISTER"}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2 text-start">ID</th>
                <th className="py-2 text-start">{ar ? "المخاطر" : "Risk"}</th>
                <th className="py-2 text-start">{ar ? "الفئة" : "Category"}</th>
                <th className="py-2 text-start">{ar ? "احتمال × أثر" : "L × I"}</th>
                <th className="py-2 text-start">{ar ? "ضابط" : "Control"}</th>
                <th className="py-2 text-start">{ar ? "المالك" : "Owner"}</th>
                <th className="py-2 text-start">{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {RISKS.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 font-mono text-[11px] text-slate-500">{r.id}</td>
                  <td className="py-3 font-semibold text-white">{ar ? r.t_ar : r.t_en}</td>
                  <td className="py-3 text-slate-400">{r.cat}</td>
                  <td className="py-3"><NexusPill tone={heatTone(r.lk, r.im)}>{r.lk}×{r.im} = {r.lk * r.im}</NexusPill></td>
                  <td className="py-3 text-cyan-300">{r.control}</td>
                  <td className="py-3 text-slate-400">{r.owner}</td>
                  <td className="py-3"><NexusPill tone={r.status === "active" ? "rose" : r.status === "mitigating" ? "amber" : "emerald"}>{r.status}</NexusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NexusCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="flex items-center gap-2"><FileCheck className="h-4 w-4 text-emerald-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-emerald-300/80">{ar ? "الضوابط والامتثال" : "CONTROLS & COMPLIANCE"}</div>
          </div>
          <div className="mt-3 space-y-2">
            {CONTROLS.map((c) => (
              <div key={c.name_en} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{ar ? c.name_ar : c.name_en}</div>
                  <div className="text-[10px] text-slate-500">{ar ? "آخر اختبار" : "Last tested"} {c.last}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${c.eff >= 95 ? "bg-emerald-400" : c.eff >= 85 ? "bg-cyan-400" : "bg-amber-400"}`} style={{ width: `${c.eff}%` }} />
                  </div>
                  <NexusPill tone={c.eff >= 95 ? "emerald" : "cyan"}>{c.eff}%</NexusPill>
                </div>
              </div>
            ))}
          </div>
        </NexusCard>

        <NexusCard>
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-amber-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-amber-300/80">{ar ? "نتائج التدقيق وتتبع التخفيف" : "AUDIT FINDINGS & MITIGATION"}</div>
          </div>
          <div className="mt-3 space-y-2">
            {AUDITS.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">{a.id} · {ar ? "استحقاق" : "Due"} {a.due}</div>
                    <div className="mt-0.5 text-sm font-semibold text-white">{ar ? a.t_ar : a.t_en}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <NexusPill tone={a.sev === "high" ? "rose" : a.sev === "med" ? "amber" : "cyan"}>{a.sev}</NexusPill>
                    <NexusPill tone={a.status === "closed" ? "emerald" : a.status === "in-progress" ? "cyan" : "rose"}>{a.status}</NexusPill>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </NexusCard>
      </div>
    </NexusPage>
  );
}
