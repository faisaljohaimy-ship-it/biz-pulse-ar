/**
 * «رحلة الوكلاء مع فِن» — لوح العمل الساطع (قرار المالك ٢٠٢٦/٠٨/٠٤).
 *
 * سطحٌ فاتح مشرق ثابت الإضاءة في الوضعين: لوح ورقي أزرق فاتح تتوسطه فِن،
 * تتفرع منها أنابيب توجيه ملوّنة تسري فيها نبضات نحو عشرة وكلاء، وكل
 * بطاقة تقرأ خطوتها من الرحلة صراحةً — رسم مفهوم واضح لطريقة العمل:
 * فِن توجّه ← الوكيل ينفّذ ← القرار يعود للاعتماد البشري.
 *
 * ألوان اللوح من رموز `--stage-*` الثابتة (لا تنقلب مع الثيم) لأن اللوح
 * عملٌ فني مقصود الإضاءة، والحركة كلها بخصائص مستقلة بمنحنى النظام.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { BRAND_ASSISTANT } from "@/lib/domain";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

/** لهجات الغرف — رموز اللوح الساطعة، لا ألوان نهائية في العناصر. */
const HUES = [
  "var(--stage-cyan)",
  "var(--stage-blue)",
  "var(--stage-violet)",
  "var(--stage-emerald)",
  "var(--stage-amber)",
  "var(--stage-rose)",
] as const;

