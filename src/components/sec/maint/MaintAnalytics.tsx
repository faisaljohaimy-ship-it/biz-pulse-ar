/**
 * تبويب «التحليلات» — يُحمَّل عند فتحه. أشرطة CSS بلا مكتبة رسوم (ميزانية
 * الحزمة)، وكل رقمٍ مكتوبٌ بجانب شريطه: الطول زينة، والرقم هو المعلومة.
 *
 * ما يقرؤه مهندس الصيانة هنا: أين يتركّز العطل (النظام · المنطقة · النوع · المكوّن ·
 * الموقع)، ولماذا تتوقف الأوامر النشطة، وهل يلحق الإنجاز بالطلب شهرًا بشهر،
 * و**الأعطال المتكررة** — المكوّن نفسه في الموقع نفسه خلال ٣٠ يومًا، أوضح
 * مرشّحٍ للصيانة الوقائية أو الاستبدال بدل الإصلاح المتكرر.
 */
import type { ReactNode } from "react";
import { Repeat } from "lucide-react";
import type { MaintAnalytics as A } from "@/lib/maintenance/maint-types";
import { type SystemCode } from "@/lib/maintenance/cm-log-rules";
import type { RegionId } from "@/lib/regions";
import {
  KIND_AR,
  SYSTEM_TONE,
  cityAr,
  fmt,
  fmt1,
  holdAr,
  regionAr,
  systemAr,
} from "@/components/sec/maint/maint-ui";

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="nx-home-panel flex min-w-0 flex-col rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4">
      <h3 className="text-[15px] font-black text-[color:var(--ink)]">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] text-[color:var(--ink-3)]">{hint}</p>}
      <div className="mt-3 min-w-0">{children}</div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  tone = "--tone-blue",
  extra,
}: {
  label: ReactNode;
  value: number;
  max: number;
  tone?: string;
  extra?: ReactNode;
}) {
  const pct = max > 0 ? Math.max(2, Math.round((100 * value) / max)) : 0;
  return (
    <li className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="min-w-0 truncate font-semibold text-[color:var(--ink)]">{label}</span>
        <span className="shrink-0 tabular-nums font-bold text-[color:var(--ink)]">
          {fmt(value)}
          {extra && <span className="ms-1 font-normal text-[color:var(--ink-3)]">{extra}</span>}
        </span>
      </div>
      <span
        aria-hidden
        className="block h-2 overflow-hidden rounded-full bg-[color:var(--chip-strong)]"
      >
        <span
          className="nx-home-bar nx-maint-bar block h-full rounded-full"
          style={{ ["--bar-pct" as string]: `${pct}%`, ["--seg-tone" as string]: `var(${tone})` }}
        />
      </span>
    </li>
  );
}

// رقميّ مختصر («٦/٢٥»): الاسم الكامل لا يتّسع تحت عمودين على ٣٩٠، فتتراكب العناوين.
const MONTHS = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { month: "numeric", year: "2-digit" });

