/**
 * حالة شريط الرئيسية — أربعة بنودٍ حيّة بدل سطور الدعاية (أمر المالك ٢٠٢٦/١٠/٢٤ بنصّه:
 * «شريط الإعلانات يعكس الحالة الأمنية بأيقونة ترفع أو تنزل مع نوعها، والصيانة، والبلاغات،
 * والمشاريع»). وحدةٌ **خالصة**: تأخذ نتائج القراءات المشتركة (`useHomeReads`) وتُعيد البنود؛ لا
 * جلب ولا React ولا ساعة. فتُجرَّب كل قاعدة هنا بلا شاشة (`home-ticker-status.test.ts`).
 *
 * ## ما هو قياسٌ وما هو قاعدةُ عرض — اقرأ هذا قبل اعتماد العتبات
 *
 * الأرقام في البنود مقيسةٌ مسنودةٌ بموضعها (الخريطة في آخر `home-reference.ts`). أمّا **نوع الحالة
 * الأمنية** (مستقرة · تحت المراقبة · مرتفعة المخاطر · حرجة) فـ**قاعدةُ عرضٍ مؤلَّفة لا قياس**:
 * العتبات أدناه (`POSTURE_THRESHOLDS`) اقتراحٌ ينتظر اعتماد المالك أو تغييره، وليست من القاعدة ولا
 * من مصدرٍ تنظيمي. وهي تنسخ عمدًا — بنصّ أمر المالك أعلاه — القاعدة التي كانت تمنع اشتقاق حكمٍ
 * من نسبة الامتثال (`command-center.functions.ts`: «عتبات مؤلَّفة ممنوع»)؛ لذلك حُصرت في هذا الملف
 * وحده، وتسمّى للعارض «قاعدة عرض» لا «قياس»، ويحرس العقد أن لا تتسرّب إلى غيره.
 *
 * ## القواعد (كلّها هنا، وكلّها تُختبر)
 *
 * • **الحالة الأمنية** من مؤشر «الحالة الأمنية العامة» (`chooseLive`: متوسط امتثال المناطق المقيسة
 *   حين يصل، وإلا المرجع الموسوم). النوع من القيمة **المعروضة مقرَّبةً** (فلا يقول الرقمُ ٩٠٪
 *   والكلمةُ «تحت المراقبة» لأنّ الحقيقة ٨٩٫٦): ‏≥ 90 مستقرة (دائرة) · 75–89 تحت المراقبة (مثلث) ·
 *   60–74 مرتفعة المخاطر (مثلث) · < 60 حرجة (مثمّن). **التصعيد:** بلاغٌ حرجٌ مفتوح *مقيسٌ حيّ*
 *   (> 0) يرفع النوع درجةً واحدة (لا أكثر؛ والحرجة تبقى حرجة). لا تصعيد من بلاغاتٍ غير مقيسة
 *   الشدّة (`null`) ولا من مرجع.
 * • **الاتجاه** سهمٌ من **تغيّرٍ مقيس** وحده: ‏`change` المرجع الموسوم حين يُعرض المرجع، وللقيمة
 *   الحيّة لا تغيّر (`null`) ⇒ شرطةٌ محايدة «لم يُقَس» لا سهمٌ مختلَق. ودلالة الارتفاع **صريحةٌ
 *   لكل مقياس** (`TREND_UP_IS_GOOD`): ارتفاع الامتثال إيجابي، وارتفاع البلاغات المفتوحة سلبي.
 * • **الصيانة** من `getMaintSummary` حصرًا — بيانات حقيقية، **لا محاكاة ولا مرجع بديل أبدًا**
 *   (استثناء الصيانة في CLAUDE.md): تأخّر > 0 ⇒ تحذير «متأخرات»؛ لا تأخّر ⇒ سليم «منتظمة»؛
 *   لا أوامر نشطة ⇒ سليم «لا أوامر نشطة»؛ التأخّر غير مقيس ⇒ معلومة «لم يُقَس». فشل القراءة ⇒
 *   «تعذّر القراءة» بلا أرقام. ونسخة التصدير (`source: "export"`) تُوسم «تصدير SAP» ولا تُعدّ
 *   مرجعًا ولا حيّة من القاعدة.
 * • **البلاغات**: المفتوحة من `counts.incidents_open` (المصدر نفسه لبطاقة «الحوادث النشطة»)،
 *   والحرجة المفتوحة من صفوف البلاغات نفسها متى كانت الشدّة مقيسة وحيّة (وإلا «لم يُقَس» — لا صفر).
 *   ‏حرجة > 0 ⇒ خطر «حرجة» (مثمّن)؛ مفتوحة > 0 ⇒ تحذير «تتطلب متابعة» (مثلث)؛ لا مفتوحة ⇒ سليم.
 *   وحين يُعرض المرجع (٧) يُعرض موسومًا بلا عدٍّ حرج (لا مرجع له).
 * • **المشاريع** من `getProjectsSummary` (عدّادات، بلا أسماء — SEC-01): معرّضة للخطر > 0 ⇒ تحذير
 *   «معرّضة للخطر»؛ متأخرة > 0 ⇒ تحذير «متأخرة»؛ مقيَّمة بلا أيٍّ منهما ⇒ سليم «منتظمة»؛ لا صحّة
 *   مقيسة لأيّ جارٍ ⇒ معلومة «الصحّة لم تُقَس». المعرّضة/المتأخرة ما صرّح به المصدر لا ما يُحسب
 *   من التواريخ، وغير المقيَّمة تُعرض عددًا (المادة ٢٧).
 *
 * ## الحال لكل بند
 *
 * `pending` (لم تصل القراءة) ⇒ «جارٍ القراءة» بلا رقم. `error` (فشلت) ⇒ للحالة الأمنية والبلاغات
 * المرجع الموسوم مكانه (كبطاقات المؤشرات)، وللصيانة والمشاريع «تعذّر القراءة» بلا رقم. ولا يُعرض
 * رقمٌ مرجعيّ بلا شارة، ولا حيٌّ بسهمٍ مرجعي.
 */
