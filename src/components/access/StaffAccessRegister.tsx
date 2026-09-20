/**
 * سجلّ الدخول بالرقم الوظيفي — قائمة الدورة، بحثًا وفرزًا وتصديرًا.
 *
 * أمر المالك ٢٠٢٦/٠٩/٢٠: قائمةٌ في مركز الملفّات تُجدَّد كل ستة أشهر
 * تلقائيًّا، يُبحث فيها ويُفرز، وتُحمَّل PDF.
 *
 * ## لا محاكاة هنا — والاستثناء مقصود
 *
 * كل نوافذ العرض في هذا النظام تنهض بمحاكاة مرجعية حين تصمت القاعدة
 * («بيانات لا تفرغ»). **وهذه مستثناة صراحةً:** صفٌّ مختلَق في سجلّ دخولٍ
 * يُقرأ إثباتًا على شخص، وقد يُطبع ويُحتجّ به. فالحالات ثلاث لا اثنتان:
 * صفوفٌ حقيقية · سجلٌّ غير مفعَّل (الترحيل لم يُطبَّق) · دورةٌ بلا دخول.
 * و«لا دخول» و«غير مفعَّل» نقيضان لا يجوز أن يظهرا بنفس الشكل.
 *
 * ## والبحث يُطبَّع قبل المطابقة
 *
 * الرقم يُحفظ لاتينيًّا (‏`normalizeStaffNumber` عند الكتابة)، ومن يبحث
 * بلوحةٍ عربية يكتب «١٠٢٥٤». فبلا تطبيعٍ للمُدخَل لا يجد صفًّا موجودًا —
 * وهو عين ما وُجد التطبيع ليمنعه عند الكتابة.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownUp, Download, FileClock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { listStaffAccessPeriod } from "@/lib/access/staff-entry.functions";
import { normalizeStaffNumber, type StaffEntry } from "@/lib/access/staff-entry";
import { currentPeriod, parsePeriodKey, recentPeriods } from "@/lib/access/staff-period";
import {
  buildStaffRegisterDoc,
  distinctStaffCount,
  formatEntryStamp,
  regionLabel,
  staffRegisterFileName,
} from "@/lib/access/staff-register-pdf";
import { toast } from "sonner";

type SortKey = "at" | "staff_number";
type SortDir = "asc" | "desc";

/** ستّ دورات = ثلاث سنوات — يكفي مراجعةً ولا يُثقل القائمة. */
const PERIOD_CHOICES = 6;