type FlowAgent = {
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

const STATUS_AR: Record<FlowAgent["status"], string> = {
  active: "ينفّذ الآن",
  processing: "يعالج التوجيه",
  idle: "بانتظار توجيه سَدِيد",
};
const STATUS_EN: Record<FlowAgent["status"], string> = {
  active: "executing",
  processing: "processing",
  idle: "awaiting SADEED",
};

/**
 * حالة الخطأ الصادقة للّوح — تتبع عُرف `NxErrorState` (دور alert · عنوان ·
 * سبب · زر إعادة) برموز `--ink`/`--surface` كي تبقى مقروءة في الوضعين،
 * لا برموز القمرة الداكنة الثابتة. ولا ذكر لمصادقة في النص.
 */
function FlowFailure({ ar, onRetry }: { ar: boolean; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--chip)] px-5 py-10 text-center"
    >
      <span aria-hidden className="text-2xl text-[color:var(--tone-amber)]">
        ⚠
      </span>
      <h2 className="text-[16px] font-bold text-[color:var(--ink)]">
        {ar ? "تعذّر تحميل لوح الرحلة" : "The journey board could not load"}
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

export function NxFlowPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data, isError, isPending, refetch } = useQuery({
    queryKey: ["flow-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { sadeed, rooms, maxDone } = useMemo(() => {
    const agents = (data?.agents ?? []) as FlowAgent[];
    // يقبل الأسماء الثلاثة: العرض «سَدِيد»، وصفوف القاعدة الحيّة ما زالت تحمل
    // «FINN» — كسر المعرّفات ٢٠٢٦/٠٨/٠٩ لم يمسّ صفًّا واحدًا في القاعدة.
    const head = agents.find((a) => /SADEED|FINN|سديد|سَدِيد/i.test(a.name_ar));
    const rest = agents.filter((a) => a !== head);
    return {
      sadeed: head,
      rooms: rest,
      maxDone: rest.reduce((m, a) => Math.max(m, a.done_today ?? 0), 0),
    };
  }, [data]);

  const steps = [
    { n: "١", ar: "سَدِيد يوجّه المهمة", en: "SADEED directs" },
    { n: "٢", ar: "الوكيل ينفّذ ويحدّث", en: "Agent executes" },
    { n: "٣", ar: "القرار يعود للاعتماد البشري", en: "Human approves" },
  ];

  const dash = "—";

  return (
    <main className="relative min-h-screen bg-[color:var(--surface)] text-[color:var(--ink)]">
      {/* حُذف الشريط العلوي (قرار المالك ٢٠٢٦/٠٨/٠٩، البند ١٢)؛ ومبدّل الوضع
          بقي — الصفحة خارج القشرة فلا مبدّل آخر لها (المادة ٣٢). */}
      <div className="relative z-20 flex justify-end px-4 pt-3 sm:px-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-[1360px] px-4 pb-14 pt-4 sm:px-6">
        <header className="nx-fl-enter" style={{ ["--pulse-i" as string]: 0 }}>
          <p className="nx-fl-eyebrow">{ar ? "سَدِيد · غرفة العمليات" : "SADEED · Operations"}</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="nx-fl-title">
              {ar ? "رحلة الوكلاء مع سَدِيد" : "The agents' journey with SADEED"}
            </h1>
          </div>
          <p className="nx-fl-lede">
            {ar
              ? "لوح حيّ يقرأ كيف تُدار المناوبة: التوجيه يخرج من سَدِيد، فينفّذه كل وكيل باختصاصه، ثم يعود ما يستلزم قرارًا إلى الاعتماد البشري."
              : "A living board of the shift: direction leaves SADEED, each agent executes its specialty, and whatever needs a decision returns to human approval."}
          </p>
        </header>

        {/* فشل القراءة يوقف اللوح ويعرض سببًا صادقًا بزر إعادة */}
        {isError ? <FlowFailure ar={ar} onRetry={() => void refetch()} /> : null}

        {/* ── اللوح الساطع ─────────────────────────────────────────── */}
        {!isError && (
          <section className="nx-fl-stage nx-fl-enter mt-5" style={{ ["--pulse-i" as string]: 1 }}>
            {/* خطوات الرحلة — المفتاح المقروء قبل الرسم */}
            <ol className="nx-fl-steps" aria-label={ar ? "خطوات الرحلة" : "Journey steps"}>
              {steps.map((s, i) => (
                <li key={s.n} className="nx-fl-step" style={{ ["--pulse-i" as string]: i }}>
                  <b>{s.n}</b>
                  <span>{ar ? s.ar : s.en}</span>
                  {i < steps.length - 1 && <i aria-hidden className="nx-fl-step-arrow" />}
                </li>
              ))}
            </ol>

            {/* فِن — قلب اللوح */}
            <article className="nx-fl-core">
              <span aria-hidden className="nx-fl-core-halo" />
              <img
                src={BRAND_ASSISTANT.portrait}
                alt=""
                width={84}
                height={84}
                loading="lazy"
                className="nx-fl-core-img"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="nx-fl-core-name">{sadeed?.name_ar ?? BRAND_ASSISTANT.nameAr}</h2>
                  <span className="nx-fl-chip">{ar ? "التنسيق العام" : "Coordination"}</span>
                </div>
                <p className="nx-fl-core-task">
                  {sadeed?.task_ar ?? (ar ? "بانتظار مهمة" : "awaiting task")}
                </p>
              </div>
              <div className="nx-fl-core-done">
                <b>{sadeed?.done_today ?? dash}</b>
                <span>{ar ? "منجز اليوم" : "done today"}</span>
              </div>
            </article>

            {/* أنابيب التوجيه — من فِن إلى كل غرفة، بنبضات تسري */}
            <svg
              aria-hidden
              focusable="false"
              className="nx-fl-bus"
              viewBox="0 0 1000 80"
              preserveAspectRatio="none"
            >
              {rooms.slice(0, 10).map((room, i) => {
                const n = Math.min(rooms.length, 10);
                const x = (1000 / (n + 1)) * (i + 1);
                const d = `M500 3 C500 48 ${x} 26 ${x} 78`;
                return (
                  <g key={room.id} style={{ ["--fl-hue" as string]: HUES[i % 6] }}>
                    <path d={d} className="nx-fl-pipe" />
                    <path d={d} className="nx-fl-pulse" style={{ ["--pulse-i" as string]: i }} />
                  </g>
                );
              })}
            </svg>

            {/* غرف الوكلاء */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {rooms.map((agent, i) => (
                <article
                  key={agent.id}
                  className="nx-fl-card nx-bp-float"
                  style={{ ["--fl-hue" as string]: HUES[i % 6], ["--pulse-i" as string]: i + 2 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="nx-fl-card-name">{agent.name_ar}</h3>
                    <span className="nx-fl-chip">{agent.role}</span>
                  </div>
                  <span className="nx-fl-status" data-state={agent.status}>
                    <i aria-hidden />
                    {ar ? STATUS_AR[agent.status] : STATUS_EN[agent.status]}
                  </span>
                  <p className="nx-fl-task">
                    {agent.task_ar ?? (ar ? "بانتظار توجيه سَدِيد" : "awaiting SADEED")}
                  </p>
                  <div className="nx-fl-meter" aria-hidden>
                    <span
                      style={{
                        ["--fl-fill" as string]:
                          maxDone && agent.done_today !== null
                            ? `${(agent.done_today / maxDone) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="nx-fl-done">
                      <b>{agent.done_today ?? dash}</b> {ar ? "منجز" : "done"}
                    </span>
                    <span className="nx-fl-stepchip">
                      {agent.severity === "high" || agent.severity === "critical"
                        ? ar
                          ? "٣ · يرفع للاعتماد"
                          : "3 · to approval"
                        : agent.status === "idle"
                          ? ar
                            ? "١ · ينتظر التوجيه"
                            : "1 · awaiting"
                          : ar
                            ? "٢ · ينفّذ"
                            : "2 · executing"}
                    </span>
                  </div>
                </article>
              ))}
              {/* هيكل انتظار أثناء أول جلب فقط — الفشل يوقفه */}
              {rooms.length === 0 &&
                isPending &&
                Array.from({ length: 5 }, (_, i) => (
                  <article key={i} className="nx-fl-card nx-fl-card--ghost" aria-hidden />
                ))}

              {/* وصل الرد وليس فيه وكلاء — يُقال صراحةً */}
              {rooms.length === 0 && !isPending ? (
                <p className="text-[13px] font-medium text-[color:var(--ink-2)]">
                  {ar ? "لا وكلاء على المناوبة الآن." : "No agents on shift right now."}
                </p>
              ) : null}
            </div>
          </section>
        )}

        <footer className="mt-6 flex flex-wrap items-center gap-3">
          {(data?.simulation ?? true) && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 text-[12px] text-[color:var(--ink-2)]">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              {ar ? "بيانات محاكاة مرجعية" : "Reference simulation"}
            </span>
          )}
          <span className="text-[12px] text-[color:var(--ink-3)]">
            {ar
              ? "الصفوف الحية تحل محل المحاكاة فور وصولها."
              : "Live rows replace simulation on arrival."}
          </span>
        </footer>
      </div>
    </main>
  );
}

export default NxFlowPage;