import type { CommandCenterState } from "@/lib/exec/command-center.functions";
import type { SecOverview } from "@/lib/sec.functions";
import type { MaintSummary } from "@/lib/maintenance/maint-types";
import type { ProjectsSummary } from "@/lib/projects/projects-summary";
import {
  CHANGE_NOT_MEASURED_AR,
  SIMULATION_BADGE_AR,
  chooseLive,
  liveOf,
  refKpi,
  type RefChange,
} from "@/components/home/home-reference";

/* ── النماذج ─────────────────────────────────────────────────────────────── */

/** الشكل يحمل المعنى مع الكلمة: مثمّن خطر · مثلث تحذير · دائرة سليم · معيّن أزرق معلومة محايدة. */
export type TickerTone = "danger" | "warning" | "ok" | "info";
export type TickerKind = "posture" | "maintenance" | "incidents" | "projects";
export type ReadState = "pending" | "error" | "ready";
/** `reference` محاكاة مرجعية موسومة «مرجعي»؛ `export` نسخة تصدير حقيقية لا مرجع. */
export type TickerBadge = "reference" | "export";

export type Bilingual = { readonly ar: string; readonly en: string };

export interface TickerFigure {
  readonly id: string;
  /** فارغٌ ⇒ القيمة وحدها (يتبعها وسم الشارة). */
  readonly label: Bilingual;
  /** `null` ⇒ «لم يُقَس» — ليس صفرًا أبدًا. */
  readonly value: number | null;
  readonly unit?: "%";
}

export type TrendDir = "up" | "down" | "flat";
/** `positive`/`negative` بدلالة المقياس لا باتجاه السهم؛ `unmeasured` لا تغيّر مقيس؛ `neutral` مقيس بلا تغيّر. */
export type TrendPolarity = "positive" | "negative" | "neutral" | "unmeasured";
export interface TickerTrend {
  readonly dir: TrendDir;
  readonly polarity: TrendPolarity;
  /** `null` ⇒ لا نسبة مقيسة. */
  readonly pct: number | null;
}

