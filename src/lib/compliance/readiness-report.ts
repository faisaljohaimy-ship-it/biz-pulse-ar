// Inspection-readiness report — builds a self-contained, print-ready RTL HTML
// document from the HCIS overview. Opened in a new window; the browser's
// print/save-as-PDF produces a genuine Arabic-RTL PDF (no font-shaping hacks).
import type { HcisOverview } from "./hcis-ptw.functions";

const CATS: Record<string, string> = {
  physical: "الحماية المادية",
  surveillance: "المراقبة الإلكترونية",
  forces: "القوى الأمنية",
  emergency: "إدارة الطوارئ",
  infosec: "أمن المعلومات التشغيلية",
  access: "التحكم بالدخول",
};
const REGION_AR: Record<string, string> = {
  central: "الوسطى",
  western: "الغربية",
  eastern: "الشرقية",
  southern: "الجنوبية",
};

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

function pctColor(p: number): string {
  return p >= 85 ? "#16a34a" : p >= 70 ? "#d97706" : "#dc2626";
}

export function buildReadinessReportHtml(
  data: HcisOverview,
  regionLabel: string,
  ar: boolean,
): string {
  const dir = ar ? "rtl" : "ltr";
  const now = new Date();
  const dateStr = now.toLocaleDateString(ar ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const regionRows = Object.entries(data.byRegion)
    .map(
      ([
        r,
        p,
      ]) => `<tr><td>${REGION_AR[r] ?? r}</td><td style="color:${pctColor(p)};font-weight:700">${p}%</td>
        <td><div class="bar"><span style="width:${p}%;background:${pctColor(p)}"></span></div></td></tr>`,
    )
    .join("");

  const catRows = Object.entries(data.byCategory)
    .map(
      ([c, v]) =>
        `<tr><td>${CATS[c] ?? c}</td><td style="color:${pctColor(v.pct)};font-weight:700">${v.pct}%</td><td>${v.total}</td></tr>`,
    )
    .join("");

  const findingRows = data.findings.top
    .map(
      (f) => `<tr>
        <td>${esc(f.title_ar)}</td>
        <td>${REGION_AR[f.region] ?? f.region}</td>
        <td><span class="sev sev-${f.severity}">${f.severity}</span></td>
        <td>${f.target_date ?? "—"}</td>
        <td>${f.status === "overdue" ? "متأخرة" : f.status}</td>
      </tr>`,
    )
    .join("");

  const title = ar
    ? "تقرير جاهزية التفتيش — الامتثال HCIS"
    : "Inspection Readiness Report — HCIS Compliance";

  return `<!doctype html><html dir="${dir}" lang="${ar ? "ar" : "en"}"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Cairo", Tahoma, system-ui, sans-serif; color: #0f172a; margin: 0; direction: ${dir}; }
  .wrap { max-width: 820px; margin: 0 auto; padding: 24px; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0e7490; padding-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 800; color: #0e7490; letter-spacing: 1px; }
  .brand small { display:block; font-size: 11px; color:#475569; font-weight:600; letter-spacing:0; }
  .meta { text-align: ${ar ? "left" : "right"}; font-size: 12px; color: #475569; }
  h1 { font-size: 18px; margin: 22px 0 6px; color:#0f172a; }
  h2 { font-size: 14px; margin: 22px 0 8px; color:#0e7490; border-inline-start: 4px solid #0e7490; padding-inline-start: 8px; }
  p.lead { font-size: 13px; line-height: 1.9; color:#334155; }
  .kpi { display:flex; gap:14px; margin: 14px 0; }
  .kpi .box { flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:14px; text-align:center; }
  .kpi .big { font-size: 30px; font-weight:800; }
  .kpi .lbl { font-size: 11px; color:#64748b; margin-top:4px; }
  table { width:100%; border-collapse: collapse; font-size: 12px; margin: 8px 0 4px; }
  th, td { border:1px solid #e2e8f0; padding: 7px 9px; text-align: ${ar ? "right" : "left"}; }
  th { background:#f1f5f9; color:#334155; font-weight:700; }
  .bar { height:8px; background:#eef2f6; border-radius:6px; overflow:hidden; min-width:120px; }
  .bar span { display:block; height:100%; border-radius:6px; }
  .sev { padding:1px 8px; border-radius:20px; font-size:10px; font-weight:700; }
  .sev-critical { background:#fee2e2; color:#b91c1c; }
  .sev-high { background:#ffedd5; color:#c2410c; }
  .sev-medium { background:#fef3c7; color:#b45309; }
  .sev-low { background:#cffafe; color:#0e7490; }
  .sign { margin-top: 40px; display:flex; justify-content:space-between; align-items:flex-end; }
  .sign .line { border-top:1px solid #94a3b8; width:220px; padding-top:6px; font-size:12px; color:#475569; text-align:center; }
  .qr { width:96px; height:96px; border:1px solid #e2e8f0; border-radius:8px; display:grid; place-items:center; font-size:9px; color:#94a3b8; text-align:center; }
  .foot { margin-top: 26px; border-top:1px solid #e2e8f0; padding-top:10px; font-size:10px; color:#94a3b8; text-align:center; }
  @media print { .noprint { display:none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="wrap">
  <div class="head">
    <div class="brand">NEXIOS AI OS<small>${ar ? "نظام إنجاز الأعمال التنفيذية" : "Executive Delivery Platform"}</small></div>
    <div class="meta">${ar ? "التاريخ" : "Date"}: ${dateStr}<br>${esc(regionLabel)}</div>
  </div>

  <h1>${esc(title)}</h1>
  <button class="noprint" onclick="window.print()" style="margin:8px 0;padding:8px 18px;border:0;border-radius:8px;background:#0e7490;color:#fff;font-weight:700;cursor:pointer">${ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button>

  <h2>${ar ? "الملخّص التنفيذي" : "Executive Summary"}</h2>
  <p class="lead">${
    ar
      ? `بلغت نسبة الامتثال الكلية <b>${data.overallPct}%</b> عبر المناطق الأربع، مع <b>${data.findings.total}</b> ملاحظة مفتوحة منها <b>${data.findings.overdue}</b> متأخرة عن موعدها المستهدف. يوصى بمعالجة الفجوات الحرجة أولاً قبل موعد التفتيش القادم.`
      : `Overall compliance is <b>${data.overallPct}%</b> across the four regions, with <b>${data.findings.total}</b> open findings (<b>${data.findings.overdue}</b> overdue). Prioritize critical gaps before the next inspection.`
  }</p>

  <div class="kpi">
    <div class="box"><div class="big" style="color:${pctColor(data.overallPct)}">${data.overallPct}%</div><div class="lbl">${ar ? "الامتثال الكلي" : "Overall"}</div></div>
    <div class="box"><div class="big">${data.findings.total}</div><div class="lbl">${ar ? "ملاحظات مفتوحة" : "Open findings"}</div></div>
    <div class="box"><div class="big" style="color:#dc2626">${data.findings.overdue}</div><div class="lbl">${ar ? "متأخرة" : "Overdue"}</div></div>
  </div>

  <h2>${ar ? "الامتثال حسب المنطقة" : "Compliance by region"}</h2>
  <table><thead><tr><th>${ar ? "المنطقة" : "Region"}</th><th>%</th><th></th></tr></thead><tbody>${regionRows}</tbody></table>

  <h2>${ar ? "الامتثال حسب الفئة" : "Compliance by category"}</h2>
  <table><thead><tr><th>${ar ? "الفئة" : "Category"}</th><th>%</th><th>${ar ? "عدد البنود" : "Items"}</th></tr></thead><tbody>${catRows}</tbody></table>

  <h2>${ar ? "سجل الفجوات وخطط المعالجة (CAP)" : "Findings & Corrective Action Plans"}</h2>
  <table><thead><tr><th>${ar ? "الملاحظة" : "Finding"}</th><th>${ar ? "المنطقة" : "Region"}</th><th>${ar ? "الخطورة" : "Severity"}</th><th>${ar ? "الموعد" : "Target"}</th><th>${ar ? "الحالة" : "Status"}</th></tr></thead><tbody>${findingRows}</tbody></table>

  <div class="sign">
    <div class="line">${ar ? "توقيع مدير الأمن الصناعي" : "Industrial Security Director"}</div>
    <div class="qr">${ar ? "رمز التحقق" : "Verify QR"}</div>
  </div>

  <div class="foot">${ar ? "بيانات محاكاة واقعية الطابع — NEXIOS AI OS" : "Realistic simulation data — NEXIOS AI OS"} · ${dateStr}</div>
</div>
</body></html>`;
}
