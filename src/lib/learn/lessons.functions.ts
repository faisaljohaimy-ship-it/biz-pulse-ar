/**
 * Executive Knowledge Bridge — server functions.
 * All calls run under `requireSupabaseAuth`.
 * Quiz correct answers are never exposed to the client — grading happens server-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  LessonCategory,
  LessonListItem,
  LessonDetail,
  LessonProgress,
  QuizQuestionPublic,
  QuizSubmissionResult,
  SimulationKind,
  Bilingual,
} from "./types";

// ---------- helpers ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

async function loadProgress(
  supabase: Sb,
  userId: string,
  lessonIds: string[],
): Promise<Record<string, LessonProgress>> {
  if (lessonIds.length === 0) return {};
  const { data, error } = await supabase
    .from("learn_lesson_progress")
    .select(
      "lesson_id,status,video_watched_seconds,simulation_completed,quiz_best_score,quiz_passed,completed_at",
    )
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);
  if (error) throw new Error(error.message);
  const out: Record<string, LessonProgress> = {};
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    out[row.lesson_id as string] = {
      status: (row.status as LessonProgress["status"]) ?? "not_started",
      video_watched_seconds: (row.video_watched_seconds as number) ?? 0,
      simulation_completed: !!row.simulation_completed,
      quiz_best_score: (row.quiz_best_score as number) ?? 0,
      quiz_passed: !!row.quiz_passed,
      completed_at: (row.completed_at as string | null) ?? null,
    };
  }
  return out;
}

// ---------- listLessons ----------

export const listLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LessonListItem[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("learn_lessons")
      .select(
        "id,slug,order_index,category,title_ar,title_en,subtitle_ar,subtitle_en,summary_ar,summary_en,cover_url,video_duration_seconds,published,simulation_kind,quiz_pass_score",
      )
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<Omit<LessonListItem, "progress">>;
    const progress = await loadProgress(
      supabase,
      userId,
      rows.map((r) => r.id),
    );
    return rows.map((r) => ({ ...r, progress: progress[r.id] ?? null }));
  });

// ---------- getLesson ----------

const GetLessonInput = z.object({ slug: z.string().min(1).max(120) });

export const getLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GetLessonInput.parse(data))
  .handler(async ({ data, context }): Promise<LessonDetail> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("learn_lessons")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lesson not found");

    // Load prev/next by order_index for a smooth curriculum flow.
    const { data: neighborsData } = await supabase
      .from("learn_lessons")
      .select("slug,order_index,published")
      .order("order_index", { ascending: true });
    const published = (neighborsData ?? []).filter((n) => n.published);
    const idx = published.findIndex((n) => n.slug === row.slug);
    const prev_slug = idx > 0 ? published[idx - 1].slug : null;
    const next_slug = idx >= 0 && idx < published.length - 1 ? published[idx + 1].slug : null;

    const progress =
      (await loadProgress(supabase, userId, [row.id as string]))[row.id as string] ?? null;

    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      slug: r.slug as string,
      order_index: r.order_index as number,
      category: (r.category as LessonCategory) ?? "core",
      title_ar: r.title_ar as string,
      title_en: r.title_en as string,
      subtitle_ar: r.subtitle_ar as string,
      subtitle_en: r.subtitle_en as string,
      summary_ar: r.summary_ar as string,
      summary_en: r.summary_en as string,
      narration_ar: (r.narration_ar as string) ?? "",
      narration_en: (r.narration_en as string) ?? "",
      objectives_ar: Array.isArray(r.objectives_ar) ? (r.objectives_ar as string[]) : [],
      objectives_en: Array.isArray(r.objectives_en) ? (r.objectives_en as string[]) : [],
      cover_url: (r.cover_url as string | null) ?? null,
      video_url: (r.video_url as string | null) ?? null,
      video_duration_seconds: (r.video_duration_seconds as number) ?? 0,
      simulation_kind: (r.simulation_kind as SimulationKind | null) ?? null,
      aria_suggested_prompts: Array.isArray(r.aria_suggested_prompts)
        ? (r.aria_suggested_prompts as Bilingual[])
        : [],
      quiz_pass_score: (r.quiz_pass_score as number) ?? 60,
      published: !!r.published,
      prev_slug,
      next_slug,
      progress,
    };
  });

// ---------- getQuiz (sanitized) ----------

export const getQuiz = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GetLessonInput.parse(data))
  .handler(async ({ data, context }): Promise<QuizQuestionPublic[]> => {
    const { supabase } = context;
    // Look up lesson via user-scoped client (RLS allows read).
    const { data: lesson, error: lErr } = await supabase
      .from("learn_lessons")
      .select("id,published")
      .eq("slug", data.slug)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lesson || !lesson.published) throw new Error("Lesson not available");

    // Questions live in a table with no client SELECT policy → read via admin.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qs, error } = await supabaseAdmin
      .from("learn_quiz_questions")
      .select("id,order_index,prompt_ar,prompt_en,options_ar,options_en")
      .eq("lesson_id", lesson.id)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (qs ?? []).map((q) => ({
      id: q.id as string,
      order_index: q.order_index as number,
      prompt_ar: q.prompt_ar as string,
      prompt_en: q.prompt_en as string,
      options_ar: (q.options_ar ?? []) as string[],
      options_en: (q.options_en ?? []) as string[],
    }));
  });

// ---------- submitQuiz (server-side grading) ----------

const SubmitInput = z.object({
  slug: z.string().min(1).max(120),
  answers: z
    .array(z.object({ id: z.string().uuid(), choice: z.number().int().min(0).max(9) }))
    .max(50),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitInput.parse(data))
  .handler(async ({ data, context }): Promise<QuizSubmissionResult> => {
    const { supabase, userId } = context;
    const { data: lesson, error: lErr } = await supabase
      .from("learn_lessons")
      .select("id,quiz_pass_score,published")
      .eq("slug", data.slug)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lesson || !lesson.published) throw new Error("Lesson not available");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: qs, error } = await supabaseAdmin
      .from("learn_quiz_questions")
      .select("id,correct_index,explanation_ar,explanation_en")
      .eq("lesson_id", lesson.id);
    if (error) throw new Error(error.message);

    const correctById = new Map(
      (qs ?? []).map((q) => [
        q.id as string,
        {
          correct_index: q.correct_index as number,
          ar: q.explanation_ar as string,
          en: q.explanation_en as string,
        },
      ]),
    );
    const total = correctById.size || 1;

    let correctCount = 0;
    const per_question: QuizSubmissionResult["per_question"] = [];
    for (const a of data.answers) {
      const key = correctById.get(a.id);
      if (!key) continue;
      const ok = a.choice === key.correct_index;
      if (ok) correctCount += 1;
      per_question.push({
        id: a.id,
        correct: ok,
        correct_index: key.correct_index,
        explanation_ar: key.ar,
        explanation_en: key.en,
      });
    }
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= (lesson.quiz_pass_score ?? 60);

    // Persist attempt (RLS ok — user_id = auth.uid()).
    await supabase.from("learn_quiz_attempts").insert({
      user_id: userId,
      lesson_id: lesson.id,
      answers: data.answers,
      score,
      passed,
    });

    // Upsert progress.
    const { data: existing } = await supabase
      .from("learn_lesson_progress")
      .select("quiz_best_score,quiz_passed,simulation_completed,video_watched_seconds")
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    const newBest = Math.max(existing?.quiz_best_score ?? 0, score);
    const newPassed = passed || !!existing?.quiz_passed;
    const nowIso = new Date().toISOString();
    const completed = newPassed;

    await supabase.from("learn_lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        status: completed ? "completed" : "in_progress",
        video_watched_seconds: existing?.video_watched_seconds ?? 0,
        simulation_completed: !!existing?.simulation_completed,
        quiz_best_score: newBest,
        quiz_passed: newPassed,
        last_seen_at: nowIso,
        completed_at: completed ? nowIso : null,
      },
      { onConflict: "user_id,lesson_id" },
    );

    return { score, passed, pass_score: lesson.quiz_pass_score ?? 60, per_question };
  });

// ---------- updateProgress (video watch / simulation completion) ----------

const UpdateProgressInput = z.object({
  slug: z.string().min(1).max(120),
  video_watched_seconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 6)
    .optional(),
  simulation_completed: z.boolean().optional(),
});

export const updateProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateProgressInput.parse(data))
  .handler(async ({ data, context }): Promise<LessonProgress> => {
    const { supabase, userId } = context;
    const { data: lesson, error: lErr } = await supabase
      .from("learn_lessons")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lesson) throw new Error("Lesson not found");

    const { data: existing } = await supabase
      .from("learn_lesson_progress")
      .select(
        "status,video_watched_seconds,simulation_completed,quiz_best_score,quiz_passed,completed_at",
      )
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    const nextVideo =
      data.video_watched_seconds !== undefined
        ? Math.max(existing?.video_watched_seconds ?? 0, data.video_watched_seconds)
        : (existing?.video_watched_seconds ?? 0);
    const nextSim =
      data.simulation_completed !== undefined
        ? data.simulation_completed || !!existing?.simulation_completed
        : !!existing?.simulation_completed;

    const passed = !!existing?.quiz_passed;
    const status: LessonProgress["status"] = passed
      ? "completed"
      : nextVideo > 0 || nextSim
        ? "in_progress"
        : "not_started";
    const nowIso = new Date().toISOString();
    const completed_at = passed ? (existing?.completed_at ?? nowIso) : null;

    await supabase.from("learn_lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        status,
        video_watched_seconds: nextVideo,
        simulation_completed: nextSim,
        quiz_best_score: existing?.quiz_best_score ?? 0,
        quiz_passed: passed,
        last_seen_at: nowIso,
        completed_at,
      },
      { onConflict: "user_id,lesson_id" },
    );

    return {
      status,
      video_watched_seconds: nextVideo,
      simulation_completed: nextSim,
      quiz_best_score: existing?.quiz_best_score ?? 0,
      quiz_passed: passed,
      completed_at,
    };
  });
