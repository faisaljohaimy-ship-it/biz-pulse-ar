// Operator action requests — validated, evidence-linked.
import type { OperatorAction } from "./types";
import { OperatorActionZ } from "./contracts";

export function submitOperatorAction(a: OperatorAction): OperatorAction {
  const parsed = OperatorActionZ.parse(a);
  return {
    ...parsed,
    parameters: parsed.parameters ?? {},
  };
}
