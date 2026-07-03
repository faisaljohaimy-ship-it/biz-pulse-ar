/**
 * Executive Knowledge Bridge — shared types.
 * Server sends sanitized DTOs to the client. Quiz correct answers never leave the server.
 */

export type LessonCategory = "core" | "operations" | "intelligence";
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type SimulationKind = "meet_aria"; // extended per lesson

export interface Bilingual {
  ar: string;
  en: string;
}

export interface LessonListItem {
  id: string;
  slug: string;
  order_index: number;
  category: LessonCategory;
  title_ar: string;
  title_en: string;
  subtitle_ar: string;
  subtitle_en: string;
  summary_ar: string;
  summary_en: string;
  cover_url: string | null;
  video_duration_seconds: number;
  published: boolean;
  simulation_kind: SimulationKind | null;
  quiz_pass_score: number;
  progress: LessonProgress | null;
}

export interface LessonDetail extends LessonListItem {
  narration_ar: string;
  narration_en: string;
  objectives_ar: string[];
  objectives_en: string[];
  video_url: string | null;
  aria_suggested_prompts: Bilingual[];
  prev_slug: string | null;
  next_slug: string | null;
}

export interface LessonProgress {
  status: LessonStatus;
  video_watched_seconds: number;
  simulation_completed: boolean;
  quiz_best_score: number;
  quiz_passed: boolean;
  completed_at: string | null;
}

export interface QuizQuestionPublic {
  id: string;
  order_index: number;
  prompt_ar: string;
  prompt_en: string;
  options_ar: string[];
  options_en: string[];
}

export interface QuizSubmissionResult {
  score: number;               // 0..100
  passed: boolean;
  pass_score: number;
  per_question: Array<{
    id: string;
    correct: boolean;
    correct_index: number;
    explanation_ar: string;
    explanation_en: string;
  }>;
}