export interface TickerItem {
  readonly kind: TickerKind;
  readonly read: ReadState;
  readonly tone: TickerTone;
  /** معرّف صنف الحالة — تغيّره بين قراءتين يحرّك نبضة الانتقال (`kind.status`). */
  readonly statusId: string;
  readonly word: Bilingual;
  readonly figures: readonly TickerFigure[];
  /** `null` ⇒ لا خانة اتجاه (لا مصدر تغيّرٍ مقيس لهذا البند أصلًا). */
  readonly trend: TickerTrend | null;
  readonly badge: TickerBadge | null;
  /** تنبيهٌ مقروء يُضاف للملخّص (تصعيد · قراءة فاشلة · تاريخ التصدير). */
  readonly note?: Bilingual;
  /** نوع الحالة الأمنية — للبند الأمني وحده، وبه تُعلَن «حرجة» مرةً. */
  readonly posture?: PostureType;
}

/* ── الحالة الأمنية: العتبات والتصعيد (قاعدة عرض — انتظر اعتماد المالك) ─────── */

export type PostureType = "stable" | "watch" | "elevated" | "critical";

/** الأدنى (شاملًا) لكل نوع. ما دون `elevated` حرجة. **قاعدة عرض لا قياس** — انظر الرأس. */
export const POSTURE_THRESHOLDS = { stable: 90, watch: 75, elevated: 60 } as const;

/** من الأفضل إلى الأسوأ — ترتيب التصعيد. */
export const POSTURE_ORDER: readonly PostureType[] = ["stable", "watch", "elevated", "critical"];

export const POSTURE_TONE: Readonly<Record<PostureType, TickerTone>> = {
  stable: "ok",
  watch: "warning",
  elevated: "warning",
  critical: "danger",
};

export const POSTURE_WORD: Readonly<Record<PostureType, Bilingual>> = {
  stable: { ar: "مستقرة", en: "Stable" },
  watch: { ar: "تحت المراقبة", en: "Under watch" },
  elevated: { ar: "مرتفعة المخاطر", en: "Elevated risk" },
  critical: { ar: "حرجة", en: "Critical" },
};

/** نوع الحالة من القيمة المعروضة (مقرَّبةً). غير منتهٍ ⇒ `null`. */
export function postureOf(score: number): PostureType | null {
  if (!Number.isFinite(score)) return null;
  const shown = Math.round(score);
  if (shown >= POSTURE_THRESHOLDS.stable) return "stable";
  if (shown >= POSTURE_THRESHOLDS.watch) return "watch";
  if (shown >= POSTURE_THRESHOLDS.elevated) return "elevated";
  return "critical";
}

/** درجةٌ أسوأ واحدة، والحرجة سقف. */
export function escalate(type: PostureType): PostureType {
  const at = POSTURE_ORDER.indexOf(type);
  return POSTURE_ORDER[Math.min(at + 1, POSTURE_ORDER.length - 1)] as PostureType;
}

export interface PostureVerdict {
  readonly type: PostureType;
  /** النوع من القيمة وحدها قبل التصعيد. */
  readonly base: PostureType;
  readonly escalated: boolean;
}

/**
 * `score` القيمة المعروضة؛ `openCritical` عدد البلاغات الحرجة المفتوحة **المقيسة الحيّة** أو
 * `null` (غير مقيس/مرجع ⇒ لا تصعيد). `null` للقيمة غير المنتهية.
 */
export function classifyPosture(score: number, openCritical: number | null): PostureVerdict | null {
  const base = postureOf(score);
  if (base === null) return null;
  const raise = openCritical !== null && Number.isFinite(openCritical) && openCritical > 0;
  const type = raise ? escalate(base) : base;
  return { type, base, escalated: type !== base };
}

/* ── الاتجاه: دلالة الارتفاع صريحةٌ لكل مقياس ───────────────────────────── */

export type TrendMetric = "posture" | "incidents" | "maintenance-overdue" | "projects-at-risk";

/** ارتفاع المقياس إيجابي؟ الامتثال نعم؛ البلاغات المفتوحة والمتأخر والمعرّض للخطر لا. */
export const TREND_UP_IS_GOOD: Readonly<Record<TrendMetric, boolean>> = {
  posture: true,
  incidents: false,
  "maintenance-overdue": false,
  "projects-at-risk": false,
};