export function StaffAccessRegister() {
  const periods = useMemo(() => recentPeriods(PERIOD_CHOICES), []);
  const [periodKey, setPeriodKey] = useState(() => currentPeriod().key);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [exporting, setExporting] = useState(false);

  const fetchPeriod = useServerFn(listStaffAccessPeriod);
  const { user, loading: authLoading } = useAuth();
  const period = useMemo(() => parsePeriodKey(periodKey) ?? currentPeriod(), [periodKey]);

  // ── `enabled` هنا **استثناءٌ مقصود** من قاعدة قراءات العرض ────────────
  // العقيدة تمنع `enabled: !!user` على استعلامات العرض، لأن الزائر يجب أن
  // يرى المحتوى. وهذا ليس عرضًا: سجلُّ من دخل ومتى، محروسٌ بـ
  // `requireSupabaseAuth` على الخادم.
  //
  // وبلا هذا الشرط قِيس السلوك فعلًا: الزائر يطلب نقطةً ترفضه، وreact-query
  // يعيد المحاولة ثلاثًا بتراجع زمني — فتبقى الشاشة على «جارٍ تحميل السجلّ…»
  // بلا نهاية. وهو ما تمنعه العقيدة صراحةً («صفر جارٍ التحميل لا نهائي»).
  // فالشرط يقلب انتظارًا أبديًّا إلى **جوابٍ فوريّ وصادق**.
  //
  // و`retry: false` معه: رفضُ الصلاحية ليس عطلًا عابرًا يُصلحه التكرار.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff-access-period", periodKey],
    queryFn: () => fetchPeriod({ data: { period: periodKey } }),
    staleTime: 60_000,
    enabled: !authLoading && !!user,
    retry: false,
  });

  const rows = useMemo<StaffEntry[]>(() => {
    const all = data?.rows ?? [];
    // التطبيع على الطرفين: المكتوب بالعربية يطابق المحفوظ باللاتينية.
    const q = normalizeStaffNumber(query).trim();
    const filtered = q
      ? all.filter(
          (r) =>
            r.staff_number.includes(q) ||
            (r.path ?? "").toLowerCase().includes(query.trim().toLowerCase()) ||
            regionLabel(r.region).includes(query.trim()),
        )
      : all;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "staff_number") {
        // مقارنةٌ رقمية لا نصّية: «9» قبل «10» لا بعدها.
        const na = Number(a.staff_number);
        const nb = Number(b.staff_number);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return (na - nb) * dir;
        return a.staff_number.localeCompare(b.staff_number, "en") * dir;
      }
      return (new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()) * dir;
    });
  }, [data?.rows, query, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "at" ? "desc" : "asc");
      return key;
    });
  }, []);

  const download = useCallback(async () => {
    setExporting(true);
    try {
      const { renderReportPdf } = await import("@/lib/reports/pdf-rich");
      const blob = await renderReportPdf(
        // الصفوف بترتيب الشاشة وبعد الترشيح: الملفّ يطابق ما رآه المصدِّر.
        buildStaffRegisterDoc({ rows, period, truncated: data?.truncated ?? false }),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = staffRegisterFileName(period);
      a.click();
      // التحرير بعد الحفظ — وإلا أُلغي الرابط قبل أن يبدأ التنزيل.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("[staff-register] pdf export failed", err);
      toast.error("تعذّر إنشاء ملفّ PDF. أعد المحاولة.");
    } finally {
      setExporting(false);
    }
  }, [rows, period, data?.truncated]);

  const available = data?.available ?? false;
  const canExport = !!user && available && rows.length > 0 && !exporting;

  return (
    <div dir="rtl" className="space-y-4">
      {/* ── الترويسة: الدورة والعدّاد ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileClock className="size-5 shrink-0 text-[#3AE8FF]" aria-hidden />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">
              سجلّ الدخول بالرقم الوظيفي
            </h3>
            <p className="text-[12px] text-muted-foreground">
              قائمة الدورة الجارية — تتجدّد كل ستة أشهر تلقائيًّا.
            </p>
          </div>
        </div>
        <Button
          onClick={() => void download()}
          disabled={!canExport}
          className="min-h-11 shrink-0"
          title={available ? "تحميل قائمة الدورة كملف PDF" : "السجلّ غير مفعَّل — لا شيء يُصدَّر"}
        >
          <Download className="ms-1 size-4" aria-hidden />
          {exporting ? "جارٍ الإنشاء…" : "تحميل PDF"}
        </Button>
      </div>

      {/* ── أدوات: الدورة · البحث · الفرز ─────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
        <label className="grid gap-1">
          <span className="text-[12px] text-muted-foreground">الدورة</span>
          <select
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className="min-h-11 rounded-md border border-border bg-card px-3 text-[13px] text-foreground"
            aria-label="اختيار دورة السجلّ"
          >
            {periods.map((p) => (
              <option key={p.key} value={p.key}>
                {p.labelAr}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-[12px] text-muted-foreground">بحث برقمٍ أو وجهة</span>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="numeric"
              placeholder="مثال: 10254"
              className="min-h-11 pe-9"
            />
          </div>
        </label>

        <label className="grid gap-1">
          <span className="text-[12px] text-muted-foreground">الفرز</span>
          <Button
            variant="outline"
            onClick={() => toggleSort(sortKey === "at" ? "staff_number" : "at")}
            className="min-h-11 justify-between gap-2"
          >
            <ArrowDownUp className="size-4" aria-hidden />
            {sortKey === "at" ? "بالوقت" : "بالرقم"}
          </Button>
        </label>
      </div>

      {/* ── الحالات الأربع ────────────────────────────────────────── */}
      {authLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">جارٍ تحميل السجلّ…</p>
      ) : !user ? (
        // الزائر لا يُترك على انتظارٍ لا ينتهي ولا يُقال له «تعذّر الجلب»:
        // لم يتعثّر شيء — السجلّ محجوبٌ عنه بحقّ، ويُقال كما هو.
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">يتطلب تسجيل الدخول</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            سجلُّ من دخل ومتى ليس عامًّا — سجّل الدخول لعرضه.
          </p>
        </div>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">جارٍ تحميل السجلّ…</p>
      ) : isError ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600">
          تعذّر جلب السجلّ. أعد المحاولة.
        </p>
      ) : !available ? (
        // **ليست حالةً فارغة.** الجدول غير مطبَّق على القاعدة، فلا يُقال
        // «لا دخول» — ذلك يُقرأ «لم يدخل أحد» وهو نقيض «لا نعرف».
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">السجلّ غير مفعَّل بعد</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            جدول <code className="text-[12px]">staff_access_log</code> غير مطبَّق على القاعدة، فلا
            يُحفظ دخولٌ ولا يُقرأ. وهذا ليس «لا دخول» — بل لا قياس. الترحيل جاهز في
            <code className="mx-1 text-[12px]">
              supabase/migrations/20260919100000_staff_access_log.sql
            </code>
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {query.trim() ? "لا نتائج تطابق البحث في هذه الدورة." : "لا دخول مسجَّل في هذه الدورة."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            <span>
              {rows.length} دخولًا · {distinctStaffCount(rows)} رقمًا متمايزًا
            </span>
            {data?.truncated && (
              <span className="text-amber-600">القائمة ناقصة — بلغت القراءة سقفها.</span>
            )}
          </div>

          {/* الجدول يُمرَّر أفقيًّا على الجوال بدل أن يُقصّ. */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[30rem] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-card/60 text-[12px] text-muted-foreground">
                  <SortHeader
                    label="الرقم الوظيفي"
                    active={sortKey === "staff_number"}
                    dir={sortDir}
                    onClick={() => toggleSort("staff_number")}
                  />
                  <SortHeader
                    label="التاريخ والوقت"
                    active={sortKey === "at"}
                    dir={sortDir}
                    onClick={() => toggleSort("at")}
                  />
                  <th className="px-3 py-2 text-start font-medium">المنطقة</th>
                  <th className="px-3 py-2 text-start font-medium">الوجهة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.staff_number}-${r.entered_at}-${i}`}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-semibold tabular-nums text-foreground">
                      {r.staff_number}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground" dir="ltr">
                      {formatEntryStamp(r.entered_at)}
                    </td>
                    <td
                      className="max-w-[12rem] truncate px-3 py-2 text-muted-foreground"
                      dir="ltr"
                    >
                      {r.path || "/"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* التحفّظ ظاهرٌ دائمًا — لا في الملفّ وحده. */}
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        الرقم الوظيفي يُكتب يدويًّا ولا يُقارن بسجلّ الموظفين ولا يمنح صلاحية — فالسجلّ يُثبت أن
        أحدًا صرّح بهذا الرقم في هذا الوقت، لا أن صاحبه هو من دخل.
      </p>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly dir: SortDir;
  readonly onClick: () => void;
}) {
  return (
    <th className="px-3 py-2 text-start font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-11 items-center gap-1 text-[12px] hover:text-foreground"
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <span aria-hidden className={active ? "opacity-100" : "opacity-30"}>
          {active && dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}
