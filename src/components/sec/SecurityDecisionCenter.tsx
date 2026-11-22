import { useReducer, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  DoorOpen,
  FileSearch,
  Fingerprint,
  FlaskConical,
  Languages,
  LockKeyhole,
  MapPin,
  Play,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NexusPill } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { screenName } from "@/lib/nav/screen-names";
import {
  buildUnauthorizedAccessDecisionDemo,
  createSecurityDecisionDemoState,
  securityDecisionDemoReducer,
} from "@/lib/sadeed/security-decision-demo";

const demo = buildUnauthorizedAccessDecisionDemo();

/** Entirely local rehearsal: deliberately has no server functions or operational tools. */
export function SecurityDecisionCenter() {
  const { locale, setLocale } = useI18n();
  const ar = locale === "ar";
  const text = (arabic: string, english: string) => (ar ? arabic : english);
  const [state, dispatch] = useReducer(
    securityDecisionDemoReducer,
    undefined,
    createSecurityDecisionDemoState,
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const stages = ["idle", "assessment", "recommendation", "awaiting_review"];
  const stageIndex = Math.max(0, stages.indexOf(state.stage));
  const finished = state.stage === "reviewed" || state.stage === "needs_verification";
  const current = finished ? 3 : stageIndex;
  const labels = [
    text("استقبال الحدث", "Event intake"),
    text("تقييم المخاطر", "Risk assessment"),
    text("بناء التوصية", "Recommendation"),
    text("المراجعة البشرية", "Human review"),
  ];
  const Forward = ar ? ArrowLeft : ArrowRight;
  const reset = () => {
    dispatch({ type: "reset" });
    setAcknowledged(false);
    setOpenEvidence(null);
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} lang={locale} className="space-y-5 pb-8 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-[color:var(--tone-emerald)]">
            <ShieldCheck className="size-4" aria-hidden />
            {text("سَدِيد / ذكاء القرار", "SADEED / DECISION INTELLIGENCE")}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {screenName("/sec/decision-center", ar)}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {text(
              "من إشارة غير مؤكدة إلى توصية واضحة يراجعها الإنسان. استكشف رحلة القرار الأمني خطوة بخطوة.",
              "From an unverified signal to a clear recommendation for human review. Explore the security decision process, step by step.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-[44px]! min-w-[44px]!"
            onClick={() => setLocale(ar ? "en" : "ar")}
            aria-label={text("Switch to English", "التبديل إلى العربية")}
          >
            <Languages aria-hidden />
            {ar ? "English" : "العربية"}
          </Button>
          <Button variant="outline" className="min-h-[44px]!" onClick={reset}>
            <RotateCcw aria-hidden />
            {text("إعادة الضبط", "Reset demo")}
          </Button>
        </div>
      </header>

      <div
        className="flex items-start gap-3 rounded-2xl border border-[color:var(--tone-amber)]/30 bg-[color:var(--tone-amber)]/10 p-4 text-sm"
        role="note"
      >
        <FlaskConical
          className="mt-0.5 size-5 shrink-0 text-[color:var(--tone-amber)]"
          aria-hidden
        />
        <div>
          <p className="font-bold text-[color:var(--tone-amber)]">
            {text(
              "محاكاة تجريبية · بيانات افتراضية بالكامل",
              "DEMONSTRATION · ALL DATA IS SYNTHETIC",
            )}
          </p>
          <p className="mt-1 leading-6 text-muted-foreground">
            {text(
              "التصنيف والتوصيات محددة مسبقًا. لا اتصال بحساسات أو كاميرات، ولا إرسال تنبيهات أو اعتماد أو تنفيذ إجراءات أمنية. سجل العرض مؤقت ويُمسح عند إعادة الضبط أو مغادرة الصفحة.",
              "Assessment and recommendations are predefined. No sensor or camera connections, alerts, operational approvals, or security actions. The demo log is temporary and clears on reset or leaving this page.",
            )}
          </p>
        </div>
      </div>

      <section className="nx-surface overflow-hidden" aria-labelledby="scenario-heading">
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <NexusPill tone="amber">{text("سيناريو افتراضي", "Synthetic scenario")}</NexusPill>
              <span className="min-w-0 break-all font-mono text-xs text-muted-foreground" dir="ltr">
                {demo.id}
              </span>
            </div>
            <h2 id="scenario-heading" className="text-xl font-bold leading-relaxed md:text-2xl">
              {ar ? demo.eventAr : demo.eventEn}
            </h2>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {ar ? demo.locationAr : demo.locationEn}
            </p>
            <div className="flex flex-wrap gap-6 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {text("مصدر الحدث", "Event source")}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {text("بلاغ افتراضي مدمج", "Built-in demo fixture")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {text("القرار التشغيلي", "Operational decision")}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <LockKeyhole className="size-4" aria-hidden />
                  {text("بانتظار اعتماد بشري", "Human approval required")}
                </p>
              </div>
            </div>
          </div>
          <div
            className="flex flex-col items-center justify-center gap-4 border-t border-border bg-[color:var(--chip)] p-6 lg:border-s lg:border-t-0"
            aria-label={text(
              "مخطط توضيحي افتراضي لنقطة الدخول",
              "Illustrative synthetic entry-point diagram",
            )}
          >
            <div className="flex w-full max-w-xs items-center justify-center gap-3" aria-hidden>
              <div className="rounded-2xl border border-border bg-background p-4">
                <Fingerprint className="size-8 text-muted-foreground" />
              </div>
              <div className="h-px flex-1 border-t border-dashed border-[color:var(--tone-amber)]" />
              <div className="relative rounded-2xl border border-[color:var(--tone-amber)]/40 bg-[color:var(--tone-amber)]/10 p-5">
                <DoorOpen className="size-10 text-[color:var(--tone-amber)]" />
                <ShieldAlert className="absolute -end-2 -top-2 size-6 text-[color:var(--tone-amber)]" />
              </div>
              <div className="h-px flex-1 border-t border-dashed border-border" />
              <div className="rounded-2xl border border-border bg-background p-4">
                <LockKeyhole className="size-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm font-semibold">
              {text(
                "نقطة دخول افتراضية · هوية غير متحققة",
                "Synthetic entry point · identity unverified",
              )}
            </p>
            <p className="text-center text-xs leading-6 text-muted-foreground">
              {text(
                "رسم توضيحي فقط؛ لا يمثل حالة موقع أو بوابة فعلية.",
                "Illustration only; does not represent a real facility or gate status.",
              )}
            </p>
          </div>
        </div>
      </section>

      <nav aria-label={text("مراحل القرار التجريبي", "Demo decision stages")}>
        <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {labels.map((label, index) => (
            <li
              key={label}
              aria-current={index === current ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl border p-3 ${index === current ? "border-[color:var(--tone-emerald)]/50 bg-[color:var(--tone-emerald)]/10" : "border-border bg-[color:var(--surface)]"}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index <= current ? "bg-[color:var(--tone-emerald)]/15 text-[color:var(--tone-emerald)]" : "bg-muted text-muted-foreground"}`}
              >
                {index < current || finished ? <Check className="size-4" aria-hidden /> : index + 1}
              </span>
              <span className="text-xs font-semibold sm:text-sm">{label}</span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Panel
            icon={<Sparkles className="size-5" />}
            title={text("مساحة القرار", "Decision workspace")}
            aside={
              <NexusPill tone={finished ? "emerald" : "slate"}>
                {finished ? text("اكتملت المحاكاة", "Demo complete") : labels[current]}
              </NexusPill>
            }
          >
            <div role="status" aria-live="polite" aria-atomic="true" className="space-y-4">
              {state.stage === "idle" && (
                <>
                  <h3 className="text-lg font-bold">
                    {text("ابدأ من الحدث، لا من الحكم", "Start with the event, then assess")}
                  </h3>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {text(
                      "حمّل البلاغ الافتراضي لاستعراض الأدلة، ثم انتقل إلى التقييم والتوصيات. يوضح هذا العرض مسارًا محددًا مسبقًا، ولا يحلل أحداثًا حقيقية.",
                      "Load the synthetic report to examine evidence, then move through assessment and recommendations. This demonstration follows a predefined flow and does not analyze real incidents.",
                    )}
                  </p>
                </>
              )}
              {state.stage === "assessment" && (
                <>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-5 text-[color:var(--tone-rose)]" aria-hidden />
                    <h3 className="text-lg font-bold">
                      {text("حرج · تصنيف تجريبي احترازي", "Critical · precautionary demo rating")}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {ar ? demo.severityReasonAr : demo.severityReasonEn}
                  </p>
                  <p className="rounded-xl border border-border bg-[color:var(--chip)] p-3 text-sm leading-7">
                    {text(
                      "هوية غير متحققة + موقع افتراضي حساس = أولوية للتحقق البشري. هذه قاعدة شرح للسيناريو، وليست احتمال خطر أو درجة ثقة مقيسة.",
                      "Unverified identity + a sensitive synthetic location = priority for human verification. This explains the scenario; it is not a measured risk probability or confidence score.",
                    )}
                  </p>
                </>
              )}
              {(state.stage === "recommendation" ||
                state.stage === "awaiting_review" ||
                finished) && (
                <>
                  <h3 className="text-lg font-bold">
                    {text(
                      "التوصية: تحقّق أولًا، ثم ارفع القرار",
                      "Recommendation: verify, then refer for decision",
                    )}
                  </h3>
                  <ol className="space-y-3">
                    {(ar ? demo.recommendedActionsAr : demo.recommendedActionsEn).map(
                      (action, index) => (
                        <li
                          key={index}
                          className="flex gap-3 rounded-xl border border-border p-3 text-sm leading-6"
                        >
                          <span className="font-mono text-[color:var(--tone-emerald)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span>{action}</span>
                        </li>
                      ),
                    )}
                  </ol>
                </>
              )}
            </div>

            {state.stage === "awaiting_review" && (
              <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--tone-amber)]/30 bg-[color:var(--tone-amber)]/5 p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="size-5 shrink-0" aria-hidden />
                  {text("مراجعة تجريبية فقط", "Simulated review only")}
                </p>
                <label className="flex min-h-[44px]! cursor-pointer items-start gap-3 text-sm leading-7">
                  <input
                    type="checkbox"
                    className="mt-1.5 size-5 shrink-0 accent-[var(--tone-emerald)]"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  {text(
                    "أفهم أن هذه بيانات افتراضية، وأن تسجيل المراجعة لا يمنح اعتمادًا تشغيليًا ولا ينفذ أي إجراء.",
                    "I understand this data is synthetic and recording a review grants no operational approval and performs no action.",
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-[44px]! h-auto whitespace-normal text-start"
                    disabled={!acknowledged}
                    onClick={() => dispatch({ type: "review", outcome: "reviewed" })}
                  >
                    <Check aria-hidden />
                    {text("تسجيل المراجعة · محاكاة", "Record review · simulation")}
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[44px]! h-auto whitespace-normal text-start"
                    disabled={!acknowledged}
                    onClick={() => dispatch({ type: "review", outcome: "needs_verification" })}
                  >
                    <FileSearch aria-hidden />
                    {text("طلب تحقق إضافي · محاكاة", "Request verification · simulation")}
                  </Button>
                </div>
              </div>
            )}

            {finished && (
              <div
                className="mt-5 rounded-xl border border-[color:var(--tone-emerald)]/30 bg-[color:var(--tone-emerald)]/10 p-4"
                role="status"
              >
                <p className="font-bold">
                  {state.stage === "reviewed"
                    ? text("سُجّلت المراجعة التجريبية", "Simulated review recorded")
                    : text("سُجّل طلب تحقق تجريبي", "Simulated verification request recorded")}
                </p>
                <p className="mt-2 text-sm leading-7">
                  {text(
                    "الاعتماد التشغيلي ما زال مطلوبًا. لم تُرسل أي رسالة ولم يُنفذ أي إجراء. يمكنك إعادة الضبط لتجربة المسار الآخر.",
                    "Operational approval is still required. No message was sent and no action was executed. Reset to explore the other outcome.",
                  )}
                </p>
              </div>
            )}

            {!finished && state.stage !== "awaiting_review" && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LockKeyhole className="size-4" aria-hidden />
                  {text("لا تنفيذ تلقائي", "No automatic execution")}
                </span>
                <Button
                  className="min-h-[44px]! h-auto whitespace-normal"
                  onClick={() => dispatch({ type: state.stage === "idle" ? "start" : "advance" })}
                >
                  {state.stage === "idle" && <Play aria-hidden />}
                  {state.stage === "idle"
                    ? text("ابدأ السيناريو", "Start scenario")
                    : state.stage === "assessment"
                      ? text("استعرض التوصيات", "View recommendations")
                      : text("انتقل للمراجعة البشرية", "Continue to human review")}
                  <Forward aria-hidden />
                </Button>
              </div>
            )}
          </Panel>

          <Panel
            icon={<FileSearch className="size-5" />}
            title={text("الأدلة والسياق", "Evidence & context")}
            aside={<NexusPill tone="amber">{text("غير متحققة", "Unverified")}</NexusPill>}
          >
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              {text(
                "إشارات افتراضية للشرح، لا أدلة مثبتة. افتح كل إشارة للاطلاع على حدودها.",
                "Synthetic signals for illustration, not verified evidence. Expand each signal to inspect its limitations.",
              )}
            </p>
            <div className="space-y-2">
              {demo.evidence.map((item) => (
                <div key={item.id} className="rounded-xl border border-border">
                  <button
                    type="button"
                    className="flex min-h-[48px]! w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setOpenEvidence(openEvidence === item.id ? null : item.id)}
                    aria-expanded={openEvidence === item.id}
                    aria-controls={`evidence-${item.id}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-[color:var(--tone-amber)]"
                        aria-hidden
                      />
                      {ar ? item.labelAr : item.labelEn}
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${openEvidence === item.id ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={`evidence-${item.id}`}
                    hidden={openEvidence !== item.id}
                    className="border-t border-border px-4 py-3 text-sm leading-7 text-muted-foreground"
                  >
                    {ar ? item.detailAr : item.detailEn}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="min-w-0 space-y-5">
          <Panel
            icon={<ScrollText className="size-5" />}
            title={text("سجل رحلة القرار", "Decision journey log")}
          >
            <p className="mb-4 text-xs leading-6 text-muted-foreground">
              {text(
                "سجل محلي للعرض فقط؛ ليس سجل تدقيق تشغيليًا محفوظًا.",
                "Local demonstration log; not a persisted operational audit trail.",
              )}
            </p>
            {state.auditTrail.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center">
                <ScrollText className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold">
                  {text("لم يبدأ السيناريو بعد", "The scenario has not started")}
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {text(
                    "ابدأ العرض لتظهر خطوات القرار هنا.",
                    "Start the demo to see the decision steps here.",
                  )}
                </p>
              </div>
            ) : (
              <ol className="space-y-4" aria-label={text("سجل المحاكاة", "Simulation log")}>
                {state.auditTrail.map((entry, index) => (
                  <li key={`${entry.step}-${index}`} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--tone-emerald)]/10 font-mono text-xs text-[color:var(--tone-emerald)]">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-7">
                      {ar ? entry.detailAr : entry.detailEn}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <div className="nx-surface space-y-3 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="size-5 text-[color:var(--tone-emerald)]" aria-hidden />
              {text("الإنسان صاحب القرار", "People own the decision")}
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              {text(
                "سَدِيد يرتّب السياق ويعرض التوصية. التحقق والاعتماد والتعامل الميداني مسؤولية أصحاب الصلاحية وفق إجراءات الجهة.",
                "SADEED organizes context and presents recommendations. Verification, approval, and field response remain with authorized people under their organization’s procedures.",
              )}
            </p>
            <p className="flex items-center gap-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
              <ArrowUpRight className="size-4 shrink-0" aria-hidden />
              {text(
                "الخطوة التالية: مراجعة الأدلة لدى صاحب الصلاحية",
                "Next: evidence review by the authorized decision-maker",
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  aside,
  children,
}: {
  title: string;
  icon: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="nx-surface min-w-0 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <span className="text-[color:var(--tone-emerald)]" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
