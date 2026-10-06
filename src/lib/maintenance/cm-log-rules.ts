/**
 * قواعد تحويل «سجل الصيانة التصحيحية» (CM LOG) إلى أوامر عمل — أمر المالك
 * ٢٠٢٦/١٠/٠٦: «حدد وكوّن أمر العمل اللازم … حدد نسبة الإنجاز لكل أمر عمل».
 *
 * دوالّ خالصة بلا اعتماديات: تُستورد من الواجهة ومن سكربت الاستيراد
 * (`scripts/import-cm-log.mjs` عبر `node --experimental-strip-types`)، فتُكتب
 * بصياغة TypeScript قابلة للنزع وحدها (لا enum ولا namespace ولا parameter
 * properties).
 *
 * ## نسبة الإنجاز — مراحل موزونة لا تقدير
 * دورة الصيانة التصحيحية ثماني مراحل، لكل مرحلة وزنها الثابت. النسبة تُقرأ من
 * المرحلة الحالية وحدها، فلا تُكتب يدويًّا ولا «تُقدَّر». والملغى بلا نسبة.
 *
 * ## المستورد: المرحلة من الأدلة في الملف وحدها
 * الملف لا يحمل مرحلة؛ يحمل الحالة وملاحظة الفني. فالمرحلة تُشتق من دليلٍ
 * مكتوب: «مكتمل» ⇐ ١٠٠ · ملاحظة تقول إن الإصلاح تمّ والعمل يعمل ⇐ اختبار ·
 * ملاحظة تطلب قطعة أو استبدالًا أو اعتمادًا ⇐ بانتظار قطع غيار · تشخيص جارٍ ⇐
 * وصل الموقع · ملاحظة فنية أخرى ⇐ مُشخَّص · لا ملاحظة ⇐ مسجَّل. لا مرحلة أعلى
 * من دليلها.
 */

