// وكيل التقارير — محرك توليد التقارير المستمر (Reports Agent Engine)
// وكيل يعمل باستمرار في الخلفية لتوليد تقارير مؤسسية موجزة عبر المناطق
// والقطاعات، ويكشف عنها للواجهة للعرض والتصدير (CSV/HTML/PDF عبر الطباعة).

export type ReportKind =
  | "compliance"
  | "safety"
  | "operations"
  | "permits"
  | "incidents"
  | "audit";

export type ReportStatus = "generating" | "ready" | "archived";

export interface ReportRecord {
  id: string;
  createdAt: number;
  titleAr: string;
  regionAr: string;
  kind: ReportKind;
  status: ReportStatus;
  summaryAr: string;
  metrics: { label: string; value: string }[];
}

const KIND_LABEL_AR: Record<ReportKind, string> = {
  compliance: "امتثال",
  safety: "سلامة",
  operations: "عمليات",
  permits: "تصاريح",
  incidents: "حوادث",
  audit: "تدقيق",
};

export const KIND_LABEL_AR_MAP = KIND_LABEL_AR;

const REGIONS_AR = ["الوسطى", "الغربية", "الشرقية", "الجنوبية"] as const;
const KINDS: ReportKind[] = ["compliance", "safety", "operations", "permits", "incidents", "audit"];

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

let counter = 0;
export function buildReport(nowMs = Date.now()): ReportRecord {
  counter += 1;
  const kind = pick(KINDS, counter);
  const region = pick(REGIONS_AR, counter + 1);
  const id = `RPT-${nowMs.toString(36).toUpperCase()}-${counter.toString(36).toUpperCase()}`;
  const kindAr = KIND_LABEL_AR[kind];
  return {
    id,
    createdAt: nowMs,
    titleAr: `تقرير ${kindAr} — المنطقة ${region}`,
    regionAr: region,
    kind,
    status: "ready",
    summaryAr: `مراجعة دورية للحالة التشغيلية في المنطقة ${region} ضمن مسار ${kindAr}. رصد المؤشرات، مطابقة التوجيهات، وتوثيق الإجراءات.`,
    metrics: [
      { label: "المهام", value: String(20 + ((counter * 7) % 80)) },
      { label: "الإنجاز%", value: String(70 + ((counter * 3) % 30)) },
      { label: "المخاطر", value: String((counter * 2) % 12) },
      { label: "الملاحظات", value: String((counter * 5) % 15) },
    ],
  };
}

export function toCsv(rows: ReportRecord[]): string {
  const header = ["المعرّف", "التاريخ", "العنوان", "المنطقة", "النوع", "الحالة", "الملخص"];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.titleAr,
      r.regionAr,
      KIND_LABEL_AR[r.kind],
      r.status,
      r.summaryAr,
    ]
      .map(esc)
      .join(","),
  );
  return "\uFEFF" + [header.map(esc).join(","), ...body].join("\n");
}

export function toPrintableHtml(rows: ReportRecord[]): string {
  const items = rows
    .map(
      (r) => `
    <article class="rpt">
      <header>
        <h2>${r.titleAr}</h2>
        <div class="meta">${r.id} · ${new Date(r.createdAt).toLocaleString("ar-SA")} · ${KIND_LABEL_AR[r.kind]}</div>
      </header>
      <p>${r.summaryAr}</p>
      <ul>${r.metrics.map((m) => `<li><b>${m.label}:</b> ${m.value}</li>`).join("")}</ul>
    </article>`,
    )
    .join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
    <title>تقارير NEXIOS — وكيل التقارير</title>
    <style>
      body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#fff;color:#0A1A2E;padding:24px}
      h1{color:#00577A;border-bottom:2px solid #00D4FF;padding-bottom:8px}
      .rpt{border:1px solid #cfe6ef;border-radius:12px;padding:14px 18px;margin:12px 0;page-break-inside:avoid}
      .rpt h2{margin:0 0 4px;color:#003a52;font-size:16px}
      .meta{color:#5a6a7a;font-size:12px;margin-bottom:8px}
      ul{display:flex;gap:16px;flex-wrap:wrap;padding:0;list-style:none;margin:8px 0 0}
      li{background:#eaf7fb;border-radius:6px;padding:4px 10px;font-size:13px}
      @media print{ body{padding:8mm} }
    </style></head><body>
    <h1>وكيل التقارير — NEXIOS</h1>
    <div>عدد التقارير: ${rows.length} · تم التوليد: ${new Date().toLocaleString("ar-SA")}</div>
    ${items}
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
  </body></html>`;
}
