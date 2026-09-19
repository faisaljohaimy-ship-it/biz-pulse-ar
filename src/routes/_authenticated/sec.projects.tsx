import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProjects, getCircles } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
// القاعدة الموثقة في sec-shell: `Rocket` تقول «إطلاق» لا «إدارة مشاريع» —
// `FolderKanban` هي أيقونة المشاريع الكانونية نفسها في شريط /sec.
import { FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/projects")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Projects,
});

/**
 * الصحّة بالكلمة والشكل لا باللون وحده (WCAG 2.2 §1.4.1 + عرف لوحات
 * السلامة في العقيدة): مثمّن = خطر · مثلث = تحذير · دائرة = سليم.
 * والأحمر/الكهرماني هو الزوج الذي يطمسه عمى الألوان الأحمر-الأخضر، على
 * سطحٍ وظيفته الإنذار — فالشكل والنصّ ليسا زينة.
 */
const HEALTH: Record<string, { clr: string; label: string; glyph: string }> = {
  green: {
    clr: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400",
    label: "سليم",
    glyph: "●",
  },
  amber: {
    clr: "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400",
    label: "متأخّر",
    glyph: "▲",
  },
  red: {
    clr: "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-400",
    label: "معرّض للخطر",
    glyph: "⬣",
  },
};

/**
 * **«لم تُقَس» ليست حالةً رابعة بل غياب قياس (المادة ٢٧).**
 * تصدير المشاريع يصرّح بالمخاطر والتأخّر في 158 صفًّا من 697؛ الباقي بلا
 * تقييم. عرضه أخضر يجعل اللوحة تكذب بلطف، فيُعرض محايدًا بنصّه.
 */
const HEALTH_UNMEASURED = {
  clr: "bg-muted/40 text-muted-foreground border-border",
  label: "لم تُقَس",
  glyph: "—",
};

/** معرّفات الحالة تبقى في البيانات، والعرض عربي (واجهة عربية أولًا). */
const STATUS_AR: Record<string, string> = {
  "in-progress": "جارٍ",
  completed: "مكتمل",
  cancelled: "ملغى",
  planned: "مخطَّط",
  "on-hold": "متوقّف",
};

