#!/usr/bin/env node
/**
 * يحوّل «تصدير SAP PM» (IW38، xlsx) إلى دفعات SQL لجدول `maint_orders` —
 * أمر المالك ٢٠٢٦/١٠/٠٦: «اعتمد هذه البيانات المرفقة كبيانات فعلية وحقيقية».
 *
 *   node --experimental-strip-types scripts/import-sap-export.mjs \
 *     <sap.xlsx> <cm-log.xlsx> <out-dir> [batch-size]
 *
 * - **البيانات الحقيقية لا تدخل المستودع**: مجلّد الإخراج يُرفض داخل المستودع.
 * - **لا ازدواج مع سجل CM**: أمرٌ رقمه في عمود «SAP W.O» لصفّ من السجل هو
 *   العمل نفسه مسجَّلًا مرّتين — فلا يُنشأ له صفّ ثانٍ، بل يُثرى صفّ السجل
 *   بأعمدة SAP (`sap-link.sql`) دون مساس بحالته أو مرحلته.
 * - **idempotent** على `(org_id, 'sap', source_row)`، وأعمدة سير العمل
 *   (`WORKFLOW_OWNED`) لا يكتب فوقها الاستيراد متى مسّها فنيّ أو مدير — الدرس
 *   المقيس في `import-cm-log.mjs`.
 * - القواعد من `src/lib/maintenance/sap-export-rules.ts` وحدها — مصدرٌ واحد.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { normalizeSapWo } from "../src/lib/maintenance/cm-log-rules.ts";
import { toSapOrder } from "../src/lib/maintenance/sap-export-rules.ts";

const [, , sapInput, cmInput, outDir, batchArg] = process.argv;
if (!sapInput || !cmInput || !outDir) {
  console.error("usage: import-sap-export.mjs <sap.xlsx> <cm-log.xlsx> <out-dir> [batch-size]");
  process.exit(2);
}
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(outDir);
const rel = relative(repo, out);
if (!rel.startsWith("..") && !isAbsolute(rel)) {
  console.error(`refusing: out-dir ${out} is inside the repository — real data stays out of git`);
  process.exit(2);
}

const grid = (file) => {
  const wb = XLSX.read(readFileSync(file), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    raw: true,
    defval: null,
  });
};

// أرقام SAP المذكورة في سجل CM — العمل المشترك بين المصدرين.
const cmSap = new Set();
for (const r of grid(cmInput).slice(1)) {
  const wo = normalizeSapWo(r?.[11]);
  if (wo) cmSap.add(wo);
}

const orders = [];
const links = [];
const skipped = [];
const sap = grid(sapInput);
for (let i = 1; i < sap.length; i++) {
  const r = sap[i] ?? [];
  if (!r.some((v) => v !== null && String(v).trim() !== "")) continue;
  const o = toSapOrder(r, i + 1);
  if ("reason" in o) skipped.push(o);
  else if (cmSap.has(o.sap_wo)) links.push(o);
  else orders.push(o);
}

const lit = (v) =>
  v === null || v === undefined
    ? "null"
    : typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : `'${String(v).replace(/'/g, "''")}'`;

const COLS = [
  "ref",
  "source_row",
  "kind",
  "region",
  "site",
  "system",
  "component",
  "description",
  "priority",
  "status",
  "stage",
  "requested_at",
  "due_at",
  "sap_wo",
  "maintenance_cost",
  "planned_cost",
  "functional_location",
  "equipment",
  "planner_group",
  "entered_by_staff",
  "plan_generated",
  "sla_text",
  "sap_system_status",
  "notification",
  "maintenance_plan",
  "maintenance_cycle",
];
const CAST = {
  source_row: "integer",
  requested_at: "date",
  due_at: "date",
  maintenance_cost: "numeric",
  planned_cost: "numeric",
  plan_generated: "boolean",
};
/** أعمدةٌ يملكها سير العمل بعد أول تحديث — لا يكتب فوقها الاستيراد. */
const WORKFLOW_OWNED = ["status", "stage"];

const size = Number(batchArg) || 100;
mkdirSync(out, { recursive: true });
let files = 0;
for (let b = 0; b < orders.length; b += size) {
  const chunk = orders.slice(b, b + size);
  const values = chunk.map((o) => `(${COLS.map((c) => lit(o[c])).join(", ")})`).join(",\n");
  const sql = `insert into public.maint_orders (org_id, source, stage_basis, imported_untouched, ${COLS.join(", ")})
select '00000000-0000-0000-0000-000000000001'::uuid, 'sap', 'import_evidence', true,
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
  writeFileSync(resolve(out, `sap-batch-${String(++files).padStart(2, "0")}.sql`), sql);
}

// إثراء صفوف السجل المشتركة: أعمدة SAP الوصفية وحدها — لا حالة ولا مرحلة ولا
// تاريخ (السجل مصدرها، وسير العمل مالكها بعده).
const LINK_COLS = [
  "functional_location",
  "equipment",
  "planner_group",
  "entered_by_staff",
  "plan_generated",
  "sla_text",
  "sap_system_status",
  "notification",
  "maintenance_plan",
  "maintenance_cycle",
  "planned_cost",
];
const linkSql = links
  .map(
    (o) =>
      `update public.maint_orders set ${LINK_COLS.map((c) => `${c} = ${lit(o[c])}${CAST[c] ? `::${CAST[c]}` : ""}`).join(", ")}
 where org_id = '00000000-0000-0000-0000-000000000001' and source = 'cm_log' and sap_wo = ${lit(o.sap_wo)};`,
  )
  .join("\n");
writeFileSync(resolve(out, "sap-link.sql"), `${linkSql}\n`);

const by = (k) =>
  Object.entries(
    orders.reduce((m, o) => ((m[o[k] ?? "∅"] = (m[o[k] ?? "∅"] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);
writeFileSync(
  resolve(out, "sap-summary.json"),
  JSON.stringify(
    {
      orders: orders.length,
      linked_to_cm: links.length,
      skipped,
      files,
      kind: by("kind"),
      status: by("status"),
      stage: by("stage"),
      region: by("region"),
      system: by("system"),
    },
    null,
    2,
  ),
);
console.log(
  `orders=${orders.length} linked=${links.length} skipped=${skipped.length} batches=${files} → ${out}`,
);