export default function MaintAnalytics({ data }: { data: A }) {
  const maxRegion = Math.max(0, ...data.by_region.map((r) => r.n));
  const maxKind = Math.max(0, ...data.by_kind.map((r) => r.n));
  const maxSys = Math.max(0, ...data.by_system.map((r) => r.n));
  const maxCity = Math.max(0, ...data.by_city.map((r) => r.n));
  const maxHold = Math.max(0, ...data.by_hold_reason.map((r) => r.n));
  const maxComp = Math.max(0, ...data.top_components.map((r) => r.n));
  const maxSite = Math.max(0, ...data.top_sites.map((r) => r.n));
  const maxMonth = Math.max(0, ...data.monthly.map((m) => Math.max(m.requested, m.completed)));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="الأوامر حسب المنطقة" hint="المنجز والنشط، وعدد الوقائية منها">
        <ul className="grid gap-3">
          {data.by_region.map((r) => (
            <Bar
              key={r.key ?? "none"}
              label={regionAr(r.key as RegionId | null)}
              value={r.n}
              max={maxRegion}
              tone="--tone-emerald"
              extra={`· منجز ${fmt(r.done)} · نشط ${fmt(r.active)} · وقائية ${fmt(r.preventive)}`}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="وقائية أم تصحيحية؟" hint="كلّما زادت الوقائية قلّ العطل المفاجئ">
        <ul className="grid gap-3">
          {data.by_kind.map((r) => (
            <Bar
              key={r.key ?? "none"}
              label={r.key ? KIND_AR[r.key as keyof typeof KIND_AR] : "غير محدّد"}
              value={r.n}
              max={maxKind}
              tone={r.key === "preventive" ? "--tone-violet" : "--tone-amber"}
              extra={`· منجز ${fmt(r.done)} · نشط ${fmt(r.active)}`}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="الطلبات حسب النظام" hint="المنجز من الإجمالي، والنشط الآن">
        <ul className="grid gap-3">
          {data.by_system.map((r) => (
            <Bar
              key={r.key ?? "none"}
              label={systemAr(r.key as SystemCode | null)}
              value={r.n}
              max={maxSys}
              tone={r.key ? SYSTEM_TONE[r.key as SystemCode] : "--ink-3"}
              extra={`· نشط ${fmt(r.active)}`}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="الطلبات حسب المدينة" hint="ونسبة الالتزام بالموعد في المنجز">
        <ul className="grid gap-3">
          {data.by_city.map((r) => (
            <Bar
              key={r.key ?? "none"}
              label={cityAr(r.key)}
              value={r.n}
              max={maxCity}
              tone="--tone-cyan"
              extra={`· بالموعد ${r.on_time === null ? "لم يُقَس" : `${fmt1(r.on_time)}٪`}`}
            />
          ))}
        </ul>
      </Panel>

      <Panel
        title="لماذا تتوقف الأوامر النشطة؟"
        hint="من ملاحظة الفني أو سبب الإيقاف المسجّل — ما يحتاج قرارًا خارج فريق الصيانة"
      >
        {data.by_hold_reason.length === 0 ? (
          <p className="text-[13px] text-[color:var(--ink-3)]">لا أوامر نشطة.</p>
        ) : (
          <ul className="grid gap-3">
            {data.by_hold_reason.map((r) => (
              <Bar
                key={r.key ?? "none"}
                label={holdAr(r.key)}
                value={r.n}
                max={maxHold}
                tone="--tone-amber"
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="الطلب والإنجاز شهريًّا"
        hint="العمود الأزرق: طلبات الشهر · الأخضر: ما أُنجز منها"
      >
        <div className="flex h-44 items-end gap-1 overflow-x-auto pb-6" role="list">
          {data.monthly.map((m, i) => (
            <div
              key={m.month}
              role="listitem"
              aria-label={`${m.month}: ${fmt(m.requested)} طلبًا، أُنجز ${fmt(m.completed)}`}
              className="relative flex h-full min-w-6 flex-1 items-end justify-center gap-0.5"
            >
              <span
                className="nx-maint-col block w-2 rounded-t bg-[color:var(--tone-blue)]"
                style={{
                  ["--col-pct" as string]: `${maxMonth ? (100 * m.requested) / maxMonth : 0}%`,
                }}
              />
              <span
                className="nx-maint-col block w-2 rounded-t bg-[color:var(--tone-emerald)]"
                style={{
                  ["--col-pct" as string]: `${maxMonth ? (100 * m.completed) / maxMonth : 0}%`,
                }}
              />
              {/* أكثر من ثمانية أشهر ⇐ عنوانٌ لكل شهرين، والعمود يحمل شهره في aria-label. */}
              {(data.monthly.length <= 8 || i % 2 === 0) && (
                <span
                  aria-hidden
                  className="absolute -bottom-5 whitespace-nowrap text-[10px] tabular-nums text-[color:var(--ink-3)]"
                >
                  {MONTHS.format(new Date(`${m.month}-15T12:00:00`))}
                </span>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="أكثر المكوّنات أعطالًا" hint="العشرة الأولى — نقطة البدء في خطة قطع الغيار">
        <ul className="grid gap-3">
          {data.top_components.map((r) => (
            <Bar
              key={`${r.key}-${r.system}`}
              label={<bdi>{r.key}</bdi>}
              value={r.n}
              max={maxComp}
              tone={r.system ? SYSTEM_TONE[r.system] : "--ink-3"}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="أكثر المواقع طلبًا" hint="والنشط فيها الآن">
        <ul className="grid gap-3">
          {data.top_sites.map((r) => (
            <Bar
              key={r.key ?? "none"}
              label={<bdi>{r.key}</bdi>}
              value={r.n}
              max={maxSite}
              tone="--tone-violet"
              extra={r.active ? `· نشط ${fmt(r.active)}` : undefined}
            />
          ))}
        </ul>
      </Panel>

      <div className="lg:col-span-2">
        <Panel
          title="أعطال متكررة خلال ٣٠ يومًا"
          hint="المكوّن نفسه في الموقع نفسه عاد للعطل خلال شهر من سابقه — مرشّح للصيانة الوقائية أو الاستبدال بدل الإصلاح المتكرر"
        >
          {data.repeat_failures.length === 0 ? (
            <p className="text-[13px] text-[color:var(--ink-3)]">لا تكرار خلال ٣٠ يومًا.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.repeat_failures.map((r) => (
                <li
                  key={`${r.site}-${r.component}`}
                  className="flex items-center gap-2 rounded-xl border border-[color:var(--hairline-soft)] p-2.5"
                >
                  <Repeat aria-hidden className="size-4 shrink-0 text-[color:var(--tone-amber)]" />
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[13px] font-bold text-[color:var(--ink)]">
                      {r.component}
                    </bdi>
                    <bdi className="block truncate text-[12px] text-[color:var(--ink-3)]">
                      {r.site}
                    </bdi>
                  </span>
                  <span className="shrink-0 text-[13px] font-black tabular-nums text-[color:var(--ink)]">
                    {fmt(r.n)}× تكرار
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