/**
 * سهمٌ من تغيّرٍ مقيس. `null` (الحيّ، أو لا تاريخ) ⇒ شرطة «لم يُقَس» — لا سهمٌ ولا صفرٌ.
 */
export function trendOf(metric: TrendMetric, change: RefChange | null): TickerTrend {
  if (change === null || !Number.isFinite(change.pct)) {
    return { dir: "flat", polarity: "unmeasured", pct: null };
  }
  if (change.pct === 0) return { dir: "flat", polarity: "neutral", pct: 0 };
  const good = (change.dir === "up") === TREND_UP_IS_GOOD[metric];
  return { dir: change.dir, polarity: good ? "positive" : "negative", pct: change.pct };
}

/* ── القراءات ────────────────────────────────────────────────────────────── */

/** ما يلزم من نتيجة الاستعلام — يطابقه `UseQueryResult` فيمرّ `useHomeReads` كما هو. */
export type ReadQuery<T> = {
  readonly data: T | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
};

export interface TickerReads {
  readonly sec: ReadQuery<SecOverview>;
  readonly state: ReadQuery<CommandCenterState>;
  readonly maint: ReadQuery<MaintSummary>;
  readonly projects: ReadQuery<ProjectsSummary>;
}

/** الخطأ يغلب (كـ`statusOf` في بطاقات المؤشرات)، ثم الانتظار. */
export function readStateOf(q: { isPending: boolean; isError: boolean }): ReadState {
  return q.isError ? "error" : q.isPending ? "pending" : "ready";
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** متوسط امتثال المناطق المقيسة وحدها (`!== null` — الصفر قياس)؛ `null` حين لا منطقة مقيسة. */
export function complianceMean(regions: CommandCenterState["regions"] | undefined): number | null {
  const measured: number[] = [];
  for (const r of regions ?? []) if (finite(r.compliance_pct)) measured.push(r.compliance_pct);
  return measured.length ? measured.reduce((s, v) => s + v, 0) / measured.length : null;
}

const INCIDENT_CLOSED = new Set(["resolved", "closed"]);

/**
 * البلاغات الحرجة المفتوحة — **حيّةً ومقيسةً وحدها**؛ وإلا `null` (لا صفر).
 * غير مقيسة حين: القراءة ليست من صفوف حقيقية، أو الخادم أعلن `incidents_critical: null`، أو
 * وُجدت صفوفٌ ولا واحد منها يحمل شدّة (نفس قاعدة `deriveOmsKpis`).
 */
export function openCriticalOf(sec: SecOverview | undefined): number | null {
  if (!sec || !liveOf.secIncidents(sec)) return null;
  if (sec.counts.incidents_critical === null) return null;
  const rows = sec.incidents;
  if (rows.length > 0 && !rows.some((i) => i.severity != null)) return null;
  return rows.filter((i) => i.severity === "critical" && !INCIDENT_CLOSED.has(i.status)).length;
}

/* ── البنود ──────────────────────────────────────────────────────────────── */

const ZERO_FIGURE_LABEL: Bilingual = { ar: "", en: "" };

const pendingItem = (kind: TickerKind): TickerItem => ({
  kind,
  read: "pending",
  tone: "info",
  statusId: `${kind}.pending`,
  word: { ar: "جارٍ القراءة", en: "Reading" },
  figures: [],
  trend: null,
  badge: null,
});

const failedItem = (kind: TickerKind): TickerItem => ({
  kind,
  read: "error",
  tone: "info",
  statusId: `${kind}.error`,
  word: { ar: "تعذّر القراءة", en: "Read failed" },
  figures: [],
  trend: null,
  badge: null,
});

const FAILED_LIVE_NOTE: Bilingual = {
  ar: "تعذّرت القراءة الحيّة؛ المعروض مرجعي",
  en: "Live read failed; showing reference",
};

export function postureItem(r: Pick<TickerReads, "state" | "sec">): TickerItem {
  const read = readStateOf(r.state);
  if (read === "pending") return pendingItem("posture");
  const ready = read === "ready";
  const chosen = chooseLive(
    ready ? complianceMean(r.state.data?.regions) : null,
    ready && liveOf.state(r.state.data),
    refKpi("compliance"),
  );
  const shown = Math.round(chosen.value);
  // التصعيد من بلاغٍ حرجٍ مقيسٍ حيّ — ولا يصعّد مرجعٌ.
  const critical = chosen.simulated ? null : openCriticalOf(r.sec.data);
  const verdict = classifyPosture(shown, critical);
  if (verdict === null) return failedItem("posture");
  const notes: Bilingual[] = [];
  if (verdict.escalated) {
    notes.push({
      ar: "رُفعت درجةً لوجود بلاغٍ حرجٍ مفتوح",
      en: "Raised one level: an open critical incident",
    });
  }
  if (read === "error") notes.push(FAILED_LIVE_NOTE);
  const figures: TickerFigure[] = [
    {
      id: "compliance",
      label: chosen.simulated
        ? ZERO_FIGURE_LABEL
        : { ar: "الامتثال العام", en: "Overall compliance" },
      value: shown,
      unit: "%",
    },
  ];
  if (verdict.escalated) {
    figures.push({
      id: "open-critical",
      label: { ar: "بلاغات حرجة مفتوحة", en: "Open critical incidents" },
      value: critical,
    });
  }
  return {
    kind: "posture",
    read,
    tone: POSTURE_TONE[verdict.type],
    statusId: `posture.${verdict.type}`,
    word: POSTURE_WORD[verdict.type],
    figures,
    trend: trendOf("posture", chosen.change),
    badge: chosen.simulated ? "reference" : null,
    ...(notes.length
      ? { note: { ar: notes.map((n) => n.ar).join("؛ "), en: notes.map((n) => n.en).join("; ") } }
      : {}),
    posture: verdict.type,
  };
}

export function incidentsItem(r: Pick<TickerReads, "sec">): TickerItem {
  const read = readStateOf(r.sec);
  if (read === "pending") return pendingItem("incidents");
  const ready = read === "ready";
  const chosen = chooseLive(
    ready ? r.sec.data?.counts.incidents_open : null,
    ready && liveOf.secIncidents(r.sec.data),
    refKpi("incidents"),
  );
  const open = Math.round(chosen.value);
  // الحرجة: للحيّ وحده ("لم يُقَس" إن لم تُقَس شدّتها)، وللمرجع لا شيء — لا مرجع لها.
  const critical = chosen.simulated ? undefined : openCriticalOf(r.sec.data);
  const figures: TickerFigure[] = [
    { id: "open", label: { ar: "مفتوحة", en: "Open" }, value: open },
  ];
  if (critical !== undefined) {
    figures.push({ id: "critical", label: { ar: "حرجة", en: "Critical" }, value: critical });
  }
  let tone: TickerTone;
  let status: string;
  let word: Bilingual;
  if (critical !== undefined && critical !== null && critical > 0) {
    tone = "danger";
    status = "critical";
    word = { ar: "حرجة", en: "Critical" };
  } else if (open > 0) {
    tone = "warning";
    status = "open";
    word = { ar: "تتطلب متابعة", en: "Needs follow-up" };
  } else {
    tone = "ok";
    status = "clear";
    word = { ar: "لا بلاغات مفتوحة", en: "None open" };
  }
  return {
    kind: "incidents",
    read,
    tone,
    statusId: `incidents.${status}`,
    word,
    figures,
    trend: trendOf("incidents", chosen.change),
    badge: chosen.simulated ? "reference" : null,
    ...(read === "error" ? { note: FAILED_LIVE_NOTE } : {}),
  };
}

export function maintenanceItem(r: Pick<TickerReads, "maint">): TickerItem {
  const read = readStateOf(r.maint);
  if (read === "pending") return pendingItem("maintenance");
  const d = r.maint.data;
  // لا مرجع بديل أبدًا: الفشل أو غياب البيانات «تعذّر القراءة».
  if (read === "error" || d === undefined) return failedItem("maintenance");
  const k = d.kpis;
  const hold = finite(k.on_hold) ? k.on_hold : null;
  const active = finite(k.open) && hold !== null ? k.open + hold : null;
  const overdue = finite(k.overdue) ? k.overdue : null;
  let tone: TickerTone;
  let status: string;
  let word: Bilingual;
  if (overdue === null) {
    tone = "info";
    status = "unmeasured";
    word = { ar: "التأخّر لم يُقَس", en: "Overdue not measured" };
  } else if (overdue > 0) {
    tone = "warning";
    status = "overdue";
    word = { ar: "متأخرات", en: "Overdue" };
  } else if (active === 0) {
    tone = "ok";
    status = "idle";
    word = { ar: "لا أوامر نشطة", en: "No active orders" };
  } else {
    tone = "ok";
    status = "on-schedule";
    word = { ar: "منتظمة", en: "On schedule" };
  }
  return {
    kind: "maintenance",
    read,
    tone,
    statusId: `maintenance.${status}`,
    word,
    figures: [
      { id: "active", label: { ar: "نشطة", en: "Active" }, value: active },
      { id: "overdue", label: { ar: "متأخرة", en: "Overdue" }, value: overdue },
    ],
    trend: null,
    badge: d.source === "export" ? "export" : null,
    ...(d.source === "export"
      ? {
          note: {
            ar: `نسخة من تصدير SAP PM${d.exportDate ? ` المعتمد ${d.exportDate}` : ""} لا القاعدة الحيّة`,
            en: `A SAP PM export copy${d.exportDate ? ` approved ${d.exportDate}` : ""}, not the live database`,
          },
        }
      : {}),
  };
}

export function projectsItem(r: Pick<TickerReads, "projects">): TickerItem {
  const read = readStateOf(r.projects);
  if (read === "pending") return pendingItem("projects");
  const d = r.projects.data;
  if (read === "error" || d === undefined) return failedItem("projects");
  const n = (v: unknown): number | null => (finite(v) ? v : null);
  const inProgress = n(d.in_progress);
  const atRisk = n(d.at_risk);
  const delayed = n(d.delayed);
  const unmeasured = n(d.health_unmeasured);
  const onTrack = n(d.on_track);
  const assessed =
    atRisk !== null && delayed !== null && onTrack !== null ? atRisk + delayed + onTrack : null;
  let tone: TickerTone;
  let status: string;
  let word: Bilingual;
  if (atRisk !== null && atRisk > 0) {
    tone = "warning";
    status = "at-risk";
    word = { ar: "معرّضة للخطر", en: "At risk" };
  } else if (delayed !== null && delayed > 0) {
    tone = "warning";
    status = "delayed";
    word = { ar: "متأخرة", en: "Delayed" };
  } else if (inProgress === 0) {
    tone = "ok";
    status = "idle";
    word = { ar: "لا مشاريع جارية", en: "None in progress" };
  } else if (assessed === null || assessed === 0) {
    tone = "info";
    status = "unmeasured";
    word = { ar: "الصحّة لم تُقَس", en: "Health not measured" };
  } else {
    tone = "ok";
    status = "on-track";
    word = { ar: "منتظمة", en: "On track" };
  }
  return {
    kind: "projects",
    read,
    tone,
    statusId: `projects.${status}`,
    word,
    figures: [
      { id: "in-progress", label: { ar: "جارية", en: "In progress" }, value: inProgress },
      { id: "at-risk", label: { ar: "معرّضة للخطر", en: "At risk" }, value: atRisk },
      { id: "delayed", label: { ar: "متأخرة", en: "Delayed" }, value: delayed },
      { id: "unmeasured", label: { ar: "غير مقيَّمة", en: "Not assessed" }, value: unmeasured },
    ],
    trend: null,
    badge: d.source === "export" ? "export" : null,
    ...(d.source === "export"
      ? {
          note: {
            ar: `نسخة من تصدير المشاريع${d.exportDate ? ` المعتمد ${d.exportDate}` : ""} لا القاعدة الحيّة`,
            en: `A projects export copy${d.exportDate ? ` approved ${d.exportDate}` : ""}, not the live database`,
          },
        }
      : {}),
  };
}

/** البنود الأربعة بترتيب العرض: الحالة الأمنية ← الصيانة ← البلاغات ← المشاريع. */
export function buildTickerItems(r: TickerReads): readonly TickerItem[] {
  return [postureItem(r), maintenanceItem(r), incidentsItem(r), projectsItem(r)];
}

/* ── الانتقالات: نبضة تغيّر الصنف، وإعلانُ «حرجة» مرّةً ────────────────────── */

export interface TickerTransitions {
  /** آخر `statusId` لكل بند. */
  readonly ids: Readonly<Partial<Record<TickerKind, string>>>;
  /** عدّاد تغيّر الصنف لكل بند — مفتاحُ إعادة تركيب جسم البند فتُعاد حركاته من أولها. */
  readonly flips: Readonly<Partial<Record<TickerKind, number>>>;
  /** الإعلان المقروء الحالي، أو `null`. يتبدّل عند تغيّر **صنف الحالة الأمنية** وحده. */
  readonly announce: Bilingual | null;
}

export const INITIAL_TRANSITIONS: TickerTransitions = { ids: {}, flips: {}, announce: null };

export const CRITICAL_ANNOUNCEMENT: Bilingual = {
  ar: "تنبيه: الحالة الأمنية صارت حرجة",
  en: "Alert: security posture is now critical",
};

/** صنفٌ استقرّ على قراءة (لا انتظار ولا فشل) — الانتقال من/إلى غيره ليس «تغيّرًا». */
const settled = (id: string | undefined): id is string =>
  id !== undefined && !/\.(pending|error)$/.test(id);

/**
 * الحالة التالية للانتقالات. **ترجع الكائن نفسه** حين لم يتغيّر أيّ صنف (فلا إعادة رسم).
 * التغيّر = صنفان مستقرّان مختلفان بين قراءتين؛ أول وصولٍ للبيانات ليس تغيّرًا فلا نبضة ولا إعلان.
 * الإعلان لـ«حرجة» وحدها عند تغيّر صنف الحالة الأمنية، ويُمحى حين ينتقل الصنف إلى غيرها.
 */
export function nextTransitions(
  prev: TickerTransitions,
  items: readonly TickerItem[],
): TickerTransitions {
  const ids: Partial<Record<TickerKind, string>> = {};
  for (const it of items) ids[it.kind] = it.statusId;
  if (items.every((it) => prev.ids[it.kind] === it.statusId)) return prev;
  const flips: Partial<Record<TickerKind, number>> = { ...prev.flips };
  let announce = prev.announce;
  for (const it of items) {
    const before = prev.ids[it.kind];
    if (!settled(before) || !settled(it.statusId) || before === it.statusId) continue;
    flips[it.kind] = (flips[it.kind] ?? 0) + 1;
    if (it.kind === "posture") announce = it.posture === "critical" ? CRITICAL_ANNOUNCEMENT : null;
  }
  return { ids, flips, announce };
}

/* ── النصوص المشتركة للعرض ───────────────────────────────────────────────── */

/** وسم المصدر: «مرجعي» للمحاكاة، و«تصدير …» لنسخة التصدير الحقيقية (لا مرجع ولا حيّة). */
export function badgeTextOf(item: Pick<TickerItem, "kind" | "badge">): Bilingual | null {
  if (item.badge === null) return null;
  if (item.badge === "reference") return { ar: SIMULATION_BADGE_AR, en: "Reference" };
  return item.kind === "maintenance"
    ? { ar: "تصدير SAP", en: "SAP export" }
    : { ar: "تصدير المشاريع", en: "Projects export" };
}

/** «لم يُقَس» بلغتيه — لقيمةٍ أو اتجاهٍ بلا قياس. */
export const NOT_MEASURED: Bilingual = { ar: CHANGE_NOT_MEASURED_AR, en: "not measured" };

/** كلمات الاتجاه: الاتجاه (ارتفاع/انخفاض) غير الدلالة (إيجابي/سلبي) — كلٌّ بكلمته. */
export const TREND_DIR_WORD: Readonly<Record<TrendDir, Bilingual>> = {
  up: { ar: "ارتفاع", en: "Rising" },
  down: { ar: "انخفاض", en: "Falling" },
  flat: { ar: "ثبات", en: "Flat" },
};
export const TREND_POLARITY_WORD: Readonly<Record<TrendPolarity, Bilingual>> = {
  positive: { ar: "إيجابي", en: "positive" },
  negative: { ar: "سلبي", en: "negative" },
  neutral: { ar: "محايد", en: "neutral" },
  unmeasured: NOT_MEASURED,
};
