/**
 * LessonSimulation — routes to the correct simulation for a lesson's kind.
 */
import type { SimulationKind, Bilingual } from "@/lib/learn/types";
import { MeetAriaSimulation } from "./simulations/MeetAriaSimulation";
import { DecisionScenarioSimulation } from "./simulations/DecisionScenarioSimulation";
import { DigitalTwinSimulation } from "./simulations/DigitalTwinSimulation";
import { KnowledgeGraphSimulation } from "./simulations/KnowledgeGraphSimulation";

interface Props {
  slug: string;
  lang: "ar" | "en";
  kind: SimulationKind | null;
  suggested: Bilingual[];
  onCompleted?: () => void;
}

export function LessonSimulation({ slug, lang, kind, suggested, onCompleted }: Props) {
  if (kind === "meet_aria") {
    return (
      <MeetAriaSimulation slug={slug} lang={lang} suggested={suggested} onCompleted={onCompleted} />
    );
  }
  if (kind === "decision_scenario") {
    return <DecisionScenarioSimulation slug={slug} lang={lang} onCompleted={onCompleted} />;
  }
  if (kind === "digital_twin") {
    return <DigitalTwinSimulation slug={slug} lang={lang} onCompleted={onCompleted} />;
  }
  if (kind === "knowledge_graph") {
    return <KnowledgeGraphSimulation slug={slug} lang={lang} onCompleted={onCompleted} />;
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
      {lang === "ar"
        ? "لا توجد محاكاة مسجلة لهذه الحصة."
        : "No simulation is registered for this lesson."}
    </div>
  );
}
