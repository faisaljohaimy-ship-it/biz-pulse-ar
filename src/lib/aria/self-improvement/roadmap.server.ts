// Roadmap builder — deterministic from approved proposals.
import type {
  ImprovementProposal,
  Recommendation,
  Roadmap,
  RoadmapEntry,
} from "./types";
import { RoadmapInputZ } from "./contracts";

export function buildRoadmap(input: {
  approvedProposals: ReadonlyArray<ImprovementProposal>;
  recommendations: ReadonlyArray<Recommendation>;
  quarterAssign: (proposal: ImprovementProposal, rank: number) => string;
  generatedAt: string;
}): Roadmap {
  const sorted = [...input.approvedProposals].sort(
    (a, b) =>
      b.score.composite - a.score.composite || a.id.localeCompare(b.id),
  );
  const entries: RoadmapEntry[] = sorted.map((p, i) => {
    const rec = input.recommendations.find((r) => r.proposalId === p.id) ?? null;
    return {
      rank: i + 1,
      proposalId: p.id,
      recommendationId: rec?.id ?? null,
      targetQuarter: input.quarterAssign(p, i + 1),
      composite: p.score.composite,
      confidence: p.score.confidence,
    };
  });
  return RoadmapInputZ.parse({ generatedAt: input.generatedAt, entries });
}
