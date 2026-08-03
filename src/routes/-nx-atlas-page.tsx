/**
 * اتجاه أ — «مركز المهام».
 *
 * المبدأ: **الكثافة جمال**. لا مساحة ميتة، لا بطاقة تسبح في فراغ. السطح
 * يمتدّ من حافة إلى حافة، وكل بكسل يحمل قياسًا أو حدًّا أو حدثًا — كطرفية
 * تداول أو غرفة تحكّم مهمّة، حيث الازدحام المنظَّم هو ما يوحي بالسيطرة.
 *
 * ثلاثة أعمدة لا تتنفّس: المناطق · القلب الحيّ · مجرى الأحداث. وبينها
 * شعيرات فاصلة لا فجوات. الأرقام أحادية العرض تصطفّ رأسيًّا كعمود واحد،
 * والزوايا مقوّسة بأقواس تثبيت كإطار أداة قياس.
 */
import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowUpRight, Waves } from "lucide-react";
import {
  CC_ALERTS,
  CC_REGIONS,
  CC_REGION_METRICS,
  CC_SYSTEM_RINGS,
} from "@/components/executive/command/commandCenterData";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** شرارة خطّية من متسلسلة حتمية — لا عشوائية تكسر التصيير الخادمي. */
function Spark({ seed, className = "" }: { seed: number; className?: string }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const v = Math.sin((i + seed) * 0.7) * 0.5 + Math.sin((i + seed) * 0.23) * 0.5;
    return `${(i / 23) * 100},${14 - (v * 0.5 + 0.5) * 12}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 14" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** حلقة قياس — القيمة في القلب، والمسار يكمل الدائرة. */
function Dial({ pct, size = 78 }: { pct: number; size?: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" style={{ width: size, height: size }} className="shrink-0" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="nx-at-dial-track" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="nx-at-dial-value"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fill="currentColor" className="nx-at-dial-text">
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function Bracketed({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`nx-at-panel relative flex min-h-0 flex-col ${className}`}>
      <header className="nx-at-panel-head flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-bold uppercase tracking-[0.24em] text-[color:var(--ink-2)]">
          {title}
        </span>
        {meta && (
          <span className="shrink-0 nx-at-mono text-[12px] text-[color:var(--ink-3)]">{meta}</span>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function NxAtlasPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data } = useQuery({
    queryKey: ["atlas-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const live = useMemo(() => {
    const out: Partial<Record<RegionId, number>> = {};
    for (const r of data?.regions ?? [])
      if (r.compliance_pct > 0) out[r.region_id] = r.compliance_pct;
    return out;
  }, [data]);

  const activeRegion = REGIONS.find((r) => r.id === regionId)!;
  const regionLabel = ar ? activeRegion.shortAr : activeRegion.shortEn;
  const c = data?.counters;
  const dash = "—";
  const num = (v: number | undefined) =>
    typeof v === "number" ? v.toLocaleString(ar ? "ar-SA" : "en-US") : dash;

  /** شريط التلمترية العلوي — ثمانية قياسات متجاورة بلا فراغ بينها. */
  const telemetry = [
    { ar: "الوكلاء", en: "Agents", v: num(c?.agents_active) },
    { ar: "بانتظار الاعتماد", en: "Pending", v: num(c?.proposals_pending) },
    { ar: "عاجل مفتوح", en: "Urgent", v: num(c?.urgent_open) },
    { ar: "قيد المعالجة", en: "Processing", v: num(c?.support_processing) },
    { ar: "منجز اليوم", en: "Done today", v: num(c?.done_today) },
    { ar: "الامتثال", en: "Compliance", v: c?.compliance_avg ? `${c.compliance_avg}%` : dash },
    { ar: "المناطق", en: "Regions", v: String(REGIONS.length) },
    { ar: "التنبيهات", en: "Alerts", v: num(data?.urgent?.length) },
  ];

  return (
    <main className="nx-at relative flex min-h-screen flex-col bg-[color:var(--surface)] text-[color:var(--ink)]">
      {/* ① شريط التلمترية — يمتدّ من حافة إلى حافة، ثماني خلايا متلاصقة. */}
      <div className="nx-at-telemetry grid grid-cols-4 lg:grid-cols-8">
        {telemetry.map((t, i) => (
          <div key={t.en} className="nx-at-cell">
            <span className="block truncate text-[12px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
              {ar ? t.ar : t.en}
            </span>
            <span className="mt-1 flex items-end justify-between gap-2">
              <b className="nx-at-mono text-xl leading-none text-[color:var(--ink)]">{t.v}</b>
              <Spark seed={i * 3} className="h-4 w-12 text-[color:var(--tone-cyan)] opacity-70" />
            </span>
          </div>
        ))}
      </div>

      {/* ② الجسد — ثلاثة أعمدة تفصلها شعيرات لا فجوات. */}
      <div className="nx-at-body grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,340px)]">
        {/* المناطق */}
        <div className="nx-at-col">
          <Bracketed
            title={ar ? "المناطق الأربع" : "Four regions"}
            meta={ar ? "امتثال" : "compliance"}
          >
            <ul>
              {REGIONS.map((region) => {
                const panel = CC_REGIONS[region.id];
                const pct =
                  live[region.id] ?? panel.kpis.find((k) => k.ringPct != null)?.ringPct ?? 0;
                const active = region.id === regionId;
                return (
                  <li key={region.id}>
                    <button
                      type="button"
                      onClick={() => setRegion(region.id)}
                      aria-pressed={active}
                      className="nx-at-region flex w-full min-h-14 items-center gap-3 px-3 py-2.5 text-start"
                      style={{ ["--at-accent" as string]: REGION_ACCENT_HEX[region.id] }}
                    >
                      <Dial pct={pct} size={54} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <b className="truncate text-sm">{ar ? region.shortAr : region.shortEn}</b>
                          {active && (
                            <span className="nx-at-tag">{ar ? "الحالية" : "current"}</span>
                          )}
                        </span>
                        <span className="mt-1 grid grid-cols-4 gap-1">
                          {CC_REGION_METRICS.map((m) => (
                            <span key={m.key} className="nx-at-micro">
                              <b className="nx-at-mono block truncate text-[12px]">
                                {panel.metrics[m.key]}
                              </b>
                              <i className="block truncate text-[12px] not-italic text-[color:var(--ink-3)]">
                                {ar ? m.ar : m.en}
                              </i>
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Bracketed>

          <Bracketed title={ar ? "صحّة النظام" : "System health"}>
            <ul className="px-3 py-2">
              {CC_SYSTEM_RINGS.map((r) => (
                <li key={r.en} className="nx-at-meter">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-[color:var(--ink-2)]">
                      {ar ? r.ar : r.en}
                    </span>
                    <b className="nx-at-mono text-sm">{r.pct}%</b>
                  </span>
                  <span className="nx-at-bar" style={{ ["--at-fill" as string]: `${r.pct}%` }} />
                </li>
              ))}
            </ul>
          </Bracketed>
        </div>

        {/* القلب */}
        <div className="nx-at-col nx-at-col--core">
          <Bracketed
            title={ar ? "مصفوفة الوحدات التشغيلية" : "Operational module matrix"}
            meta={`${CC_REGIONS[regionId].modules.length} × ${REGIONS.length}`}
          >
            <div className="nx-at-matrix grid h-full grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4">
              {CC_REGIONS[regionId].modules.map((m, i) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.to}
                    to={m.to}
                    className="nx-at-module group flex min-h-14 items-center gap-2.5 px-3 py-3"
                    style={{ ["--at-i" as string]: i }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[color:var(--tone-cyan)]" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {ar ? m.ar : m.en}
                    </span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-[color:var(--ink-3)] transition group-hover:text-[color:var(--tone-cyan)]"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </Bracketed>

          <Bracketed title={ar ? "المبادرات الجارية" : "Running initiatives"} meta={regionLabel}>
            <ul className="px-3 py-2">
              {CC_REGIONS[regionId].initiatives.map((it) => (
                <li key={it.en} className="nx-at-init">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs">{ar ? it.ar : it.en}</span>
                    <b className="nx-at-mono shrink-0 text-xs">{it.pct}%</b>
                  </span>
                  <span
                    className="nx-at-bar nx-at-bar--accent"
                    style={{
                      ["--at-fill" as string]: `${it.pct}%`,
                      ["--at-accent" as string]: REGION_ACCENT_HEX[regionId],
                    }}
                  />
                </li>
              ))}
            </ul>
          </Bracketed>

          <Bracketed title={ar ? "مؤشرات المنطقة" : "Region indicators"}>
            <div className="grid grid-cols-3">
              {CC_REGIONS[regionId].kpis.map((k, i) => (
                <div key={k.en} className="nx-at-kpi">
                  <span className="block truncate text-[12px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                    {ar ? k.ar : k.en}
                  </span>
                  <b className="nx-at-mono mt-1 block text-2xl leading-none">{k.value}</b>
                  {k.delta && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-[color:var(--tone-emerald)]">
                      <Activity className="h-3 w-3" aria-hidden />
                      {k.delta}
                    </span>
                  )}
                  <Spark
                    seed={i * 7 + 2}
                    className="mt-2 h-6 w-full text-[color:var(--tone-cyan)] opacity-60"
                  />
                </div>
              ))}
            </div>
          </Bracketed>
        </div>

        {/* المجرى */}
        <div className="nx-at-col">
          <Bracketed title={ar ? "مجرى الأحداث" : "Event stream"} meta={ar ? "حيّ" : "live"}>
            <ul>
              {(data?.urgent ?? []).slice(0, 7).map((a) => (
                <li key={a.id} className="nx-at-event">
                  <span className="nx-at-event-dot" data-level="high" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs font-semibold">{a.title_ar}</b>
                    <i className="block truncate text-[12px] not-italic text-[color:var(--ink-3)]">
                      {a.department}
                    </i>
                  </span>
                </li>
              ))}
              {CC_ALERTS.map((a) => (
                <li key={a.en} className="nx-at-event">
                  <span className="nx-at-event-dot" data-level={a.level} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs font-semibold">{ar ? a.ar : a.en}</b>
                    <i className="block truncate text-[12px] not-italic text-[color:var(--ink-3)]">
                      {ar ? "تنبيه نظام" : "system alert"}
                    </i>
                  </span>
                  <span className="nx-at-mono shrink-0 text-[12px] text-[color:var(--ink-3)]">
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          </Bracketed>

          <Bracketed title={ar ? "خطّ التدفّق" : "Throughput"} meta="24h">
            <div className="px-3 py-3">
              <Spark seed={11} className="h-16 w-full text-[color:var(--tone-cyan)]" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { ar: "ذروة", en: "peak", v: "18:40" },
                  { ar: "متوسط", en: "avg", v: "62%" },
                  { ar: "تأخّر", en: "lag", v: "0.4s" },
                ].map((x) => (
                  <span key={x.en} className="nx-at-chip">
                    <b className="nx-at-mono block text-sm">{x.v}</b>
                    <i className="block text-[12px] not-italic text-[color:var(--ink-3)]">
                      {ar ? x.ar : x.en}
                    </i>
                  </span>
                ))}
              </div>
            </div>
          </Bracketed>
        </div>
      </div>

      {/* ③ شريط الحالة السفلي */}
      <footer className="nx-at-status">
        <span className="inline-flex items-center gap-2">
          <Waves className="h-3.5 w-3.5 text-[color:var(--tone-cyan)]" aria-hidden />
          {ar ? "سَدِيد · مركز المهام" : "SADEED · Mission Control"}
        </span>
        <span className="nx-at-mono text-[12px] text-[color:var(--ink-3)]">
          {ar
            ? "محاكاة مرجعية — ما لم يُقَس يُعرض «—»"
            : "reference simulation — unmeasured shows “—”"}
        </span>
      </footer>
    </main>
  );
}

export default NxAtlasPage;
