/**
 * لبنات لوحة الرئيسية المشتركة — **منقولة كما هي من `HomeDashboard.tsx`**
 * (مركز القيادة، أمر المالك ٢٠٢٦/١٠/١٣ — المرحلة الأولى «الأساس»).
 *
 * سبب النقل: صفوف الرئيسية الجديدة (الخريطة · سَدِيد · التشغيل · التحليلات)
 * تُبنى في ملفّاتٍ منفصلة متوازية، وكلّها تحتاج البطاقة نفسها والحالات
 * الثلاث نفسها والحلقة نفسها. نسخةٌ واحدة هنا يستوردها الجميع — ونسختان
 * تفترقان يومًا بصمت: إحداهما تقرأ الفراغ قبل الخطأ والأخرى لا.
 *
 * السلوك لم يتغيّر بالنقل، إلا أمرًا واحدًا مقصودًا: البطاقة (`Panel`) تحمل
 * اتجاه لغتها بنفسها (`dir`). فترتيب الرئيسية **يسارًا ← يمينًا كما في
 * الصورة** (قرار المالك D5) والنصّ داخل كل بطاقة عربيٌّ `rtl` — والبطاقة
 * التي تعلن اتجاهها لا يقلبها ترتيبُ الحاوية. وفي صفحةٍ `rtl` أصلًا لا أثر له.
 */
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  OctagonAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ProviderStatus } from "@/lib/integrations-hub.functions";

/* ── تسميات الحالة — الكلمات نفسها في نوافذ اللوحة التنفيذية
      (`sec-exec-kpis.functions.ts`). النوع غير المعروف يُعرض بنصّه. ──── */

export const INCIDENT_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  investigating: "قيد التحقيق",
  contained: "محتوى",
  resolved: "محلول",
  closed: "مغلق",
};
export const PATROL_STATUS_AR: Record<string, string> = {
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "مكتملة",
  missed: "فائتة",
};
export const ALERT_TYPE_AR: Record<string, string> = {
  motion: "رصد حركة",
  loitering: "تسكّع",
  intrusion: "تسلل",
  camera_offline: "انقطاع كاميرا",
  tamper: "عبث بالكاميرا",
};
// القيم الثلاث الواردة فعلًا في المصدر (القاعدة والمحاكاة): new · acknowledged · resolved.
export const CCTV_STATUS_AR: Record<string, string> = {
  new: "جديد",
  acknowledged: "مُستلَم",
  resolved: "مُعالَج",
};

/**
 * صحّة المزوّد: كلمةٌ وشكل ولون معًا (WCAG 2.2 §1.4.1 وعرف لوحات السلامة):
 * دائرة صحّ = سليم · مثلث = متدهور · مثمّن = عطل · دائرة متقطّعة = لم يُقَس.
 * و«غير مهيّأ» ليس عطلًا ولا سلامة — نظامٌ لم يُربط بعد.
 */
export const HEALTH_VIEW: Record<
  ProviderStatus["health"],
  { ar: string; en: string; icon: LucideIcon; tone: string }
> = {
  healthy: { ar: "سليم", en: "Healthy", icon: CheckCircle2, tone: "--tone-emerald" },
  degraded: { ar: "متدهور", en: "Degraded", icon: AlertTriangle, tone: "--tone-amber" },
  error: { ar: "عطل", en: "Error", icon: OctagonAlert, tone: "--tone-rose" },
  unknown: { ar: "لم يُقَس", en: "Not measured", icon: CircleDashed, tone: "--ink-3" },
  not_configured: { ar: "غير مهيّأ", en: "Not set up", icon: CircleDashed, tone: "--ink-3" },
};
export const HEALTH_ORDER: ProviderStatus["health"][] = [
  "healthy",
  "degraded",
  "error",
  "unknown",
  "not_configured",
];

/** ألوان هوية لفئات البلاغات — لا أحمر ولا كهرماني ولا أخضر: تلك معانٍ
 *  محجوزة (خطر · تحذير · سليم)، وفئة البلاغ ليست حكمًا. */