export const STAGES = [
  "registered",
  "assigned",
  "on_site",
  "diagnosed",
  "awaiting_parts",
  "repairing",
  "testing",
  "closed",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_PCT: Record<Stage, number> = {
  registered: 10,
  assigned: 20,
  on_site: 35,
  diagnosed: 50,
  awaiting_parts: 60,
  repairing: 75,
  testing: 90,
  closed: 100,
};

export const STAGE_AR: Record<Stage, string> = {
  registered: "مسجَّل",
  assigned: "مُسنَد لفني",
  on_site: "الفني في الموقع",
  diagnosed: "تم التشخيص",
  awaiting_parts: "بانتظار قطع غيار",
  repairing: "قيد الإصلاح",
  testing: "اختبار وتشغيل",
  closed: "مغلق ومُنجَز",
};

export type OrderStatus = "open" | "on_hold" | "completed" | "cancelled";

export const STATUS_AR: Record<OrderStatus, string> = {
  open: "مفتوح",
  on_hold: "موقوف",
  completed: "مُنجَز",
  cancelled: "ملغى",
};

/** نسبة الإنجاز: من المرحلة وحدها، والملغى بلا نسبة (`null` لا صفر). */
export function progressOf(stage: Stage, status: OrderStatus): number | null {
  if (status === "cancelled") return null;
  if (status === "completed") return 100;
  return STAGE_PCT[stage];
}

/** المرحلة التالية في الدورة — `null` بعد الإغلاق. */
export function nextStage(stage: Stage): Stage | null {
  const i = STAGES.indexOf(stage);
  return i < 0 || i === STAGES.length - 1 ? null : STAGES[i + 1];
}

// ── الأنظمة والمدن ─────────────────────────────────────────────────────────
export type SystemCode = "CCTV" | "GATE" | "ACS" | "VISIT";
export const SYSTEM_AR: Record<SystemCode, string> = {
  CCTV: "كاميرات المراقبة",
  GATE: "البوابات والحواجز",
  ACS: "التحكم في الدخول",
  VISIT: "زيارة فنية",
};

export const CITY_AR: Record<string, string> = {
  JEDDAH: "جدة",
  MAKKAH: "مكة المكرمة",
  MADINAH: "المدينة المنورة",
  TABUK: "تبوك",
  TAIF: "الطائف",
};

// ── سبب الإيقاف — من ملاحظة الفني ──────────────────────────────────────────
export type HoldReason =
  | "approval"
  | "power"
  | "site_not_ready"
  | "access"
  | "it_support"
  | "civil_cabling"
  | "spare_parts"
  | "troubleshooting";

export const HOLD_REASON_AR: Record<HoldReason, string> = {
  approval: "بانتظار اعتماد أو توجيه",
  power: "لا تغذية كهربائية",
  site_not_ready: "الموقع غير جاهز",
  access: "تعذّر الوصول أو معدّة رفع",
  it_support: "يحتاج دعم تقنية المعلومات",
  civil_cabling: "أعمال مدنية وكابلات",
  spare_parts: "قطع غيار أو استبدال",
  troubleshooting: "التشخيص جارٍ",
};

/**
 * الترتيب أولوية: العائق الخارجي يسبق الفني. ملاحظة «لا تغذية ٢٢٠ف … واللوحة
 * تالفة نحتاج تغييرها» عائقها الكهرباء أولًا — لا يُركَّب بديلٌ بلا تغذية.
 * و«نحتاج استبدالها ولا اعتماد لقطع الغيار» عائقها الاعتماد.
 */
const HOLD_RULES: ReadonlyArray<readonly [HoldReason, RegExp]> = [
  ["approval", /approv|awaiting instruction|re-?design|discuss with|as per sec we need/i],
  ["power", /no power|power supply 220|power outage|without electrical power|no electrical/i],
  ["site_not_ready", /under construction|another contractor|construction work|renew the site/i],
  ["access", /man[\s-]?lift|special key|no access|cannot access|can't access|ceiling|silling/i],
  ["it_support", /\bisp\b|\bit team|it\/sec|ccit network|support of it|it room.*down|server/i],
  [
    "civil_cabling",
    /\bdig|digging|diging|cable route|civil|\bcut\b|cutting|new (utp|cat ?6|fiber|cable)/i,
  ],
  [
    "spare_parts",
    /replac|need(s)? (to )?change|need changes|need new|provide|damage|faulty|no hydraulic oil|\boil\b/i,
  ],
  ["troubleshooting", /on ?going|continue troubleshoot|under observation|will check/i],
];

export function classifyHoldReason(note: string | null | undefined): HoldReason | null {
  const n = (note ?? "").trim();
  if (n.length < 3) return null;
  for (const [reason, re] of HOLD_RULES) if (re.test(n)) return reason;
  return null;
}

const WORKING_NOW =
  /now working properly|working properly now|is now working|now (it'?s )?working|already prepai?re/i;

/** المرحلة من دليل الملف وحده (انظر رأس الوحدة). */
export function stageFromEvidence(status: OrderStatus, note: string | null | undefined): Stage {
  if (status === "completed") return "closed";
  const n = (note ?? "").trim();
  if (n.length < 3) return "registered";
  if (WORKING_NOW.test(n)) return "testing";
  const reason = classifyHoldReason(n);
  if (reason === "spare_parts" || reason === "approval") return "awaiting_parts";
  if (reason === "troubleshooting") return "on_site";
  return "diagnosed";
}

// ── التنظيف ────────────────────────────────────────────────────────────────
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const MAC = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;

/** قرار المالك: عناوين الشبكة لا تدخل النظام — تُحجب عند الاستيراد. */
export function maskNetworkIds(text: string): string {
  return text.replace(IPV4, "[عنوان IP محجوب]").replace(MAC, "[عنوان MAC محجوب]");
}

export function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" || s === "-" ? null : s;
}

export function normalizeStatus(v: unknown): OrderStatus | null {
  const s = (cleanText(v) ?? "").toUpperCase();
  if (s === "COMPLETED") return "completed";
  if (s === "HOLD BY SE") return "on_hold";
  if (s === "OPEN CASE") return "open";
  if (s === "CANCEL") return "cancelled";
  return null;
}

export function normalizeSystem(v: unknown): SystemCode | null {
  const s = (cleanText(v) ?? "").toUpperCase();
  return s === "CCTV" || s === "GATE" || s === "ACS" || s === "VISIT" ? s : null;
}

/** رقم أمر SAP: أرقام فقط، و«NEED SAP» وأشباهها ⇐ `null` (معلَّق). */
export function normalizeSapWo(v: unknown): string | null {
  const s = cleanText(v);
  return s && /^\d{6,}$/.test(s) ? s : null;
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = cleanText(v);
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** تاريخ ISO (يوم) من خلية Excel — `Date` أو رقم تسلسلي أو نص. */
export function toIsoDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 30000 && v < 80000) {
    // نظام Excel ١٩٠٠: اليوم ٢٥٥٦٩ = ١٩٧٠/٠١/٠١.
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = cleanText(v);
  if (s && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

const DAY = 86400000;
/**
 * أيام التأخير تُعاد حسابًا من التاريخين — عمود الملف يطرح من خلية فارغة فيعطي
 * ‎-45838 لكل حالة مفتوحة. المُنجز قبل موعده تأخيره صفر، وبلا تاريخين `null`.
 */
export function delayDays(dueIso: string | null, doneIso: string | null): number | null {
  if (!dueIso || !doneIso) return null;
  const d = Math.round((Date.parse(doneIso) - Date.parse(dueIso)) / DAY);
  return Number.isFinite(d) ? Math.max(0, d) : null;
}

export interface CmRow {
  readonly no: unknown;
  readonly city: unknown;
  readonly site: unknown;
  readonly system: unknown;
  readonly component: unknown;
  readonly status: unknown;
  readonly requested: unknown;
  readonly due: unknown;
  readonly completed: unknown;
  readonly sapWo: unknown;
  readonly po: unknown;
  readonly boqItem: unknown;
  readonly qty: unknown;
  readonly serviceCost: unknown;
  readonly maintenanceCost: unknown;
  readonly sparesCost: unknown;
  readonly penalty: unknown;
  readonly notes: unknown;
}

export interface MaintOrderImport {
  ref: string;
  source_row: number;
  city: string | null;
  site: string | null;
  system: SystemCode | null;
  component: string | null;
  status: OrderStatus;
  stage: Stage;
  progress_pct: number | null;
  hold_reason: HoldReason | null;
  requested_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  delay_days: number | null;
  sap_wo: string | null;
  po: string | null;
  boq_item: string | null;
  qty: number | null;
  service_cost: number | null;
  maintenance_cost: number | null;
  spares_cost: number | null;
  delay_penalty: number | null;
  notes: string | null;
}

/**
 * صفّ الملف ⇐ أمر عمل. `sourceRow` رقم الصفّ في الورقة (فريد ومفتاح
 * idempotency)، و`ref` من رقم الطلب — والمكرَّر فيه يُميَّز
 * بلاحقة من الصفّ لا بإسقاطه.
 */
export function toMaintOrder(
  row: CmRow,
  sourceRow: number,
  seenNos: Map<string, number>,
): MaintOrderImport | null {
  const status = normalizeStatus(row.status);
  if (!status) return null;
  const no = cleanText(row.no) ?? String(sourceRow);
  const seen = seenNos.get(no) ?? 0;
  seenNos.set(no, seen + 1);
  const ref = `CM-${no.padStart(4, "0")}${seen ? `-${seen + 1}` : ""}`;
  const rawNote = cleanText(row.notes);
  const notes = rawNote ? maskNetworkIds(rawNote) : null;
  const due = toIsoDate(row.due);
  const done = status === "completed" ? toIsoDate(row.completed) : null;
  const stage = stageFromEvidence(status, notes);
  const active = status === "open" || status === "on_hold";
  return {
    ref,
    source_row: sourceRow,
    city: cleanText(row.city)?.toUpperCase() ?? null,
    site: cleanText(row.site),
    system: normalizeSystem(row.system),
    component: cleanText(row.component),
    status,
    stage,
    progress_pct: progressOf(stage, status),
    hold_reason: active ? classifyHoldReason(notes) : null,
    requested_at: toIsoDate(row.requested),
    due_at: due,
    completed_at: done,
    delay_days: status === "completed" ? delayDays(due, done) : null,
    sap_wo: normalizeSapWo(row.sapWo),
    po: cleanText(row.po),
    boq_item: cleanText(row.boqItem),
    qty: toNumber(row.qty),
    service_cost: toNumber(row.serviceCost),
    maintenance_cost: toNumber(row.maintenanceCost),
    spares_cost: toNumber(row.sparesCost),
    delay_penalty: toNumber(row.penalty),
    notes,
  };
}
