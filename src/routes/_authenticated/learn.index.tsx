/**
 * Executive Knowledge Bridge — catalog page.
 * Lists every lesson. Published lessons link to the lesson page.
 * Roadmap lessons render locked cards so the executive sees the full journey.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Sparkles, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { listLessons } from "@/lib/learn/lessons.functions";
import { LessonCard } from "@/components/learn/LessonCard";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({
    meta: [
      { title: "Executive Knowledge Bridge — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "The executive learning surface of NEXIOS. Cinematic lessons, live simulations, ARIA as your instructor.",
      },
    ],
  }),
  component: CatalogPage,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="space-y-3">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <div className="text-lg font-semibold text-white">
          Executive Knowledge Bridge unavailable
        </div>
        <div className="max-w-md text-sm text-white/60">{error.message}</div>
        <button
          onClick={reset}
          className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
        >
          Retry
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function CatalogPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const list = useServerFn(listLessons);
  const q = useQuery({
    queryKey: ["learn-list"],
    queryFn: () => list(),
    refetchOnWindowFocus: false,
  });

  const lessons = q.data ?? [];
  const total = lessons.length;
  const done = lessons.filter((l) => l.progress?.status === "completed").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="relative -mt-2 min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-gradient-to-br from-[#04111F] via-[#061A2E] to-[#03101D]"
      dir={ar ? "rtl" : "ltr"}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />
      </div>

      <header className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 pt-8 pb-6 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/30">
            <GraduationCap className="h-6 w-6 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              NEXIOS · {ar ? "جسر المعرفة التنفيذي" : "Executive Knowledge Bridge"}
            </div>
            <h1 className="truncate text-2xl font-light text-white sm:text-3xl">
              {ar ? "مسار تعلّم القيادة" : "The executive learning journey"}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-white/[0.03] px-4 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/50">
            {ar ? "تقدّمي" : "My progress"}
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-cyan-300 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums text-white">
              {done}/{total}
            </span>
          </div>
        </div>
      </header>

      <div className="relative px-6 pb-4">
        <div className="flex items-center gap-2 text-sm text-cyan-100/80">
          <Sparkles className="h-4 w-4" />
          {ar
            ? "كل حصة تتضمّن فيديو تنفيذياً، سرداً صوتياً، محاكاة مباشرة، محادثة مع آريا، واختباراً."
            : "Every lesson includes an executive film, voice narration, a live simulation, an ARIA dialogue, and a quiz."}
        </div>
      </div>

      <section className="relative grid grid-cols-1 gap-5 px-6 pb-10 md:grid-cols-2 xl:grid-cols-3">
        {q.isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[240px] animate-pulse rounded-3xl border border-white/5 bg-white/[0.02]"
            />
          ))}
        {!q.isLoading &&
          lessons.map((l) => <LessonCard key={l.id} lesson={l} lang={ar ? "ar" : "en"} />)}
      </section>
    </div>
  );
}