function Projects() {
  const fetchProjects = useServerFn(getProjects);
  const fetchCircles = useServerFn(getCircles);
  const { data: projects } = useQuery({
    queryKey: ["sec-projects"],
    queryFn: () => fetchProjects(),
  });
  const { data: circles } = useQuery({ queryKey: ["sec-circles"], queryFn: () => fetchCircles() });
  const rows = projects ?? [];
  const circleMap = new Map((circles ?? []).map((c) => [c.id, c.name_ar]));

  // قرار المالك ٢٠٢٦/٠٨/٢٠: تاريخ فقط بلا وقت — والغائب «لم يُحدَّد» لا
  // تاريخ مُختلَق (المادة ٢٧). الصيغة نفسها المتّبعة في صفحات sec المجاورة.
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-SA") : "لم يُحدَّد";

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="مشاريع الأنظمة الأمنية"
        subtitle="قسم مشاريع الأنظمة الأمنية — جميع المناطق"
      />
      {/* قرار المالك ٢٠٢٦/٠٨/٢٠: حُذفت بطاقتا «إجمالي الميزانية» و«إجمالي
          المصروف» — لا مال على هذه الصفحة، فتقلّصت الشبكة إلى ثلاث بطاقات. */}
      {/* ٢٠٢٦/٠٨/٣٠ — أُضيفت بطاقتان مع استيراد تصدير المشاريع:
          «ملغاة» (20 مشروعًا مصرَّحًا بإلغائها في المصدر، كانت تُحسب ضمن
          الإجمالي بلا ذكر)، و«لم تُقَس صحّتها» — أن يكون ثلثا المشاريع بلا
          تقييم مخاطر حقيقةٌ إدارية تستحق الظهور لا فراغًا يُملأ بلونٍ
          افتراضي (المادة ٢٧). ولا مال هنا (قرار المالك ٢٠٢٦/٠٨/٢٠). */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="إجمالي المشاريع" value={rows.length} />
        <StatCard
          label="جارية"
          value={rows.filter((p) => p.status === "in-progress").length}
          tone="warning"
        />
        <StatCard
          label="مكتملة"
          value={rows.filter((p) => p.status === "completed").length}
          tone="success"
        />
        <StatCard label="ملغاة" value={rows.filter((p) => p.status === "cancelled").length} />
        <StatCard label="لم تُقَس صحّتها" value={rows.filter((p) => p.health === null).length} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          // `min-w-0` على البطاقة نفسها — لا على ما بداخلها وحده.
          //
          // الداخل محروسٌ أصلًا (`min-w-0` على العمود و`truncate` على
          // الاسم)، ولم يكفِ: البطاقة **عنصر شبكة**، و`min-width` الافتراضية
          // له `auto` فلا يصغر تحت محتواه الأدنى. وقِيس: البطاقة 1055px داخل
          // خليةٍ عرضها 343، فانزلقت إلى `left: -696` وخرجت شارة الحالة 679px
          // خارج قاصّها. و`truncate` لا يعمل على عنصرٍ لا يُضيَّق أصلًا.
          //
          // وهو **نفس عطل بطاقات السياسات** في `/sec/governance` حرفًا
          // (‏٢٠٢٦/٠٩/١٩). فُحص النمط على عشرين موضعًا مرشَّحًا فلم يقع إلا
          // هنا وهناك — ولذلك لم تُرقَّع البقيّة: ترقيعٌ بلا قياسٍ هو ما
          // يصنع هذا الصنف من العطل ابتداءً.
          <div key={p.id} className="min-w-0 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                  {/* **`dir="auto"` واجبة لا تحسين:** أسماء المشاريع في
                      التصدير لاتينية، وقصّها داخل حاوية RTL يأكل **بدايتها**
                      — قِيس فعلًا: «…rade at Al Kharj substations - Phase 2»
                      بعد ضياع «Partial Security System upg». الاتجاه التلقائي
                      يجعل النصّ اللاتيني يُقصّ من آخره كما يجب، ويترك العربي
                      (متى وردت أسماء عربية من القاعدة) على حاله. */}
                  <h3
                    dir="auto"
                    className="truncate text-start font-semibold text-foreground"
                    title={p.name_ar}
                  >
                    {p.name_ar}
                  </h3>
                  {/* وسم الصف المحاكى — النمط نفسه المستعمل في /sec/maintenance.
                      تصدير المشاريع بنيتُه حقيقية وقيمه تمثيلية، فيُعرض موسومًا
                      حتى تُربط المجموعة الإنتاجية. */}
                  {p.is_simulation && (
                    <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600">
                      محاكاة مرجعية
                    </span>
                  )}
                </div>
                {/* ٢٠٢٦/٠٨/٣٠: الدائرة كانت تُعرض «—» على كل صفٍّ مستورد،
                    لأن تصدير المشاريع لا يحمل دوائر بل **منطقة عمليات وخطّ
                    أعمال وموقعًا** — تصنيفٌ آخر. فحلّ الحقيقيُّ محلَّ
                    الشرطة، وتبقى الدائرة حين تأتي من القاعدة. */}
                <p className="mt-1 text-xs text-muted-foreground">
                  {[p.ref, circleMap.get(p.circle_id ?? "") ?? p.area_ar, p.location_ar, p.kind]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {p.business_ar && (
                  <p className="mt-0.5 text-[12px] text-[color:var(--ink-3)]">{p.business_ar}</p>
                )}
              </div>
              {(() => {
                const h = (p.health && HEALTH[p.health]) || HEALTH_UNMEASURED;
                return (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-semibold ${h.clr}`}
                  >
                    <span aria-hidden>{h.glyph}</span> {h.label}
                  </span>
                );
              })()}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الإنجاز</span>
              <span className="font-semibold">{p.progress}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              {/* الشرط الثلاثي القديم كان يسقط إلى **أحمر** عند أي قيمة غير
                  أخضر/كهرماني — فمع الصحّة غير المقيسة (539 مشروعًا) كان
                  شريط التقدّم يصبغها كلَّها بالخطر. القيمة غير المقيسة تأخذ
                  لون المحايد لا لون الإنذار. */}
              <div
                className={`h-full ${
                  p.health === "green"
                    ? "bg-emerald-500"
                    : p.health === "amber"
                      ? "bg-amber-500"
                      : p.health === "red"
                        ? "bg-red-500"
                        : "bg-[color:var(--ink-3)]"
                }`}
                style={{ width: `${p.progress}%` }}
              />
            </div>
            {/* قرار المالك ٢٠٢٦/٠٨/٢٠: حُذف سطرا «الميزانية» و«المصروف» من
                البطاقة — يبقى المدير والمقاول فقط. */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">المدير</div>
                <div className="font-medium text-foreground">{p.manager ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">المقاول</div>
                <div className="font-medium text-foreground">{p.contractor ?? "—"}</div>
              </div>
            </div>
            {/* قرار المالك ٢٠٢٦/٠٨/٢٠: «من/إلى» صارت «بداية المشروع/نهاية
                المشروع» بتاريخ فقط. */}
            <div className="mt-2 flex justify-between text-[12px] text-muted-foreground">
              <span>بداية المشروع: {fmtDate(p.starts_at)}</span>
              <span>نهاية المشروع: {fmtDate(p.ends_at)}</span>
            </div>
            {/* الحالة كانت تُطبع بمعرّفها الإنجليزي («in-progress») على
                واجهة عربية أولًا. المعرّف يبقى في البيانات والعرض عربي. */}
            <div className="mt-2">
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[12px]">
                {STATUS_AR[p.status] ?? p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
