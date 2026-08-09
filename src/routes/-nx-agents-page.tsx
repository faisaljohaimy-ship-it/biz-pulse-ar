/**
 * NxAgentsPage — the thirteen-agent fleet surface (constitution art. 23),
 * colocated as a non-route helper so the router code-splits it out.
 *
 * Backend wiring: state comes from getAgentFleetState (resilient — live
 * `agent_definitions` rows win for an admin session; the deterministic
 * reference simulation serves everyone else, «بيانات لا تفرغ»). When the
 * source is the simulation, a single client-side engine animates it live; a
 * LIVE source is shown as-is. The two badges are never mixed (art. 23).
 *
 * Four mandatory states: loading · empty · error · success (art. 14).
 */
import * as React from "react";
import { ArrowRight, Bot, FlaskConical, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { NxEmptyState, NxErrorState, NxPanel, NxSkeleton } from "@/components/nx";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { getAgentFleetState } from "@/lib/agents/fleet.functions";
import { feedSourcesFor } from "@/lib/agents/feed-sources";
import { AgenticFlowCanvas } from "@/components/home/AgenticFlowCanvas";
import {
  FLOW_STAGES,
  SimulationEngine,
  type AgentPhase,
  type FlowStage,
  type SimSnapshot,
} from "@/simulation/engine";

interface DisplayAgent {
  id: string;
  nameAr: string;
  category: string;
  phase: AgentPhase;
  taskAr: string;
}

const PHASE_AR: Record<AgentPhase, string> = {
  idle: "بانتظار مهمة",
  analyzing: "يحلّل",
  executing: "ينفّذ",
  reporting: "يوثّق النتيجة",
};

const PHASE_TONE: Record<AgentPhase, string> = {
  idle: "border-white/14 text-nx-pearl/64",
  analyzing: "border-nx-cyan/50 text-nx-cyan",
  executing: "border-nx-info/50 text-nx-info",
  reporting: "border-nx-success/50 text-nx-success",
};

const FLOW_AR: Record<FlowStage, string> = {
  request: "طلب",
  analysis: "تحليل",
  retrieval: "استرجاع",
  recommendation: "توصية",
  approval: "موافقة",
  execution: "تنفيذ",
  result: "نتيجة",
};

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("agent-fleet timeout")), ms));
}

