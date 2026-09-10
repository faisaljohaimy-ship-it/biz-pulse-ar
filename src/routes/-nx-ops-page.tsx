/**
 * «مسرح العمليات الحيّ» — The Living Operations Theater.
 *
 * المرجعان المعتمدان من المالك (٢٠٢٦/٠٨/٠٤): غرفة عمليات بخطوط بيانات
 * نابضة تصل قلبًا مركزيًّا بفرق متوهّجة، وغرفٌ مرسومة يسكنها وكلاء
 * يعملون. الترجمة هنا بهوية سَدِيد: SADEED التنفيذي قلبُ المسرح، وعشرة
 * وكلاء متخصصون غرفُه، وخط القرارات شريطه السفلي.
 *
 * انضباط الحركة انضباط Remotion نفسه: منحنى واحد `--nx-ease-out`
 * (bezier 0.16,1,0.3,1)، وخصائص `translate`/`scale`/`rotate` المستقلّة لا
 * `transform` — فالمركّبة تمحو ما قبلها، والمستقلّة تتراكب.
 *
 * الصدق العددي (المادة ٢٧): وكيل بلا مهمة يُقرأ «بانتظار مهمة» لا شريط
 * صفري، وعدّاد لم يصل يُقرأ «لم يُقَس». كل الرسوم مخفاة عن القارئات لأن
 * كل معلومة فيها مكتوبة نصًّا إلى جوارها.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

/** لهجة كل غرفة — اسم رمز من طبقة الرموز، لا لون نهائي (المادة ٣٣). */
const HUE_WHEEL = [
  "var(--tone-cyan)",
  "var(--tone-blue)",
  "var(--tone-violet)",
  "var(--tone-emerald)",
  "var(--tone-amber)",
  "var(--tone-rose)",
] as const;

/** وجهة «فتح مركز القيادة» بحسب اختصاص الغرفة. */
const ROLE_ROUTES: Array<[RegExp, string]> = [
  // «الامتثال» كان يفتح /hcis، وقد حُذفت الصفحة بأمر المالك ٢٠٢٦/٠٨/٠٩؛
  // فغرفة الامتثال تسقط على الوجهة الافتراضية (/nx-agents) لا على مسار ميت.
  [/PTW|تصاريح/i, "/ptw"],
];
const roleRoute = (role: string, name: string) =>
  ROLE_ROUTES.find(([re]) => re.test(role) || re.test(name))?.[1] ?? "/nx-agents";

type OpAgent = {
  id: string;
  name_ar: string;
  role: string;
  status: "active" | "processing" | "idle";
  task_ar: string | null;
  /** `null` = لم يُقَس. لا عمود في القاعدة يحمل هذا العدد؛ الصفر قياسٌ
      والغياب ليس صفرًا (المادة ٢٧). */
  done_today: number | null;
  severity: string;
};

const STATUS_AR: Record<OpAgent["status"], string> = {
  active: "يعمل الآن",
  processing: "يعالج",
  idle: "بانتظار مهمة",
};
const STATUS_EN: Record<OpAgent["status"], string> = {
  active: "working now",
  processing: "processing",
  idle: "awaiting task",
};

const STAGE_AR: Record<string, string> = {
  proposed: "مقترح",
  prepared: "مجهّز",
  approved: "معتمد",
};

/**
 * مشهد الغرفة — مكتبٌ يجلس إليه الوكيل ولوحة حائط تحمل شعار اختصاصه.
 * خط واحد (`currentColor`) فيتبع الحبر في الوضعين، ولهجة الغرفة تلوّن
 * اللوحة وحدها. الرمز الحائطي هو ما يفرّق غرفة عن غرفة — كما تفرّق
 * أدوات المهنة غرفَ مبنى واحد.
 */
