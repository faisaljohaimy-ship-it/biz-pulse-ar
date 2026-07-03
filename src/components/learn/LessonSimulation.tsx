/**
 * LessonSimulation — dispatches to the correct interactive simulation
 * for a lesson's `simulation_kind`. Additional simulations plug in here.
 */
import type { SimulationKind, Bilingual } from "@/lib/learn/types";
import { MeetAriaSimulation } from "./simulations/MeetAriaSimulation";

interface Props {
  slug: string;
  lang: "ar" | "en";
  kind: SimulationKind | null;
  suggested: Bilingual[];
  onCompleted?: () => void;
}

export function LessonSimulation({ slug, lang, kind, suggested, onCompleted }: Props) {
  if (kind === "meet_aria") {
    return <MeetAriaSimulation slug={slug} lang={lang} suggested={suggested} onCompleted={onCompleted} />;
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
      {lang === "ar"
        ? "لا توجد محاكاة مسجلة لهذه الحصة."
        : "No simulation is registered for this lesson."}
    </div>
  );
}