export function NxAgentsPage() {
  const fetchFleet = useServerFn(getAgentFleetState);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["agent-fleet-state"],
    // Client cap EXCEEDS the server's 4s resilient window so a first paint
    // never lands in retry on a healthy-but-slow read (doctrine §4).
    queryFn: () => Promise.race([fetchFleet(), timeout(9000)]),
    retry: 1,
    refetchInterval: 60_000,
  });

  const navigate = useNavigate();

  // Live client animation ONLY when the source is the reference simulation —
  // a real (live) source is shown statically so the two are never conflated.
  const [live, setLive] = React.useState<SimSnapshot | null>(null);
  const isSimulation = data?.source === "simulation";
  React.useEffect(() => {
    if (!isSimulation || data == null) {
      setLive(null);
      return;
    }
    const engine = new SimulationEngine({ seed: data.seed, intervalMs: 1600 });
    const unsubscribe = engine.subscribe(setLive);
    engine.start();
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [isSimulation, data?.seed, data]);

  const agents: DisplayAgent[] = React.useMemo(() => {
    if (isSimulation && live) {
      return live.agents.map((a) => ({
        id: a.descriptor.id,
        nameAr: a.descriptor.nameAr,
        category: a.descriptor.category,
        phase: a.phase,
        taskAr: a.taskAr,
      }));
    }
    return (data?.agents ?? []).map((a) => ({
      id: a.id,
      nameAr: a.nameAr,
      category: a.category,
      phase: a.phase,
      taskAr: a.taskAr,
    }));
  }, [isSimulation, live, data]);

  const flowStage: FlowStage =
    (isSimulation && live ? live.flowStage : data?.flowStage) ?? "request";
  const events = isSimulation && live ? live.events : [];
  const activeCount = agents.filter((a) => a.phase !== "idle").length;
  const [selectedFlowAgent, setSelectedFlowAgent] = React.useState<string | null>(null);

  return (
    <div dir="rtl" className="min-h-dvh bg-nx-obsidian text-nx-pearl">
      {/* الخلفية الحية (قرار المالك ٢٠٢٦/٠٨/٠٥): الصفحة دائمة الدكنة،
          فالسطح يُثبَّت داكنًا للغطاء كي لا يبيضّ في الوضع الفاتح. */}
      <div
        style={{
          ["--surface" as string]: "#04070d",
          ["--live" as string]: "rgb(var(--live-rgb, 34 211 238))",
        }}
      >
        <HoloVideoEngine />
      </div>
      <main className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-5 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-xl font-black md:text-2xl">منظومة الوكلاء الثلاثة عشر</h1>
              <p className="mt-1 text-xs text-nx-pearl/64 md:text-sm">
                وكلاء متخصّصون بأسمائهم من السجل الرسمي — قراءة فقط (المادة ٢٣).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* مدخل مسرح العمليات — قرار المالك ٢٠٢٦/٠٨/٠٤: المسرح يُفتح من
                خلفية الوكلاء لا من الرئيسية. */}
            <Link
              to="/nx-ops"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 text-xs font-bold text-nx-pearl transition-colors hover:border-primary hover:bg-primary/20"
            >
              <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>مسرح العمليات الحيّ</span>
            </Link>
            {/* شارة المصدر — أيقونة القارورة تلازم المحاكاة كما في تذييل
                /nx-flow، والصفوف الحية تُبدّل الشارة كلها لا لونها فقط. */}
            {data ? (
              <span
                className={
                  data.is_simulation
                    ? "inline-flex items-center gap-1.5 rounded-full border border-nx-gold/50 px-3 py-1 text-[12px] font-semibold text-nx-gold"
                    : "inline-flex items-center gap-1.5 rounded-full border border-nx-success/50 px-3 py-1 text-[12px] font-semibold text-nx-success"
                }
              >
                {data.is_simulation ? (
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                )}
                {data.is_simulation ? "بيانات محاكاة مرجعية" : "حقيقي · قراءة"}
              </span>
            ) : null}
          </div>
        </header>

        {isLoading ? (
          <div
            aria-label="جارٍ تحميل منظومة الوكلاء"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <NxSkeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <NxErrorState
            title="تعذّر تحميل منظومة الوكلاء"
            description="أعد المحاولة — القاعدة أو الشبكة لم تستجب في الوقت."
            onRetry={() => refetch()}
          />
        ) : null}

        {!isLoading && !isError && agents.length === 0 ? (
          <NxEmptyState
            icon={<Bot aria-hidden className="size-8 text-nx-pearl/38" />}
            title="لا وكلاء بعد"
            description="ستظهر منظومة الوكلاء الثلاثة عشر هنا فور توفّرها."
          />
        ) : null}

        {/* لوحة التدفق الرئيسية: المصادر ← الوكلاء ← FINN ← بوابة الاعتماد البشري */}
        <section
          aria-label="لوحة تدفّق الوكلاء"
          className="rounded-nx-12 border border-[#3AE8FF]/18 bg-[#04101F]/70 p-2 md:p-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-black tracking-[0.18em] text-[#3AE8FF] md:text-base">
              SADEED · AGENTIC FLOW CANVAS
            </h2>
            <p className="text-[12px] text-nx-pearl/60">
              المصادر ← الوكلاء ← سَدِيد ← بوابة الاعتماد البشري
            </p>
          </div>
          {/* أرضية قراءة نصّ اللوحة: مقاسها الداخلي ١٢٦٠ وحدة، فلو انكمشت
              إلى عرض الجوال هبط نصّها إلى ~٣ بكسل. `nx-svg-readable`
              (styles.css) يمنع انكماشها تحت العرض الذي يُبقي النص ≥١١ بكسل،
              والفائض يُمرَّر أفقيًا داخل هذه الحاوية لا على الصفحة. */}
          <div className="nx-svg-readable w-full overflow-x-auto">
            <AgenticFlowCanvas
              ar
              variant="full"
              selectedAgentId={selectedFlowAgent}
              onSelectAgent={setSelectedFlowAgent}
            />
          </div>
        </section>

        {!isLoading && !isError && agents.length > 0 ? (
          <>
            {/* Seven-stage data flow — advances with each simulated event. */}
            <NxPanel title="تدفّق البيانات" density="operations">
              <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
                {FLOW_STAGES.map((stage, i) => {
                  const on = stage === flowStage;
                  return (
                    <li key={stage} className="flex items-center gap-1.5">
                      <span
                        className={
                          on
                            ? "rounded-nx-8 border border-nx-cyan/60 bg-nx-cyan/10 px-2 py-1 text-nx-cyan"
                            : "rounded-nx-8 border border-white/12 px-2 py-1 text-nx-pearl/64"
                        }
                      >
                        {FLOW_AR[stage]}
                      </span>
                      {i < FLOW_STAGES.length - 1 ? (
                        <span aria-hidden className="text-nx-pearl/32">
                          ←
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </NxPanel>

            <div className="flex items-center justify-between gap-3 text-xs text-nx-pearl/64">
              <span>
                <bdi dir="ltr">{agents.length}</bdi> وكيلًا · نشِط الآن{" "}
                <bdi dir="ltr">{activeCount}</bdi>
              </span>
              {isSimulation ? <span>محاكاة حتمية — بذرة ثابتة</span> : null}
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  data-agent={agent.id}
                  className="nx-glass-e1 rounded-nx-12 flex flex-col gap-2 border border-white/10 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-nx-pearl">{agent.nameAr}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[12px] ${PHASE_TONE[agent.phase]}`}
                    >
                      {PHASE_AR[agent.phase]}
                    </span>
                  </div>
                  <p className="text-xs text-nx-pearl/72">{agent.taskAr}</p>

                  {/* التغذية الراجعة — من أين يستمد هذا الوكيل بياناته */}
                  <div className="mt-1 flex flex-col gap-1 border-t border-white/8 pt-2">
                    <span className="text-[12px] font-semibold text-nx-pearl/56">
                      التغذية الراجعة · المصادر
                    </span>
                    <ul className="flex flex-wrap gap-1">
                      {feedSourcesFor(agent.id, agent.category).map((s) => (
                        <li
                          key={s.id}
                          className="rounded-full border border-nx-cyan/30 bg-nx-cyan/5 px-2 py-0.5 text-[12px] text-nx-cyan/85"
                        >
                          {s.labelAr}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <span className="text-[12px] uppercase tracking-wide text-nx-pearl/48" dir="ltr">
                    {agent.category}
                  </span>
                </li>
              ))}
            </ul>

            {isSimulation ? (
              <NxPanel title="سجل نشاط المحاكاة" density="operations">
                {events.length === 0 ? (
                  <p className="text-xs text-nx-pearl/56">يبدأ البثّ الحيّ بعد لحظة…</p>
                ) : (
                  <ul
                    role="log"
                    aria-label="نشاط الوكلاء المباشر"
                    className="flex flex-col gap-1.5"
                  >
                    {events.slice(0, 8).map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-xs">
                        <span
                          aria-hidden
                          className={
                            e.severity === "success"
                              ? "size-1.5 rounded-full bg-nx-success"
                              : e.severity === "warning"
                                ? "size-1.5 rounded-full bg-nx-warning"
                                : "size-1.5 rounded-full bg-nx-info"
                          }
                        />
                        <span className="text-nx-pearl/80">{e.messageAr}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </NxPanel>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