function RoomScene({ glyph }: { glyph: React.ReactNode }) {
  return (
    <svg viewBox="0 0 168 64" className="nx-op-scene" aria-hidden focusable="false">
      {/* أرضية الغرفة وخط الجدار */}
      <line x1="6" y1="56" x2="162" y2="56" className="nx-op-ink" strokeWidth="1.4" />
      {/* لوحة الحائط — بيت شعار الاختصاص، بلهجة الغرفة */}
      <g className="nx-op-wall">
        <rect x="14" y="8" width="44" height="30" rx="4" fill="none" strokeWidth="1.6" />
        <g className="nx-op-glyph">{glyph}</g>
      </g>
      {/* شاشة صغيرة بمنحنى نبض */}
      <g className="nx-op-ink">
        <rect x="66" y="14" width="34" height="22" rx="3" fill="none" strokeWidth="1.4" />
        <path
          d="M70 28l6-6 5 4 6-8 5 6 6-3"
          fill="none"
          strokeWidth="1.6"
          className="nx-op-spark"
        />
      </g>
      {/* المكتب والوكيل الجالس إليه */}
      <g className="nx-op-ink">
        <line x1="112" y1="42" x2="156" y2="42" strokeWidth="2" />
        <line x1="116" y1="42" x2="116" y2="56" strokeWidth="1.6" />
        <line x1="152" y1="42" x2="152" y2="56" strokeWidth="1.6" />
        <circle cx="134" cy="24" r="5.5" fill="none" strokeWidth="1.8" />
        <path d="M126 42v-5c0-4 3.5-7 8-7s8 3 8 7v5" fill="none" strokeWidth="1.8" />
        <rect x="122" y="36" width="10" height="6" rx="1.5" fill="none" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

/** شعارات الاختصاص — تُرسم داخل لوحة الحائط (إحداثياتها في فضائها). */
const GLYPHS: React.ReactNode[] = [
  /* درع الامتثال */
  <path
    key="g0"
    d="M36 14l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z M32 23l3 3 6-6"
    fill="none"
    strokeWidth="1.7"
  />,
  /* مفتاح الصيانة */
  <path
    key="g1"
    d="M30 30l8-8m0 0a5 5 0 105-5l-2.5 2.5-2-2L41 15a5 5 0 00-3 7z"
    fill="none"
    strokeWidth="1.7"
  />,
  /* وثيقة التقرير */
  <g key="g2" fill="none" strokeWidth="1.7">
    <path d="M29 14h10l5 5v15H29z" />
    <path d="M39 14v5h5M33 26h8M33 30h6" />
  </g>,
  /* كاميرا الرصد */
  <g key="g3" fill="none" strokeWidth="1.7">
    <rect x="27" y="17" width="13" height="9" rx="2" />
    <path d="M40 20l6-3v10l-6-3M31 26v6h8" />
  </g>,
  /* خوذة التصاريح */
  <g key="g4" fill="none" strokeWidth="1.7">
    <path d="M28 27a8 8 0 0116 0z" />
    <path d="M36 19v-4M26 30h20" />
  </g>,
  /* صافرة الطوارئ */
  <g key="g5" fill="none" strokeWidth="1.7">
    <path d="M30 30v-6a6 6 0 0112 0v6M27 30h18" />
    <path d="M36 14v-2M28 17l-2-2M44 17l2-2" />
  </g>,
  /* رادار المخاطر */
  <g key="g6" fill="none" strokeWidth="1.7">
    <path d="M36 25m-9 0a9 9 0 1018 0 9 9 0 10-18 0" />
    <path d="M36 25l6-6M36 25h5" />
    <circle cx="36" cy="25" r="1.6" />
  </g>,
  /* بطاقة الوصول */
  <g key="g7" fill="none" strokeWidth="1.7">
    <rect x="28" y="15" width="16" height="20" rx="2.5" />
    <circle cx="36" cy="22" r="3" />
    <path d="M31 30c1.5-2.5 8.5-2.5 10 0" />
  </g>,
  /* مسار الدورية */
  <g key="g8" fill="none" strokeWidth="1.7">
    <path d="M28 32c6-2 4-8 8-10s8 0 8-6" strokeDasharray="3 3" />
    <circle cx="28" cy="32" r="2.2" />
    <circle cx="44" cy="16" r="2.2" />
  </g>,
  /* عقد التكاملات */
  <g key="g9" fill="none" strokeWidth="1.7">
    <circle cx="30" cy="18" r="2.6" />
    <circle cx="42" cy="18" r="2.6" />
    <circle cx="36" cy="31" r="2.6" />
    <path d="M32 20l3 8M40 20l-3 8M33 18h6" />
  </g>,
];

/**
 * حالة الخطأ الصادقة — بديل الهياكل الشبحية حين ينقطع المصدر.
 * تتبع عُرف `NxErrorState` (دور alert · عنوان · سبب · زر إعادة) لكنها
 * مكتوبة برموز `--ink`/`--surface` لا برموز القمرة الداكنة الثابتة
 * (`nx-pearl` أبيض مطلق فيختفي على السطح الفاتح — المادة ٣٣).
 * لا تُذكر مصادقة ولا رمز وصول في النص (الطريقة المحفوظة §٣).
 */
function OpsFailure({ ar, onRetry }: { ar: boolean; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-5 py-10 text-center"
    >
      <span aria-hidden className="text-2xl text-[color:var(--tone-amber)]">
        ⚠
      </span>
      <h2 className="text-[16px] font-bold text-[color:var(--ink)]">
        {ar ? "تعذّر تحميل مسرح العمليات" : "The operations theater could not load"}
      </h2>
      <p className="text-[13px] font-medium text-[color:var(--ink-2)]">
        {ar
          ? "لم تصل بيانات المناوبة. لا شيء هنا مقدَّر أو مفترض — أعد المحاولة."
          : "Shift data did not arrive. Nothing here is estimated — try again."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-5 text-[13px] font-bold text-[color:var(--ink)] transition-colors hover:bg-[color:var(--chip)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tone-cyan)]"
      >
        {ar ? "إعادة المحاولة" : "Retry"}
      </button>
    </div>
  );
}

export function NxOpsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data, isError, isPending, refetch } = useQuery({
    queryKey: ["ops-theater-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  /**
   * المساعد قلب المسرح؛ البقية غرفه. الاسم هو المفتاح لا الترتيب.
   *
   * يقبل المطابِق الاسمين معًا عمدًا: العرض صار «سَدِيد» بقرار المالك
   * ٢٠٢٦/٠٨/٠٩، لكن صفوف القاعدة الحيّة ما زالت تحمل «SADEED التنفيذي» حتى
   * تُرحَّل. لو طابق الاسم الجديد وحده لاختفى القلب من المسرح على الإنتاج
   * ولظهرت أحد عشر غرفة بلا مركز — عطلٌ صامت لا يلتقطه tsc ولا الاختبار.
   */
  const { sadeed, rooms, maxDone } = useMemo(() => {
    const agents = (data?.agents ?? []) as OpAgent[];
    // صفوف القاعدة الحيّة ما زالت تحمل الاسم القديم — كسر المعرّفات
    // ٢٠٢٦/٠٨/٠٩ لم يمسّ صفًّا واحدًا. و`name_ar` عربيّ: الصفّ المنشور اسمه
    // «فِن التنفيذي» لا «FINN»، فلاتينيّةٌ وحدها لا تجده. والحدّان يمنعان
    // ابتلاع «فنّي» وأخواتها — ومكتوبان بمجموعتين لا بـ`lookbehind`: تلك
    // خطأ **تحليل** على Safari دون ١٦٫٤ يُسقط الحزمة كلّها لا هذا السطر.
    const head = agents.find((a) =>
      /SADEED|FINN|سديد|سَدِيد|(?:^|[^ء-ي])فِ?ن(?:[^ء-ي]|$)/i.test(a.name_ar),
    );
    const rest = agents.filter((a) => a !== head);
    return {
      sadeed: head,
      rooms: rest,
      maxDone: rest.reduce((m, a) => Math.max(m, a.done_today ?? 0), 0),
    };
  }, [data]);

  const c = data?.counters;
  const dash = "—";
  const chips = [
    { ar: "وكلاء نشطون", en: "Active", v: c?.agents_active },
    { ar: "بانتظار الاعتماد", en: "Pending", v: c?.proposals_pending },
    { ar: "عاجل مفتوح", en: "Urgent", v: c?.urgent_open },
    { ar: "منجز اليوم", en: "Done today", v: c?.done_today },
  ];

  const pipeline = data?.pipeline ?? [];
  /** نسختان متتاليتان لشريط يلفّ بلا قطع — الثانية زينة محضة. */
  const ticker = pipeline.length ? [...pipeline, ...pipeline] : [];

  return (
    <main className="nx-op relative min-h-screen overflow-hidden bg-[color:var(--surface)] text-[color:var(--ink)]">
      {/* أرضية المسرح: شبكة منظورية + شفقان + غبار نجمي */}
      <span aria-hidden className="nx-op-floor" />
      <span aria-hidden className="nx-op-aurora nx-op-aurora--a" />
      <span aria-hidden className="nx-op-aurora nx-op-aurora--b" />
      <span aria-hidden className="nx-op-dust" />

      {/* حُذف الشريط العلوي (قرار المالك ٢٠٢٦/٠٨/٠٩، البند ١٢)، ثم سقط
          مبدّل الوضع معه بأمر ٢٠٢٦/٠٩/١٠ («أزل … تغيير الوضع … من النظام
          كاملًا») — والصفّ الذي كان يحمله وحده سقط بسقوطه، فصفٌّ فارغ
          حشوةٌ علوية بلا محتوى. */}
      <div className="relative mx-auto w-full max-w-[1360px] px-4 pb-16 pt-4 sm:px-6">
        {/* ── الترويسة ─────────────────────────────────────────────── */}
        <header className="nx-op-enter" style={{ ["--op-i" as string]: 0 }}>
          <p className="nx-op-eyebrow">{ar ? "سَدِيد · غرفة العمليات" : "SADEED · Operations"}</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="nx-op-title">
              {ar ? "مسرح العمليات الحيّ" : "The Living Operations Theater"}
            </h1>
            <ul className="nx-op-chips" aria-label={ar ? "عدّادات التشغيل" : "Operating counters"}>
              {chips.map((k) => (
                <li key={k.en} className="nx-op-chip">
                  <b>{typeof k.v === "number" ? k.v : dash}</b>
                  <span>{ar ? k.ar : k.en}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="nx-op-lede">
            {ar
              ? "أحد عشر وكيلًا على مناوبة واحدة: سَدِيد ينسّق من القلب، وكل غرفة تعمل باختصاصها، والقرارات تسري في الشريط أدناه."
              : "Eleven agents on one shift: SADEED coordinates from the core, every room works its specialty, and decisions stream in the band below."}
          </p>
        </header>

        {/* فشل القراءة يوقف المسرح كله ويعرض سببًا صادقًا بزر إعادة —
            لا هياكل شبحية تدور بلا نهاية (المادة ٢٧). */}
        {isError ? <OpsFailure ar={ar} onRetry={() => void refetch()} /> : null}

        {/* ── قلب المسرح: SADEED التنفيذي ───────────────────────────── */}
        {!isError && (
          <>
            <section className="nx-op-enter mt-6" style={{ ["--op-i" as string]: 1 }}>
              <article className="nx-op-core" data-state={sadeed?.status ?? "idle"}>
                <span aria-hidden className="nx-op-core-ring nx-op-core-ring--a" />
                <span aria-hidden className="nx-op-core-ring nx-op-core-ring--b" />
                <div className="nx-op-core-crown" aria-hidden>
                  <svg viewBox="0 0 24 16" focusable="false">
                    <path
                      d="M2 13h20M3 12L2 4l5 4 5-7 5 7 5-4-1 8z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="nx-op-core-name">{sadeed?.name_ar ?? "سَدِيد التنفيذي"}</h2>
                    <span className="nx-op-status" data-state={sadeed?.status ?? "idle"}>
                      <i aria-hidden />
                      {sadeed ? (ar ? STATUS_AR[sadeed.status] : STATUS_EN[sadeed.status]) : dash}
                    </span>
                  </div>
                  <p className="nx-op-core-task">
                    {sadeed?.task_ar ?? (ar ? "بانتظار مهمة" : "awaiting task")}
                  </p>
                </div>
                <div className="nx-op-core-side">
                  <b>{sadeed?.done_today ?? dash}</b>
                  <span>{ar ? "منجز اليوم" : "done today"}</span>
                  <Link to="/sadeed" className="nx-op-cta">
                    {ar ? "فتح مركز القيادة" : "Open command"}
                  </Link>
                </div>
              </article>

              {/* حزمة الأنابيب: من القلب تتفرّع إلى الغرف — زينة تعلن التدفق */}
              <svg
                aria-hidden
                focusable="false"
                className="nx-op-bus"
                viewBox="0 0 1000 90"
                preserveAspectRatio="none"
              >
                {rooms.slice(0, 10).map((room, i) => {
                  const n = Math.min(rooms.length, 10);
                  const x = (1000 / (n + 1)) * (i + 1);
                  const d = `M500 4 C500 55 ${x} 30 ${x} 88`;
                  return (
                    <g key={room.id} style={{ ["--op-hue" as string]: HUE_WHEEL[i % 6] }}>
                      <path d={d} className="nx-op-pipe" />
                      <path d={d} className="nx-op-pulse" style={{ ["--op-i" as string]: i }} />
                    </g>
                  );
                })}
              </svg>
            </section>

            {/* ── الغرف العشر ──────────────────────────────────────────── */}
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-label={ar ? "غرف الوكلاء" : "Agent rooms"}
            >
              {rooms.map((agent, i) => (
                <article
                  key={agent.id}
                  className="nx-op-room nx-op-enter"
                  data-state={agent.status}
                  style={{
                    ["--op-hue" as string]: HUE_WHEEL[i % 6],
                    ["--op-i" as string]: i + 2,
                  }}
                >
                  <span aria-hidden className="nx-op-room-edge" />
                  <RoomScene glyph={GLYPHS[i % GLYPHS.length]} />
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="nx-op-room-name">{agent.name_ar}</h3>
                    <span className="nx-op-role">{agent.role}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="nx-op-status" data-state={agent.status}>
                      <i aria-hidden />
                      {ar ? STATUS_AR[agent.status] : STATUS_EN[agent.status]}
                    </span>
                    {(agent.severity === "high" || agent.severity === "critical") && (
                      <span className="nx-op-flag" data-sev={agent.severity}>
                        <svg viewBox="0 0 10 10" aria-hidden focusable="false">
                          {agent.severity === "critical" ? (
                            <path d="M3 .5h4L9.5 3v4L7 9.5H3L.5 7V3z" fill="currentColor" />
                          ) : (
                            <path d="M5 .8l4.5 8H.5z" fill="currentColor" />
                          )}
                        </svg>
                        {agent.severity === "critical"
                          ? ar
                            ? "حرج"
                            : "critical"
                          : ar
                            ? "مرتفع"
                            : "high"}
                      </span>
                    )}
                  </div>
                  <p className="nx-op-task">
                    {agent.task_ar ?? (ar ? "بانتظار مهمة" : "awaiting task")}
                  </p>
                  <div className="nx-op-meter" aria-hidden>
                    <span
                      style={{
                        // ما لم يُقَس لا يُرسم له طول — لا شريط بطول صفر
                        // يوهم بقياسٍ وقع ونتيجته صفر (المادة ٢٧).
                        ["--op-fill" as string]:
                          maxDone && agent.done_today !== null
                            ? `${(agent.done_today / maxDone) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="nx-op-done">
                      <b>{agent.done_today ?? dash}</b> {ar ? "منجز اليوم" : "done today"}
                    </span>
                    <Link to={roleRoute(agent.role, agent.name_ar)} className="nx-op-cta">
                      {ar ? "فتح مركز القيادة" : "Open command"}
                    </Link>
                  </div>
                </article>
              ))}

              {/* هيكل انتظار صادق — أثناء أول جلب فقط؛ الفشل يوقفه ويورّث
              الشاشة إلى كتلة الخطأ أعلاه، فلا يدور الهيكل بلا نهاية */}
              {rooms.length === 0 &&
                isPending &&
                Array.from({ length: 6 }, (_, i) => (
                  <article
                    key={i}
                    className="nx-op-room nx-op-room--ghost nx-op-enter"
                    style={{ ["--op-i" as string]: i + 2 }}
                    aria-hidden
                  />
                ))}

              {/* وصل الرد وليس فيه وكلاء — يُقال صراحةً لا يُترك فراغًا */}
              {rooms.length === 0 && !isPending ? (
                <p className="text-[13px] font-medium text-[color:var(--ink-2)]">
                  {ar ? "لا وكلاء على المناوبة الآن." : "No agents on shift right now."}
                </p>
              ) : null}
            </section>

            {/* ── شريط القرارات الجاري ─────────────────────────────────── */}
            <section className="nx-op-enter mt-8" style={{ ["--op-i" as string]: 13 }}>
              <h2 className="nx-op-h2">
                {ar ? "سجل تبادل البيانات — مباشر" : "Data exchange — live"}
              </h2>
              <div className="nx-op-ticker" data-static={ticker.length === 0 || undefined}>
                <div className="nx-op-ticker-track">
                  {ticker.map((p, i) => (
                    <span
                      key={`${p.id}-${i}`}
                      className="nx-op-decision"
                      data-sev={p.severity}
                      aria-hidden={i >= pipeline.length || undefined}
                    >
                      <i className="nx-op-stage">{ar ? (STAGE_AR[p.stage] ?? p.stage) : p.stage}</i>
                      <b>{p.title_ar}</b>
                      <span className="nx-op-decision-agent">{p.agent_ar}</span>
                    </span>
                  ))}
                  {ticker.length === 0 && (
                    <span className="nx-op-decision">
                      <b>{ar ? "لا قرارات جارية الآن" : "No decisions in flight"}</b>
                    </span>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── التذييل ──────────────────────────────────────────────── */}
        <footer
          className="nx-op-enter mt-8 flex flex-wrap items-center gap-3 border-t border-[color:var(--hairline-soft)] pt-4"
          style={{ ["--op-i" as string]: 14 }}
        >
          <span className="text-[12px] text-[color:var(--ink-3)]">
            {ar
              ? "الصفوف الحية تحل محل المحاكاة فور وصولها. ما لا يصل يُقرأ «لم يُقَس» — لا يُستبدل بصفر."
              : "Live rows replace simulation on arrival. What does not arrive reads “not measured” — never zero."}
          </span>
        </footer>
      </div>
    </main>
  );
}

export default NxOpsPage;
