#!/usr/bin/env node
/**
 * يحوّل «سجل الصيانة التصحيحية» (xlsx) إلى دفعات SQL لجدول `maint_orders`.
 *
 *   node --experimental-strip-types scripts/import-cm-log.mjs <file.xlsx> <out-dir>
 *
 * **البيانات الحقيقية لا تدخل المستودع** (قرار المالك ٢٠٢٦/١٠/٠٦: خلف الدخول
 * وحده): مجلّد الإخراج يُرفض إن كان داخل المستودع، والدفعات تُنفَّذ على الإنتاج
 * مباشرةً. القواعد من `src/lib/maintenance/cm-log-rules.ts` نفسها التي تقرؤها
 * الواجهة — مصدرٌ واحد.
 *
 * idempotent: `on conflict (org_id, source, source_row) do update` — إعادة
 * التشغيل تُحدّث الصفّ نفسه، ولا تمسّ ما تقدّم فيه الفني بعد الاستيراد:
 * **أعمدة سير العمل** (`WORKFLOW_OWNED`) تُحفظ متى خرج الصفّ من مرحلة الاستيراد
 * (`imported_untouched = false`).
 *
 * درسٌ مقيس على الإنتاج (٢٠٢٦/١٠/٠٦): أغلق مسؤولٌ أمرًا مستوردًا من الواجهة،
 * ثم أُعيد إرسال صفّه من الملف فمسح `completed_at` (الملف بلا تاريخ إنجاز
 * للموقوف) مع أن المرحلة والحالة حُفظتا — فصار الأمر «مُنجزًا» بلا تاريخ. أُعيد
 * التاريخ من سجلّ أحداثه، وصار `completed_at` من أعمدة سير العمل.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { toMaintOrder } from "../src/lib/maintenance/cm-log-rules.ts";

const [, , input, outDir, batchArg] = process.argv;
if (!input || !outDir) {
  console.error("usage: import-cm-log.mjs <file.xlsx> <out-dir> [batch-size]");
  process.exit(2);
}
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(outDir);
const rel = relative(repo, out);
if (!rel.startsWith("..") && !isAbsolute(rel)) {
  console.error(`refusing: out-dir ${out} is inside the repository — real data stays out of git`);
  process.exit(2);
}

const wb = XLSX.read(readFileSync(input), { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
/** @type {unknown[][]} */
const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

const seen = new Map();
const orders = [];
let skipped = 0;
for (let i = 1; i < grid.length; i++) {
  const r = grid[i] ?? [];
  const o = toMaintOrder(
    {
      no: r[0],
      city: r[1],
      site: r[2],
      system: r[3],
      component: r[4],
      status: r[5],
      requested: r[6],
      due: r[8],
      completed: r[9],
      sapWo: r[11],
      po: r[12],
      boqItem: r[13],
      qty: r[14],
      serviceCost: r[15],
      maintenanceCost: r[16],
      sparesCost: r[17],
      penalty: r[18],
      notes: r[19],
    },
    i + 1,
    seen,
  );
  if (o) orders.push(o);
  else if (r.slice(0, 10).some((v) => v !== null && String(v).trim() !== "")) skipped++;
}

const lit = (v) =>
  v === null || v === undefined
    ? "null"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

// `delay_days` و`progress_pct` لا يُخزَّنان: يحسبهما العرض `maint_orders_v`.
const COLS = [
  "ref",
  "source_row",
  "city",
  "site",
  "system",
  "component",
  "status",
  "stage",
  "hold_reason",
  "requested_at",
  "due_at",
  "completed_at",
  "sap_wo",
  "po",
  "boq_item",
  "qty",
  "service_cost",
  "maintenance_cost",
  "spares_cost",
  "delay_penalty",
  "notes",
];
/** نوع كل عمود في `values` — PostgreSQL يستنتج text لما لا يُصرَّح به. */
const CAST = {
  source_row: "integer",
  requested_at: "date",
  due_at: "date",
  completed_at: "date",
  qty: "numeric",
  service_cost: "numeric",
  maintenance_cost: "numeric",
  spares_cost: "numeric",
  delay_penalty: "numeric",
};

/**
 * أعمدةٌ يملكها سير العمل بعد أول تحديثٍ من الفني أو المدير — إعادة الاستيراد
 * لا تكتب فوقها (`maint_advance_stage`/`maint_set_status` هي التي تكتبها).
 */
const WORKFLOW_OWNED = ["status", "stage", "hold_reason", "completed_at"];

const size = Number(batchArg) || 150;
mkdirSync(out, { recursive: true });
let files = 0;
for (let b = 0; b < orders.length; b += size) {
  const chunk = orders.slice(b, b + size);
  const values = chunk.map((o) => `(${COLS.map((c) => lit(o[c])).join(", ")})`).join(",\n");
  const sql = `insert into public.maint_orders (org_id, source, stage_basis, imported_untouched, ${COLS.join(", ")})
select '00000000-0000-0000-0000-000000000001'::uuid, 'cm_log', 'import_evidence', true,
  ${COLS.map((c) => (CAST[c] ? `v.${c}::${CAST[c]}` : `v.${c}`)).join(", ")}
from (values
${values}
) as v(${COLS.join(", ")})
on conflict (org_id, source, source_row) do update set
${COLS.filter((c) => c !== "source_row" && !WORKFLOW_OWNED.includes(c))
  .map((c) => `  ${c} = excluded.${c}`)
  .join(",\n")},
${WORKFLOW_OWNED.map(
  (c) =>
    `  ${c} = case when maint_orders.imported_untouched then excluded.${c} else maint_orders.${c} end`,
).join(",\n")};
`;
  writeFileSync(resolve(out, `batch-${String(++files).padStart(2, "0")}.sql`), sql);
}

const by = (k) =>
  Object.entries(
    orders.reduce((m, o) => ((m[o[k] ?? "∅"] = (m[o[k] ?? "∅"] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);
writeFileSync(
  resolve(out, "summary.json"),
  JSON.stringify(
    {
      orders: orders.length,
      skipped,
      files,
      status: by("status"),
      stage: by("stage"),
      hold: by("hold_reason"),
    },
    null,
    2,
  ),
);
console.log(`orders=${orders.length} skipped=${skipped} batches=${files} → ${out}`);
