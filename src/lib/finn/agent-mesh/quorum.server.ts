// Quorum evaluator.
export interface QuorumEvaluation {
  readonly required: number;
  readonly present: number;
  readonly met: boolean;
  readonly majority: number;
}

export function evaluateQuorum(input: {
  totalNodes: number;
  presentNodes: number;
  quorum?: number;
}): QuorumEvaluation {
  if (input.totalNodes < 0 || input.presentNodes < 0) {
    throw new Error("node counts must be non-negative");
  }
  const majority = Math.floor(input.totalNodes / 2) + 1;
  const required = Math.max(1, input.quorum ?? majority);
  return {
    required,
    present: input.presentNodes,
    met: input.presentNodes >= required,
    majority,
  };
}
