// Improvement proposal factory — evidence-linked, score-bound.
import type {
  Gap,
  ImprovementProposal,
  ImprovementScore,
} from "./types";
import { ProposalInputZ } from "./contracts";

export function buildProposal(input: {
  id: string;
  title: string;
  subject: string;
  gaps: ReadonlyArray<Gap>;
  hypothesis: string;
  score: ImprovementScore;
  proposedAt: string;
}): ImprovementProposal {
  const evidence = input.gaps.flatMap((g) => g.evidence);
  if (evidence.length === 0) {
    throw new Error("proposal requires evidence-linked gaps");
  }
  const base = ProposalInputZ.parse({
    id: input.id,
    title: input.title,
    subject: input.subject,
    gapIds: input.gaps.map((g) => g.id),
    hypothesis: input.hypothesis,
    proposedAt: input.proposedAt,
    evidence,
  });
  return {
    id: base.id,
    title: base.title,
    subject: base.subject,
    gapIds: base.gapIds,
    hypothesis: base.hypothesis,
    score: input.score,
    status: "proposed",
    proposedAt: base.proposedAt,
    evidence: base.evidence,
  };
}