export const CATEGORY_TONES = ["--tone-blue", "--tone-cyan", "--tone-violet"] as const;

export const fmtNum = (n: number, ar: boolean) => n.toLocaleString(ar ? "ar-SA" : "en-US");
export const fmtTime = (iso: string | null, ar: boolean) =>
  iso
    ? new Date(iso).toLocaleString(ar ? "ar-SA" : "en-US", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/**
 * حال القراءة — ثلاثٌ لا تُدمج في «لم يُقَس»: التحميل انتظار، والخطأ
 * تعذّر وصول، و«لم يُقَس» قراءةٌ وصلت بلا قياس (المادتان ١٤ و٢٧).
 */
export type ReadStatus = "loading" | "error" | "ready";
export const statusOf = (q: { isPending: boolean; isError: boolean }): ReadStatus =>
  q.isError ? "error" : q.isPending ? "loading" : "ready";

/* ── البطاقة والحالات الثلاث ──────────────────────────────────────────── */

export function Panel({
  id,
  title,
  to,
  moreAr,
  moreEn,
  ar,
  children,
  note,
}: {
  id: string;
  title: string;
  to: string;
  moreAr: string;
  moreEn: string;
  ar: boolean;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      // اتجاه اللغة على البطاقة نفسها: الحاوية قد تُرتَّب يسارًا ← يمينًا
      // (D5)، والنصّ داخلها يبقى عربيًّا `rtl` لا يقلبه ترتيبها.
      dir={ar ? "rtl" : "ltr"}
      className="nx-home-panel flex min-w-0 flex-col rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="nx-bp-h2">
          {title}
        </h2>
        <Link
          to={to}
          className="nx-home-more inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[12px] font-bold text-[color:var(--tone-blue)] hover:bg-[color:var(--chip-strong)]"
        >
          {ar ? moreAr : moreEn}
          <ChevronLeft aria-hidden className={`size-4 ${ar ? "" : "rotate-180"}`} />
        </Link>
      </div>
      {note && <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">{note}</p>}
      <div className="mt-3 min-w-0 flex-1">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="nx-dash-empty text-[13px] text-[color:var(--ink-3)]">{children}</p>;
}

export function Loading({ ar }: { ar: boolean }) {
  return (
    <div aria-busy="true" className="grid gap-2">
      <span className="sr-only">{ar ? "جارٍ التحميل" : "Loading"}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="nx-home-skeleton h-12 rounded-xl" />
      ))}
    </div>
  );
}

/** تعذّر الوصول ليس فراغًا: يُقال بالعربية ومعه إعادة المحاولة (المادة ١٤). */
export function ErrorState({ ar, onRetry }: { ar: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="nx-home-error flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-[color:var(--ink-2)]">
        {ar ? "تعذّر تحميل هذه اللوحة الآن." : "This panel could not load right now."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="nx-home-retry inline-flex min-h-11 items-center rounded-lg border border-[color:var(--hairline)] px-3 font-bold text-[color:var(--ink)] hover:bg-[color:var(--chip-strong)]"
      >
        {ar ? "أعد المحاولة" : "Retry"}
      </button>
    </div>
  );
}

/**
 * الحالات الثلاث بترتيبها: الخطأ أولًا (فلا يُقرأ فراغًا)، ثم التحميل، ثم
 * الفراغ — وهذا وحده حين تصل قراءةٌ بلا صفوف.
 */
export function PanelBody({
  q,
  ar,
  empty,
  isEmpty,
  children,
}: {
  q: { isPending: boolean; isError: boolean; refetch: () => unknown };
  ar: boolean;
  empty: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  if (q.isError) return <ErrorState ar={ar} onRetry={() => void q.refetch()} />;
  if (q.isPending) return <Loading ar={ar} />;
  if (isEmpty) return <Empty>{empty}</Empty>;
  return <>{children}</>;
}
