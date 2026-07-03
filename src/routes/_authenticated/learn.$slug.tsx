/**
 * Executive lesson page — cinematic video, narration, ARIA dialogue,
 * live simulation, executive summary, learning objectives, quiz, and nav.
 * Fully responsive, RTL/LTR safe, and progress-aware.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, GraduationCap, Sparkles, Target, MessageSquare, Award, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getLesson } from "@/lib/learn/lessons.functions";
import { LessonVideo } from "@/components/learn/LessonVideo";
import { LessonCinematicHero } from "@/components/learn/LessonCinematicHero";
import { LessonNarration } from "@/components/learn/LessonNarration";
import { LessonSimulation } from "@/components/learn/LessonSimulation";
import { LessonARIAChat } from "@/components/learn/LessonARIAChat";
import { LessonQuiz } from "@/components/learn/LessonQuiz";
import { LessonNav } from "@/components/learn/LessonNav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn/$slug")({
  component: LessonPage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="space-y-3">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <div className="text-lg font-semibold text-white">Lesson unavailable</div>
        <div className="max-w-md text-sm text-white/60">{error.message}</div>
        <button onClick={reset} className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center text-white/70">Lesson not found.</div>
  ),
});

function LessonPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getLesson);

  const q = useQuery({
    queryKey: ["learn-lesson", slug],
    queryFn: async () => {
      const r = await load({ data: { slug } });
      return r;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["learn-lesson", slug] });
    qc.invalidateQueries({ queryKey: ["learn-list"] });
  };

  const lesson = q.data;
  const title = lesson ? (ar ? lesson.title_ar : lesson.title_en) : "";
  const subtitle = lesson ? (ar ? lesson.subtitle_ar : lesson.subtitle_en) : "";
  const summary = lesson ? (ar ? lesson.summary_ar : lesson.summary_en) : "";
  const narration = lesson ? (ar ? lesson.narration_ar : lesson.narration_en) : "";
  const objectives = useMemo(
    () => (lesson ? (ar ? lesson.objectives_ar : lesson.objectives_en) : []),
    [lesson, ar],
  );

  if (q.isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] space-y-6 rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D] p-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="aspect-video animate-pulse rounded-3xl bg-white/[0.03]" />
        <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }
  if (!lesson) throw notFound();
  if (!lesson.published) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D] p-8 text-center">
        <div className="max-w-md space-y-3 text-white/70">
          <GraduationCap className="mx-auto h-10 w-10 text-cyan-300" />
          <div className="text-lg font-semibold text-white">{title}</div>
          <p className="text-sm">{ar ? "هذه الحصة قيد الإنتاج. سيتم إتاحتها فور اكتمالها بالجودة التنفيذية المطلوبة." : "This lesson is in production. It will unlock once completed to executive quality."}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative -mt-2 min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
      </div>

      {/* Header */}
      <header className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 pt-6 pb-4 sm:flex sm:flex-wrap sm:justify-between sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/30">
            <GraduationCap className="h-6 w-6 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">
              NEXIOS · {ar ? "جسر المعرفة التنفيذي" : "Executive Knowledge Bridge"} · {String(lesson.order_index).padStart(2, "0")}
            </div>
            <h1 className="truncate text-2xl font-light text-white sm:text-3xl">{title}</h1>
            <div className="truncate text-sm text-cyan-100/80">{subtitle}</div>
          </div>
        </div>
        <ProgressPill lesson={lesson} ar={ar} />
      </header>

      <div className="relative grid grid-cols-1 gap-6 px-5 pb-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        {/* Main column */}
        <main className="min-w-0 space-y-6">
          {/* Video */}
          {lesson.video_url ? (
            <LessonVideo
              slug={lesson.slug}
              src={lesson.video_url}
              lang={ar ? "ar" : "en"}
              initialSeconds={lesson.progress?.video_watched_seconds ?? 0}
              poster={lesson.cover_url}
            />
          ) : (
            <LessonCinematicHero
              title={title}
              subtitle={subtitle}
              order={lesson.order_index}
              lang={ar ? "ar" : "en"}
            />
          )}

          {/* Summary + narration */}
          <SectionCard icon={<Sparkles className="h-4 w-4" />} label={ar ? "الملخص التنفيذي" : "Executive Summary"}>
            <p className="text-base leading-relaxed text-white/85">{summary}</p>
            {narration && <LessonNarration text={narration} lang={ar ? "ar" : "en"} />}
          </SectionCard>

          {/* Objectives */}
          {objectives.length > 0 && (
            <SectionCard icon={<Target className="h-4 w-4" />} label={ar ? "أهداف التعلّم" : "Learning objectives"}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/85">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-400/30">
                      {i + 1}
                    </span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Simulation */}
          <SectionCard icon={<Play className="h-4 w-4" />} label={ar ? "المحاكاة التنفيذية" : "Executive Simulation"}>
            <LessonSimulation
              slug={lesson.slug}
              lang={ar ? "ar" : "en"}
              kind={lesson.simulation_kind}
              suggested={lesson.aria_suggested_prompts}
              onCompleted={invalidate}
            />
          </SectionCard>

          {/* Quiz */}
          <SectionCard icon={<Award className="h-4 w-4" />} label={ar ? "اختبار المعرفة" : "Knowledge test"}>
            <LessonQuiz
              slug={lesson.slug}
              lang={ar ? "ar" : "en"}
              passScore={lesson.quiz_pass_score}
              onPassed={invalidate}
            />
          </SectionCard>

          <LessonNav lang={ar ? "ar" : "en"} prev_slug={lesson.prev_slug} next_slug={lesson.next_slug} />
        </main>

        {/* ARIA sidecar (desktop) */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <div className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400/15 ring-1 ring-cyan-400/40">
                <MessageSquare className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">ARIA</div>
                <div className="text-[11px] text-white/60">
                  {ar ? "معلّمتك التنفيذية لهذه الحصة" : "Your executive instructor for this lesson"}
                </div>
              </div>
            </div>
            <LessonARIAChat slug={lesson.slug} lang={ar ? "ar" : "en"} suggested={lesson.aria_suggested_prompts} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

function ProgressPill({
  lesson,
  ar,
}: {
  lesson: { progress: { status: string; quiz_best_score: number } | null; quiz_pass_score: number };
  ar: boolean;
}) {
  const status = lesson.progress?.status ?? "not_started";
  const label =
    status === "completed"
      ? (ar ? "مكتملة" : "Completed")
      : status === "in_progress"
      ? (ar ? "قيد التقدّم" : "In progress")
      : (ar ? "لم تبدأ" : "Not started");
  const tone =
    status === "completed"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : status === "in_progress"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : "border-white/15 bg-white/[0.03] text-white/60";
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em]", tone)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {label}
      {lesson.progress?.quiz_best_score ? (
        <span className="text-white/70">· {lesson.progress.quiz_best_score}%</span>
      ) : null}
    </div>
  );
}
